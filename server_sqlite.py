from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from http import cookies
from pathlib import Path
import hashlib
import hmac
import json
import mimetypes
import os
import secrets
import sqlite3
import sys
import uuid


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "services.db"
PORT = int(os.environ.get("PORT", "3000"))


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    DATA_DIR.mkdir(exist_ok=True)
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              email TEXT NOT NULL UNIQUE,
              password_hash TEXT NOT NULL,
              is_admin INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sessions (
              token TEXT PRIMARY KEY,
              user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS tenant_data (
              user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              bucket TEXT NOT NULL,
              data TEXT NOT NULL,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (user_id, bucket)
            );
            """
        )
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(users)").fetchall()}
        if "is_admin" not in columns:
            conn.execute("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0")
        admin_count = conn.execute("SELECT COUNT(*) AS total FROM users WHERE is_admin = 1").fetchone()["total"]
        user_count = conn.execute("SELECT COUNT(*) AS total FROM users").fetchone()["total"]
        if user_count and not admin_count:
            conn.execute(
                """
                UPDATE users
                SET is_admin = 1
                WHERE id = (
                  SELECT id FROM users ORDER BY created_at ASC LIMIT 1
                )
                """
            )


def default_settings():
    return {
        "transportCost": 0,
        "margins": [],
        "frequentWorks": [],
        "serviceFilters": {"all": True, "statuses": []},
    }


def default_state():
    return {
        "clients": [],
        "equipment": [],
        "products": [],
        "services": [],
        "settings": default_settings(),
    }


def hash_password(password):
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000)
    return f"{salt}:{digest.hex()}"


def verify_password(password, stored):
    try:
        salt, expected = stored.split(":", 1)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000).hex()
        return hmac.compare_digest(digest, expected)
    except ValueError:
        return False


def public_user(row):
    if not row:
        return None
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "isAdmin": bool(row["is_admin"]),
    }


def read_tenant_state(user_id):
    state = default_state()
    with connect() as conn:
        rows = conn.execute(
            "SELECT bucket, data FROM tenant_data WHERE user_id = ?",
            (user_id,),
        ).fetchall()
    for row in rows:
        try:
            state[row["bucket"]] = json.loads(row["data"])
        except json.JSONDecodeError:
            pass
    return state


def write_bucket(user_id, bucket, value):
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO tenant_data (user_id, bucket, data, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, bucket)
            DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
            """,
            (user_id, bucket, json.dumps(value, ensure_ascii=False)),
        )


class ServicesHandler(BaseHTTPRequestHandler):
    server_version = "ServicesSQLite/1.0"

    def do_GET(self):
        if self.path.startswith("/api/"):
            self.handle_api()
        else:
            self.serve_static()

    def do_POST(self):
        self.handle_api()

    def do_PUT(self):
        self.handle_api()

    def handle_api(self):
        try:
            path = self.path.split("?", 1)[0]

            if self.command == "GET" and path == "/api/me":
                user = self.current_user()
                admin = self.admin_user()
                self.send_json(200, {
                    "authenticated": bool(user),
                    "user": public_user(user),
                    "admin": public_user(admin),
                    "impersonating": bool(user and admin and user["id"] != admin["id"]),
                })
                return

            if self.command == "POST" and path == "/api/register":
                self.register()
                return

            if self.command == "POST" and path == "/api/login":
                self.login()
                return

            if self.command == "POST" and path == "/api/logout":
                self.logout()
                return

            if self.command == "GET" and path == "/api/admin/users":
                self.admin_users()
                return

            if self.command == "POST" and path == "/api/admin/impersonate":
                self.admin_impersonate()
                return

            if self.command == "POST" and path == "/api/admin/stop-impersonation":
                self.stop_impersonation()
                return

            if self.command == "POST" and path == "/api/admin/delete-user":
                self.admin_delete_user()
                return

            user = self.current_user()
            if not user:
                self.send_json(401, {"error": "Debe iniciar sesion."})
                return

            if self.command == "GET" and path == "/api/state":
                self.send_json(200, read_tenant_state(user["id"]))
                return

            if self.command == "PUT" and path.startswith("/api/state/"):
                bucket = path.rsplit("/", 1)[-1]
                if bucket not in {"clients", "equipment", "products", "services", "settings"}:
                    self.send_json(404, {"error": "Dato no valido."})
                    return
                write_bucket(user["id"], bucket, self.read_json())
                self.send_json(200, {"ok": True})
                return

            self.send_json(404, {"error": "Ruta no encontrada."})
        except PublicError as error:
            self.send_json(400, {"error": str(error)})
        except Exception as error:
            print(error, file=sys.stderr)
            self.send_json(500, {"error": "Error interno del servidor."})

    def register(self):
        body = self.read_json()
        name = str(body.get("name", "")).strip()
        email = str(body.get("email", "")).strip().lower()
        password = str(body.get("password", ""))
        if not name or not email or len(password) < 6:
            raise PublicError("Complete nombre, email y clave de al menos 6 caracteres.")

        user_id = str(uuid.uuid4())
        with connect() as conn:
            existing_users = conn.execute("SELECT COUNT(*) AS total FROM users").fetchone()["total"]
            try:
                conn.execute(
                    "INSERT INTO users (id, name, email, password_hash, is_admin) VALUES (?, ?, ?, ?, ?)",
                    (user_id, name, email, hash_password(password), 1 if existing_users == 0 else 0),
                )
            except sqlite3.IntegrityError:
                raise PublicError("Ya existe un usuario con ese email.")

            for bucket, value in default_state().items():
                conn.execute(
                    "INSERT INTO tenant_data (user_id, bucket, data) VALUES (?, ?, ?)",
                    (user_id, bucket, json.dumps(value, ensure_ascii=False)),
                )

        token = self.create_session(user_id)
        self.send_json(
            201,
            {"user": {"id": user_id, "name": name, "email": email, "isAdmin": existing_users == 0}},
            {"Set-Cookie": self.cookie_header("services_session", token)},
        )

    def login(self):
        body = self.read_json()
        email = str(body.get("email", "")).strip().lower()
        password = str(body.get("password", ""))
        with connect() as conn:
            user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if not user or not verify_password(password, user["password_hash"]):
            raise PublicError("Email o clave incorrectos.")

        token = self.create_session(user["id"])
        self.send_json(200, {"user": public_user(user)}, {"Set-Cookie": self.cookie_header("services_session", token)})

    def logout(self):
        token = self.session_token("services_session")
        admin_token = self.session_token("services_admin_session")
        with connect() as conn:
            if token:
                conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
            if admin_token:
                conn.execute("DELETE FROM sessions WHERE token = ?", (admin_token,))
        self.send_json(
            200,
            {"ok": True},
            {
                "Set-Cookie": [
                    "services_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
                    "services_admin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
                ]
            },
        )

    def admin_users(self):
        admin = self.admin_user()
        if not admin:
            self.send_json(403, {"error": "No tiene permisos de administrador."})
            return

        with connect() as conn:
            rows = conn.execute(
                """
                SELECT id, name, email, is_admin, created_at
                FROM users
                ORDER BY created_at DESC
                """
            ).fetchall()

        users = []
        for row in rows:
            state = read_tenant_state(row["id"])
            users.append({
                "id": row["id"],
                "name": row["name"],
                "email": row["email"],
                "isAdmin": bool(row["is_admin"]),
                "createdAt": row["created_at"],
                "counts": {
                    "clients": len(state.get("clients", [])),
                    "equipment": len(state.get("equipment", [])),
                    "products": len(state.get("products", [])),
                    "services": len(state.get("services", [])),
                },
            })
        self.send_json(200, {"users": users, "admin": public_user(admin)})

    def admin_impersonate(self):
        admin = self.admin_user()
        if not admin:
            self.send_json(403, {"error": "No tiene permisos de administrador."})
            return

        body = self.read_json()
        target_id = str(body.get("userId", "")).strip()
        with connect() as conn:
            target = conn.execute("SELECT * FROM users WHERE id = ?", (target_id,)).fetchone()
        if not target:
            raise PublicError("Usuario no encontrado.")

        current_admin_token = self.session_token("services_admin_session") or self.session_token("services_session")
        target_token = self.create_session(target["id"])
        self.send_json(
            200,
            {"ok": True, "user": public_user(target), "admin": public_user(admin)},
            {
                "Set-Cookie": [
                    self.cookie_header("services_admin_session", current_admin_token),
                    self.cookie_header("services_session", target_token),
                ]
            },
        )

    def stop_impersonation(self):
        admin = self.admin_user()
        admin_token = self.session_token("services_admin_session")
        if not admin or not admin_token:
            self.send_json(403, {"error": "No hay una sesion de soporte activa."})
            return

        current_token = self.session_token("services_session")
        if current_token and current_token != admin_token:
            with connect() as conn:
                conn.execute("DELETE FROM sessions WHERE token = ?", (current_token,))
        self.send_json(
            200,
            {"ok": True},
            {
                "Set-Cookie": [
                    self.cookie_header("services_session", admin_token),
                    "services_admin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
                ]
            },
        )

    def admin_delete_user(self):
        admin = self.admin_user()
        if not admin:
            self.send_json(403, {"error": "No tiene permisos de administrador."})
            return

        body = self.read_json()
        target_id = str(body.get("userId", "")).strip()
        if not target_id:
            raise PublicError("Usuario no valido.")
        if target_id == admin["id"]:
            raise PublicError("No puede eliminar su propia cuenta administradora desde este panel.")

        with connect() as conn:
            target = conn.execute("SELECT * FROM users WHERE id = ?", (target_id,)).fetchone()
            if not target:
                raise PublicError("Usuario no encontrado.")
            conn.execute("DELETE FROM users WHERE id = ?", (target_id,))

        self.send_json(200, {"ok": True, "deletedUser": public_user(target)})

    def current_user(self):
        token = self.session_token("services_session")
        return self.user_from_session(token)

    def admin_user(self):
        admin_token = self.session_token("services_admin_session")
        user = self.user_from_session(admin_token)
        if user and user["is_admin"]:
            return user
        user = self.user_from_session(self.session_token("services_session"))
        if user and user["is_admin"]:
            return user
        return None

    def user_from_session(self, token):
        if not token:
            return None
        with connect() as conn:
            return conn.execute(
                """
                SELECT users.*
                FROM sessions
                JOIN users ON users.id = sessions.user_id
                WHERE sessions.token = ?
                """,
                (token,),
            ).fetchone()

    def create_session(self, user_id):
        token = secrets.token_hex(32)
        with connect() as conn:
            conn.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
        return token

    def session_token(self, name):
        raw = self.headers.get("Cookie", "")
        jar = cookies.SimpleCookie()
        jar.load(raw)
        morsel = jar.get(name)
        return morsel.value if morsel else ""

    def cookie_header(self, name, token):
        return f"{name}={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000"

    def serve_static(self):
        path = self.path.split("?", 1)[0]
        if path == "/":
            path = "/login.html"
        elif path == "/app":
            path = "/index.html" if self.current_user() else "/login.html"
        elif path == "/admin":
            path = "/admin.html" if self.admin_user() else "/login.html"
        elif path == "/index.html" and not self.current_user():
            path = "/login.html"
        elif path == "/admin.html" and not self.admin_user():
            path = "/login.html"
        file_path = (ROOT / path.lstrip("/")).resolve()
        if ROOT not in file_path.parents and file_path != ROOT:
            self.send_error(403)
            return
        if not file_path.exists() or not file_path.is_file():
            self.send_error(404)
            return
        mime = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.end_headers()
        self.wfile.write(file_path.read_bytes())

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            raise PublicError("JSON invalido.")

    def send_json(self, status, data, extra_headers=None):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        for key, value in (extra_headers or {}).items():
            if isinstance(value, list):
                for item in value:
                    self.send_header(key, item)
            else:
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        return


class PublicError(Exception):
    pass


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), ServicesHandler)
    print(f"Sistema de Services con SQLite listo en http://localhost:{PORT}")
    server.serve_forever()
