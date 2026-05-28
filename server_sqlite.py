from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from http import cookies
from pathlib import Path
from urllib.parse import parse_qs, urlparse
import hashlib
import hmac
import json
import mimetypes
import os
import secrets
import sqlite3
import sys
import time
import uuid


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "services.db"
PORT = int(os.environ.get("PORT", "3000"))
PASSWORD_ITERATIONS = 310_000
LOGIN_MAX_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 10 * 60
LOGIN_LOCK_SECONDS = 10 * 60
LOGIN_ATTEMPTS = {}
BOOTSTRAP_FIRST_ADMIN = os.environ.get("BOOTSTRAP_FIRST_ADMIN", "").strip().lower() in {"1", "true", "yes"}
CSRF_EXEMPT = {
    ("POST", "/api/login"),
    ("POST", "/api/register"),
}
ITEM_BUCKETS = {"clients", "equipment", "products", "services"}


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
              approved INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sessions (
              token TEXT PRIMARY KEY,
              user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              csrf_token TEXT,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS tenant_data (
              user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              bucket TEXT NOT NULL,
              data TEXT NOT NULL,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (user_id, bucket)
            );

            CREATE TABLE IF NOT EXISTS tenant_items (
              user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              bucket TEXT NOT NULL,
              item_id INTEGER NOT NULL,
              data TEXT NOT NULL,
              search_text TEXT NOT NULL DEFAULT '',
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (user_id, bucket, item_id)
            );

            CREATE INDEX IF NOT EXISTS idx_tenant_items_bucket_search
            ON tenant_items (user_id, bucket, search_text);

            CREATE TABLE IF NOT EXISTS undo_actions (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              label TEXT NOT NULL,
              payload TEXT NOT NULL,
              undone INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(users)").fetchall()}
        if "is_admin" not in columns:
            conn.execute("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0")
        if "approved" not in columns:
            conn.execute("ALTER TABLE users ADD COLUMN approved INTEGER NOT NULL DEFAULT 0")
        session_columns = {row["name"] for row in conn.execute("PRAGMA table_info(sessions)").fetchall()}
        if "csrf_token" not in session_columns:
            conn.execute("ALTER TABLE sessions ADD COLUMN csrf_token TEXT")
        conn.execute("UPDATE users SET approved = 1 WHERE is_admin = 1")
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
        migrate_tenant_items(conn)


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


def item_search_text(value):
    parts = []

    def collect(item):
        if item is None:
            return
        if isinstance(item, dict):
            for child in item.values():
                collect(child)
            return
        if isinstance(item, list):
            for child in item:
                collect(child)
            return
        parts.append(str(item))

    collect(value)
    return " ".join(parts).lower()


def item_id(value):
    try:
        return int(value.get("id"))
    except (AttributeError, TypeError, ValueError):
        return 0


def sync_bucket_items(conn, user_id, bucket, value):
    if bucket not in ITEM_BUCKETS or not isinstance(value, list):
        return
    conn.execute("DELETE FROM tenant_items WHERE user_id = ? AND bucket = ?", (user_id, bucket))
    rows = []
    for index, item in enumerate(value, start=1):
        if not isinstance(item, dict):
            continue
        row_id = item_id(item) or index
        rows.append((
            user_id,
            bucket,
            row_id,
            json.dumps(item, ensure_ascii=False),
            item_search_text(item),
        ))
    conn.executemany(
        """
        INSERT OR REPLACE INTO tenant_items (user_id, bucket, item_id, data, search_text, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """,
        rows,
    )


def migrate_tenant_items(conn):
    rows = conn.execute(
        """
        SELECT user_id, bucket, data
        FROM tenant_data
        WHERE bucket IN ('clients', 'equipment', 'products', 'services')
        """
    ).fetchall()
    for row in rows:
        existing = conn.execute(
            "SELECT COUNT(*) AS total FROM tenant_items WHERE user_id = ? AND bucket = ?",
            (row["user_id"], row["bucket"]),
        ).fetchone()["total"]
        if existing:
            continue
        try:
            value = json.loads(row["data"])
        except json.JSONDecodeError:
            continue
        sync_bucket_items(conn, row["user_id"], row["bucket"], value)


def hash_password(password):
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), PASSWORD_ITERATIONS)
    return f"{salt}:{digest.hex()}"


def verify_password(password, stored):
    try:
        salt, expected = stored.split(":", 1)
        for iterations in (PASSWORD_ITERATIONS, 120_000):
            digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations).hex()
            if hmac.compare_digest(digest, expected):
                return True
        return False
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
        "approved": bool(row["approved"]),
    }


def read_tenant_state(user_id):
    state = default_state()
    with connect() as conn:
        data_rows = conn.execute(
            "SELECT bucket, data FROM tenant_data WHERE user_id = ?",
            (user_id,),
        ).fetchall()
        item_rows = conn.execute(
            """
            SELECT bucket, data
            FROM tenant_items
            WHERE user_id = ?
            ORDER BY bucket, item_id
            """,
            (user_id,),
        ).fetchall()
    for row in data_rows:
        try:
            state[row["bucket"]] = json.loads(row["data"])
        except json.JSONDecodeError:
            pass
    item_state = {bucket: [] for bucket in ITEM_BUCKETS}
    for row in item_rows:
        try:
            item_state[row["bucket"]].append(json.loads(row["data"]))
        except json.JSONDecodeError:
            pass
    for bucket, value in item_state.items():
        if value:
            state[bucket] = value
    return state


def read_tenant_lookup_state(user_id):
    state = default_state()
    with connect() as conn:
        row = conn.execute(
            "SELECT data FROM tenant_data WHERE user_id = ? AND bucket = 'settings'",
            (user_id,),
        ).fetchone()
        if row:
            try:
                state["settings"] = json.loads(row["data"])
            except json.JSONDecodeError:
                pass
        rows = conn.execute(
            """
            SELECT bucket, data
            FROM tenant_items
            WHERE user_id = ? AND bucket IN ('clients', 'equipment', 'products')
            ORDER BY bucket, item_id
            """,
            (user_id,),
        ).fetchall()
    for row in rows:
        try:
            state[row["bucket"]].append(json.loads(row["data"]))
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
        sync_bucket_items(conn, user_id, bucket, value)


def read_bucket_list(conn, user_id, bucket):
    row = conn.execute(
        "SELECT data FROM tenant_data WHERE user_id = ? AND bucket = ?",
        (user_id, bucket),
    ).fetchone()
    if not row:
        return []
    try:
        value = json.loads(row["data"])
    except json.JSONDecodeError:
        return []
    return value if isinstance(value, list) else []


def write_bucket_list(conn, user_id, bucket, value):
    conn.execute(
        """
        INSERT INTO tenant_data (user_id, bucket, data, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, bucket)
        DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
        """,
        (user_id, bucket, json.dumps(value, ensure_ascii=False)),
    )


def path_label(path):
    return ".".join(str(part) for part in path)


def replace_text_recursive(value, search, replacement, path=None):
    path = path or []
    if isinstance(value, str):
        if search in value:
            return value.replace(search, replacement), [{
                "path": path,
                "before": value,
                "after": value.replace(search, replacement),
            }]
        return value, []
    if isinstance(value, list):
        changed = []
        next_value = []
        for index, item in enumerate(value):
            replaced, diffs = replace_text_recursive(item, search, replacement, [*path, index])
            next_value.append(replaced)
            changed.extend(diffs)
        return next_value, changed
    if isinstance(value, dict):
        changed = []
        next_value = {}
        for key, item in value.items():
            replaced, diffs = replace_text_recursive(item, search, replacement, [*path, key])
            next_value[key] = replaced
            changed.extend(diffs)
        return next_value, changed
    return value, []


def set_path_value(value, path, new_value):
    target = value
    for part in path[:-1]:
        if isinstance(target, list):
            target = target[int(part)]
        else:
            target = target[part]
    last = path[-1]
    if isinstance(target, list):
        target[int(last)] = new_value
    else:
        target[last] = new_value


def create_undo_action(conn, user_id, label, payload):
    action_id = str(uuid.uuid4())
    conn.execute(
        """
        INSERT INTO undo_actions (id, user_id, label, payload)
        VALUES (?, ?, ?, ?)
        """,
        (action_id, user_id, label, json.dumps(payload, ensure_ascii=False)),
    )
    return action_id


def recent_undo_actions(user_id, limit=6):
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT id, label, undone, created_at
            FROM undo_actions
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
    return [
        {
            "date": row["created_at"],
            "text": row["label"],
            "undoId": row["id"],
            "undone": bool(row["undone"]),
        }
        for row in rows
    ]


def replace_text_tool(user_id, search, replacement):
    search = str(search or "")
    replacement = str(replacement or "")
    if not search:
        raise PublicError("Debe indicar el texto a buscar.")
    diffs = []
    changed_items = 0
    with connect() as conn:
        for bucket in ITEM_BUCKETS:
            items = read_bucket_list(conn, user_id, bucket)
            bucket_changed = False
            for index, item in enumerate(items):
                if not isinstance(item, dict):
                    continue
                item_id_value = item_id(item)
                replaced, item_diffs = replace_text_recursive(item, search, replacement)
                if item_diffs:
                    items[index] = replaced
                    bucket_changed = True
                    changed_items += 1
                    for diff in item_diffs:
                        diffs.append({
                            "bucket": bucket,
                            "itemId": item_id_value,
                            **diff,
                        })
            if bucket_changed:
                write_bucket_list(conn, user_id, bucket, items)
                sync_bucket_items(conn, user_id, bucket, items)

        settings = read_bucket_list(conn, user_id, "settings")
        if not settings:
            row = conn.execute(
                "SELECT data FROM tenant_data WHERE user_id = ? AND bucket = 'settings'",
                (user_id,),
            ).fetchone()
            settings = json.loads(row["data"]) if row else default_settings()
        replaced_settings, settings_diffs = replace_text_recursive(settings, search, replacement)
        if settings_diffs:
            conn.execute(
                """
                INSERT INTO tenant_data (user_id, bucket, data, updated_at)
                VALUES (?, 'settings', ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, bucket)
                DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
                """,
                (user_id, json.dumps(replaced_settings, ensure_ascii=False)),
            )
            for diff in settings_diffs:
                diffs.append({"bucket": "settings", "itemId": None, **diff})

        action_id = None
        if diffs:
            label = f'Reemplazo masivo: "{search}" por "{replacement}" ({len(diffs)} cambio(s))'
            action_id = create_undo_action(conn, user_id, label, {"type": "replace-text", "diffs": diffs})
    return {"count": len(diffs), "items": changed_items, "undoId": action_id}


def undo_action(user_id, action_id):
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM undo_actions WHERE user_id = ? AND id = ?",
            (user_id, action_id),
        ).fetchone()
        if not row:
            raise PublicError("Accion no encontrada.")
        if row["undone"]:
            raise PublicError("Esta accion ya fue deshecha.")
        payload = json.loads(row["payload"])
        diffs = payload.get("diffs", [])
        buckets = {}
        for diff in diffs:
            buckets.setdefault(diff["bucket"], []).append(diff)
        for bucket, bucket_diffs in buckets.items():
            if bucket == "settings":
                settings_row = conn.execute(
                    "SELECT data FROM tenant_data WHERE user_id = ? AND bucket = 'settings'",
                    (user_id,),
                ).fetchone()
                value = json.loads(settings_row["data"]) if settings_row else default_settings()
                for diff in bucket_diffs:
                    set_path_value(value, diff["path"], diff["before"])
                conn.execute(
                    """
                    INSERT INTO tenant_data (user_id, bucket, data, updated_at)
                    VALUES (?, 'settings', ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(user_id, bucket)
                    DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
                    """,
                    (user_id, json.dumps(value, ensure_ascii=False)),
                )
                continue

            items = read_bucket_list(conn, user_id, bucket)
            by_id = {item_id(item): item for item in items if isinstance(item, dict)}
            for diff in bucket_diffs:
                item = by_id.get(int(diff["itemId"]))
                if item is not None:
                    set_path_value(item, diff["path"], diff["before"])
            write_bucket_list(conn, user_id, bucket, items)
            sync_bucket_items(conn, user_id, bucket, items)
        conn.execute("UPDATE undo_actions SET undone = 1 WHERE id = ?", (action_id,))


def write_item(user_id, bucket, item_id_value, value):
    if bucket not in ITEM_BUCKETS or not isinstance(value, dict):
        raise PublicError("Dato no valido.")
    try:
        item_id_number = int(item_id_value)
    except (TypeError, ValueError):
        raise PublicError("ID no valido.")
    value["id"] = item_id_number

    with connect() as conn:
        items = read_bucket_list(conn, user_id, bucket)
        replaced = False
        for index, item in enumerate(items):
            if item_id(item) == item_id_number:
                items[index] = value
                replaced = True
                break
        if not replaced:
            items.append(value)
        write_bucket_list(conn, user_id, bucket, items)
        conn.execute(
            """
            INSERT OR REPLACE INTO tenant_items (user_id, bucket, item_id, data, search_text, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (user_id, bucket, item_id_number, json.dumps(value, ensure_ascii=False), item_search_text(value)),
        )


def create_item(user_id, bucket, value):
    if bucket not in ITEM_BUCKETS or not isinstance(value, dict):
        raise PublicError("Dato no valido.")
    with connect() as conn:
        row = conn.execute(
            "SELECT COALESCE(MAX(item_id), 0) + 1 AS next_id FROM tenant_items WHERE user_id = ? AND bucket = ?",
            (user_id, bucket),
        ).fetchone()
        next_id = int(row["next_id"])
        value["id"] = next_id
        items = read_bucket_list(conn, user_id, bucket)
        items.append(value)
        write_bucket_list(conn, user_id, bucket, items)
        conn.execute(
            """
            INSERT OR REPLACE INTO tenant_items (user_id, bucket, item_id, data, search_text, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (user_id, bucket, next_id, json.dumps(value, ensure_ascii=False), item_search_text(value)),
        )
    return value


def delete_item(user_id, bucket, item_id_value):
    if bucket not in ITEM_BUCKETS:
        raise PublicError("Dato no valido.")
    try:
        item_id_number = int(item_id_value)
    except (TypeError, ValueError):
        raise PublicError("ID no valido.")

    with connect() as conn:
        items = [item for item in read_bucket_list(conn, user_id, bucket) if item_id(item) != item_id_number]
        write_bucket_list(conn, user_id, bucket, items)
        conn.execute(
            "DELETE FROM tenant_items WHERE user_id = ? AND bucket = ? AND item_id = ?",
            (user_id, bucket, item_id_number),
        )


def read_item(conn, user_id, bucket, item_id_value):
    try:
        row_id = int(item_id_value)
    except (TypeError, ValueError):
        return None
    row = conn.execute(
        """
        SELECT data
        FROM tenant_items
        WHERE user_id = ? AND bucket = ? AND item_id = ?
        """,
        (user_id, bucket, row_id),
    ).fetchone()
    if not row:
        return None
    try:
        return json.loads(row["data"])
    except json.JSONDecodeError:
        return None


def enrich_page_items(conn, user_id, bucket, items):
    if bucket not in {"equipment", "services"}:
        return items
    enriched = []
    for item in items:
        if not isinstance(item, dict):
            enriched.append(item)
            continue
        copy = dict(item)
        if bucket in {"equipment", "services"}:
            copy["_client"] = read_item(conn, user_id, "clients", copy.get("clientId"))
        if bucket == "services":
            copy["_equipment"] = read_item(conn, user_id, "equipment", copy.get("equipmentId"))
        enriched.append(copy)
    return enriched


def read_items_page(user_id, bucket, params):
    if bucket not in ITEM_BUCKETS:
        raise PublicError("Dato no valido.")
    try:
        page = max(1, int(params.get("page", ["1"])[0]))
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = int(params.get("pageSize", ["50"])[0])
    except (TypeError, ValueError):
        page_size = 50
    page_size = max(1, min(page_size, 200))
    query = str(params.get("q", [""])[0]).strip().lower()
    where = ["user_id = ?", "bucket = ?"]
    values = [user_id, bucket]
    related_client_ids = []
    related_equipment_ids = []
    if query:
        search_clauses = ["search_text LIKE ?"]
        values.append(f"%{query}%")
        with connect() as conn:
            if bucket in {"equipment", "services"}:
                related_client_ids = [
                    str(row["item_id"])
                    for row in conn.execute(
                        """
                        SELECT item_id
                        FROM tenant_items
                        WHERE user_id = ? AND bucket = 'clients' AND search_text LIKE ?
                        """,
                        (user_id, f"%{query}%"),
                    ).fetchall()
                ]
            if bucket == "services":
                related_equipment_ids = [
                    str(row["item_id"])
                    for row in conn.execute(
                        """
                        SELECT item_id
                        FROM tenant_items
                        WHERE user_id = ? AND bucket = 'equipment' AND search_text LIKE ?
                        """,
                        (user_id, f"%{query}%"),
                    ).fetchall()
                ]
        if related_client_ids:
            placeholders = ", ".join("?" for _ in related_client_ids)
            search_clauses.append(f"CAST(json_extract(data, '$.clientId') AS TEXT) IN ({placeholders})")
            values.extend(related_client_ids)
        if related_equipment_ids:
            placeholders = ", ".join("?" for _ in related_equipment_ids)
            search_clauses.append(f"CAST(json_extract(data, '$.equipmentId') AS TEXT) IN ({placeholders})")
            values.extend(related_equipment_ids)
        where.append(f"({' OR '.join(search_clauses)})")

    if bucket == "services":
        status = str(params.get("status", [""])[0]).strip()
        statuses = [
            value.strip()
            for value in str(params.get("statuses", [""])[0]).split(",")
            if value.strip()
        ]
        client_id = str(params.get("clientId", [""])[0]).strip()
        equipment_id = str(params.get("equipmentId", [""])[0]).strip()
        if status:
            where.append("json_extract(data, '$.status') = ?")
            values.append(status)
        elif statuses:
            placeholders = ", ".join("?" for _ in statuses)
            where.append(f"json_extract(data, '$.status') IN ({placeholders})")
            values.extend(statuses)
        if client_id:
            where.append("CAST(json_extract(data, '$.clientId') AS TEXT) = ?")
            values.append(client_id)
        if equipment_id:
            where.append("CAST(json_extract(data, '$.equipmentId') AS TEXT) = ?")
            values.append(equipment_id)

    where_sql = " AND ".join(where)
    offset = (page - 1) * page_size
    order_sql = "item_id ASC"
    if bucket == "services":
        order_sql = """
        CASE json_extract(data, '$.status')
          WHEN 'Sin revisar' THEN 1
          WHEN 'Revision demorada' THEN 2
          WHEN 'Revisado' THEN 3
          WHEN 'Retiro demorado' THEN 4
          WHEN 'Entregado' THEN 5
          WHEN 'Cancelado' THEN 6
          ELSE 99
        END ASC,
        item_id DESC
        """

    with connect() as conn:
        total = conn.execute(
            f"SELECT COUNT(*) AS total FROM tenant_items WHERE {where_sql}",
            values,
        ).fetchone()["total"]
        rows = conn.execute(
            f"""
            SELECT data
            FROM tenant_items
            WHERE {where_sql}
            ORDER BY {order_sql}
            LIMIT ? OFFSET ?
            """,
            [*values, page_size, offset],
        ).fetchall()

    items = []
    for row in rows:
        try:
            items.append(json.loads(row["data"]))
        except json.JSONDecodeError:
            pass
    with connect() as conn:
        items = enrich_page_items(conn, user_id, bucket, items)
    pages = max(1, (total + page_size - 1) // page_size)
    return {
        "items": items,
        "page": min(page, pages),
        "pageSize": page_size,
        "total": total,
        "pages": pages,
    }


def tenant_item_counts(user_id):
    counts = {bucket: 0 for bucket in ITEM_BUCKETS}
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT bucket, COUNT(*) AS total
            FROM tenant_items
            WHERE user_id = ?
            GROUP BY bucket
            """,
            (user_id,),
        ).fetchall()
    for row in rows:
        counts[row["bucket"]] = row["total"]
    return counts


def dashboard_summary(user_id):
    counts = tenant_item_counts(user_id)
    status_counts = {
        "Sin revisar": 0,
        "Revision demorada": 0,
        "Revisado": 0,
        "Retiro demorado": 0,
        "Entregado": 0,
        "Cancelado": 0,
    }
    recent = []
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT data
            FROM tenant_items
            WHERE user_id = ? AND bucket = 'services'
            """,
            (user_id,),
        ).fetchall()
        clients = {
            row["item_id"]: json.loads(row["data"])
            for row in conn.execute(
                "SELECT item_id, data FROM tenant_items WHERE user_id = ? AND bucket = 'clients'",
                (user_id,),
            ).fetchall()
        }

    for row in rows:
        try:
            service = json.loads(row["data"])
        except json.JSONDecodeError:
            continue
        status = service.get("status") or ""
        if status in status_counts:
            status_counts[status] += 1
        client = clients.get(int(service.get("clientId") or 0), {})
        recent.append({
            "date": service.get("entryDate"),
            "text": f"Servicio #{service.get('id')}: {client.get('name') or 'Sin cliente'} - {status}",
        })

    for client in clients.values():
        recent.append({
            "date": client.get("createdAt"),
            "text": f"Cliente registrado: {client.get('name') or 'Sin nombre'}",
        })

    recent.extend(recent_undo_actions(user_id, 6))
    recent.sort(key=lambda item: item.get("date") or "", reverse=True)
    return {
        "counts": counts,
        "openServices": sum(
            total for status, total in status_counts.items()
            if status not in {"Entregado", "Cancelado"}
        ),
        "statusCounts": status_counts,
        "recentActivity": recent[:6],
    }


def is_render_environment():
    return any(key.startswith("RENDER") for key in os.environ)


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

    def do_DELETE(self):
        self.handle_api()

    def handle_api(self):
        try:
            parsed_url = urlparse(self.path)
            path = parsed_url.path
            params = parse_qs(parsed_url.query)

            if self.command in {"POST", "PUT", "DELETE"} and (self.command, path) not in CSRF_EXEMPT:
                if not self.valid_csrf_token():
                    self.send_json(403, {"error": "La sesion no pudo validarse. Recargue la pagina e intente nuevamente."})
                    return

            if self.command == "GET" and path == "/api/me":
                user = self.current_user()
                admin = self.admin_user()
                self.send_json(200, {
                    "authenticated": bool(user),
                    "user": public_user(user),
                    "admin": public_user(admin),
                    "impersonating": bool(user and admin and user["id"] != admin["id"]),
                    "csrfToken": self.csrf_token_for_session(self.session_token("services_session")) if user else "",
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

            if self.command == "POST" and path == "/api/admin/approve-user":
                self.admin_approve_user()
                return

            user = self.current_user()
            if not user:
                self.send_json(401, {"error": "Debe iniciar sesion."})
                return

            if self.command == "GET" and path == "/api/state":
                if params.get("lookups", ["0"])[0] in {"1", "true", "yes"}:
                    self.send_json(200, read_tenant_lookup_state(user["id"]))
                else:
                    self.send_json(200, read_tenant_state(user["id"]))
                return

            if self.command == "GET" and path == "/api/dashboard":
                self.send_json(200, dashboard_summary(user["id"]))
                return

            if self.command == "POST" and path == "/api/tools/replace-text":
                body = self.read_json()
                result = replace_text_tool(user["id"], body.get("search", ""), body.get("replacement", ""))
                self.send_json(200, result)
                return

            if self.command == "POST" and path.startswith("/api/undo-actions/"):
                action_id = path.rsplit("/", 1)[-1]
                undo_action(user["id"], action_id)
                self.send_json(200, {"ok": True})
                return

            if self.command == "GET" and path.startswith("/api/items/"):
                bucket = path.rsplit("/", 1)[-1]
                self.send_json(200, read_items_page(user["id"], bucket, params))
                return

            if path.startswith("/api/item/"):
                parts = path.strip("/").split("/")
                if len(parts) not in {3, 4}:
                    self.send_json(404, {"error": "Ruta no encontrada."})
                    return
                _, _, bucket, *rest = parts
                if self.command == "POST" and not rest:
                    item = create_item(user["id"], bucket, self.read_json())
                    self.send_json(201, {"ok": True, "item": item})
                    return
                if not rest:
                    self.send_json(404, {"error": "Ruta no encontrada."})
                    return
                item_id_value = rest[0]
                if self.command == "PUT":
                    write_item(user["id"], bucket, item_id_value, self.read_json())
                    self.send_json(200, {"ok": True})
                    return
                if self.command == "DELETE":
                    delete_item(user["id"], bucket, item_id_value)
                    self.send_json(200, {"ok": True})
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
            bootstrap_admin = existing_users == 0 and BOOTSTRAP_FIRST_ADMIN
            approved = 1 if bootstrap_admin else 0
            try:
                conn.execute(
                    "INSERT INTO users (id, name, email, password_hash, is_admin, approved) VALUES (?, ?, ?, ?, ?, ?)",
                    (user_id, name, email, hash_password(password), 1 if bootstrap_admin else 0, approved),
                )
            except sqlite3.IntegrityError:
                raise PublicError("Ya existe un usuario con ese email.")

            for bucket, value in default_state().items():
                conn.execute(
                    "INSERT INTO tenant_data (user_id, bucket, data) VALUES (?, ?, ?)",
                    (user_id, bucket, json.dumps(value, ensure_ascii=False)),
                )

        response = {
            "user": {"id": user_id, "name": name, "email": email, "isAdmin": bool(approved and existing_users == 0), "approved": bool(approved)},
            "pendingApproval": not bool(approved),
        }
        headers = None
        if approved:
            token = self.create_session(user_id)
            response["csrfToken"] = self.csrf_token_for_session(token)
            headers = {"Set-Cookie": self.cookie_header("services_session", token)}

        self.send_json(201, response, headers)

    def login(self):
        body = self.read_json()
        email = str(body.get("email", "")).strip().lower()
        password = str(body.get("password", ""))
        if self.login_is_locked(email):
            raise PublicError("Demasiados intentos fallidos. Espere unos minutos e intente nuevamente.")
        with connect() as conn:
            user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if not user or not verify_password(password, user["password_hash"]):
            self.record_login_failure(email)
            raise PublicError("Email o clave incorrectos.")
        if not user["approved"]:
            raise PublicError("Su cuenta esta pendiente de aprobacion manual.")

        self.clear_login_failures(email)
        token = self.create_session(user["id"])
        self.send_json(
            200,
            {"user": public_user(user), "csrfToken": self.csrf_token_for_session(token)},
            {"Set-Cookie": self.cookie_header("services_session", token)},
        )

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
                    self.expired_cookie_header("services_session"),
                    self.expired_cookie_header("services_admin_session"),
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
                SELECT id, name, email, is_admin, approved, created_at
                FROM users
                ORDER BY created_at DESC
                """
            ).fetchall()

        users = []
        for row in rows:
            counts = tenant_item_counts(row["id"])
            users.append({
                "id": row["id"],
                "name": row["name"],
                "email": row["email"],
                "isAdmin": bool(row["is_admin"]),
                "approved": bool(row["approved"]),
                "createdAt": row["created_at"],
                "counts": counts,
            })
        self.send_json(200, {
            "users": users,
            "admin": public_user(admin),
            "csrfToken": self.csrf_token_for_session(self.session_token("services_session")),
        })

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
                    self.expired_cookie_header("services_admin_session"),
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

    def admin_approve_user(self):
        admin = self.admin_user()
        if not admin:
            self.send_json(403, {"error": "No tiene permisos de administrador."})
            return

        body = self.read_json()
        target_id = str(body.get("userId", "")).strip()
        if not target_id:
            raise PublicError("Usuario no valido.")

        with connect() as conn:
            target = conn.execute("SELECT * FROM users WHERE id = ?", (target_id,)).fetchone()
            if not target:
                raise PublicError("Usuario no encontrado.")
            conn.execute("UPDATE users SET approved = 1 WHERE id = ?", (target_id,))

        self.send_json(200, {"ok": True, "approvedUser": public_user(target)})

    def current_user(self):
        token = self.session_token("services_session")
        return self.user_from_session(token, require_approved=True)

    def admin_user(self):
        admin_token = self.session_token("services_admin_session")
        user = self.user_from_session(admin_token, require_approved=True)
        if user and user["is_admin"]:
            return user
        user = self.user_from_session(self.session_token("services_session"), require_approved=True)
        if user and user["is_admin"]:
            return user
        return None

    def user_from_session(self, token, require_approved=False):
        if not token:
            return None
        with connect() as conn:
            query = [
                "SELECT users.*",
                "FROM sessions",
                "JOIN users ON users.id = sessions.user_id",
                "WHERE sessions.token = ?",
            ]
            params = [token]
            if require_approved:
                query.append("AND users.approved = 1")
            return conn.execute(
                "\n".join(query),
                params,
            ).fetchone()

    def create_session(self, user_id):
        token = secrets.token_hex(32)
        csrf_token = secrets.token_hex(32)
        with connect() as conn:
            conn.execute(
                "INSERT INTO sessions (token, user_id, csrf_token) VALUES (?, ?, ?)",
                (token, user_id, csrf_token),
            )
        return token

    def csrf_token_for_session(self, token):
        if not token:
            return ""
        with connect() as conn:
            row = conn.execute("SELECT csrf_token FROM sessions WHERE token = ?", (token,)).fetchone()
            if not row:
                return ""
            csrf_token = row["csrf_token"]
            if csrf_token:
                return csrf_token
            csrf_token = secrets.token_hex(32)
            conn.execute("UPDATE sessions SET csrf_token = ? WHERE token = ?", (csrf_token, token))
            return csrf_token

    def valid_csrf_token(self):
        token = self.session_token("services_session")
        expected = self.csrf_token_for_session(token)
        provided = self.headers.get("X-CSRF-Token", "")
        return bool(expected and provided and hmac.compare_digest(expected, provided))

    def session_token(self, name):
        raw = self.headers.get("Cookie", "")
        jar = cookies.SimpleCookie()
        jar.load(raw)
        morsel = jar.get(name)
        return morsel.value if morsel else ""

    def cookie_header(self, name, token):
        secure = "; Secure" if self.should_secure_cookies() else ""
        return f"{name}={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000{secure}"

    def expired_cookie_header(self, name):
        secure = "; Secure" if self.should_secure_cookies() else ""
        return f"{name}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0{secure}"

    def should_secure_cookies(self):
        forwarded_proto = self.headers.get("X-Forwarded-Proto", "")
        return forwarded_proto == "https" or is_render_environment()

    def client_ip(self):
        forwarded = self.headers.get("X-Forwarded-For", "")
        if forwarded:
            return forwarded.split(",", 1)[0].strip()
        return self.client_address[0] if self.client_address else "unknown"

    def login_key(self, email):
        return f"{self.client_ip()}|{email}"

    def login_is_locked(self, email):
        attempt = LOGIN_ATTEMPTS.get(self.login_key(email))
        if not attempt:
            return False
        now = time.time()
        if attempt.get("locked_until", 0) > now:
            return True
        if now - attempt.get("first_at", now) > LOGIN_WINDOW_SECONDS:
            LOGIN_ATTEMPTS.pop(self.login_key(email), None)
        return False

    def record_login_failure(self, email):
        key = self.login_key(email)
        now = time.time()
        attempt = LOGIN_ATTEMPTS.get(key)
        if not attempt or now - attempt.get("first_at", now) > LOGIN_WINDOW_SECONDS:
            attempt = {"count": 0, "first_at": now, "locked_until": 0}
        attempt["count"] += 1
        if attempt["count"] >= LOGIN_MAX_ATTEMPTS:
            attempt["locked_until"] = now + LOGIN_LOCK_SECONDS
        LOGIN_ATTEMPTS[key] = attempt

    def clear_login_failures(self, email):
        LOGIN_ATTEMPTS.pop(self.login_key(email), None)

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
        self.send_security_headers()
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
        self.send_security_headers()
        for key, value in (extra_headers or {}).items():
            if isinstance(value, list):
                for item in value:
                    self.send_header(key, item)
            else:
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def send_security_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")

    def log_message(self, format, *args):
        return


class PublicError(Exception):
    pass


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), ServicesHandler)
    print(f"Sistema de Services con SQLite listo en http://localhost:{PORT}")
    server.serve_forever()
