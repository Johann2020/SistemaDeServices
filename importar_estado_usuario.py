from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "data" / "services.db"
BUCKETS = ("clients", "equipment", "products", "services", "settings")


def sqlite_backup(source: Path) -> Path:
    backup = source.with_name(f"{source.stem}_backup_pre_importacion_{datetime.now():%Y%m%d_%H%M%S}{source.suffix}")
    with sqlite3.connect(source) as src, sqlite3.connect(backup) as dst:
        src.backup(dst)
    return backup


def import_state(db_path: Path, state_path: Path, email: str, replace: bool) -> None:
    state = json.loads(state_path.read_text(encoding="utf-8"))
    missing = [bucket for bucket in BUCKETS if bucket not in state]
    if missing:
        raise SystemExit(f"El archivo no tiene estos datos requeridos: {', '.join(missing)}")

    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        user = conn.execute("SELECT id FROM users WHERE lower(email) = lower(?)", (email,)).fetchone()
        if not user:
            raise SystemExit(f"No existe el usuario {email!r} en {db_path}")

        user_id = user["id"]
        existing = conn.execute("SELECT COUNT(*) FROM tenant_data WHERE user_id = ?", (user_id,)).fetchone()[0]
        if existing and not replace:
            raise SystemExit("El usuario ya tiene datos. Use --replace para reemplazarlos.")

    backup = sqlite_backup(db_path)

    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        user_id = conn.execute("SELECT id FROM users WHERE lower(email) = lower(?)", (email,)).fetchone()["id"]
        for bucket in BUCKETS:
            conn.execute(
                """
                INSERT INTO tenant_data (user_id, bucket, data, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, bucket)
                DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
                """,
                (user_id, bucket, json.dumps(state[bucket], ensure_ascii=False)),
            )

    print(f"Backup creado: {backup}")
    print(f"Importacion completada para {email}")
    print(
        "Resumen: "
        f"{len(state['clients'])} clientes, "
        f"{len(state['equipment'])} equipos, "
        f"{len(state['products'])} productos, "
        f"{len(state['services'])} services"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Importa un estado JSON migrado en un usuario existente.")
    parser.add_argument("--db", default=str(DB_PATH), help="Ruta a services.db")
    parser.add_argument("--state", required=True, help="Ruta al JSON migrado")
    parser.add_argument("--email", required=True, help="Email del usuario destino")
    parser.add_argument("--replace", action="store_true", help="Reemplaza datos actuales del usuario")
    args = parser.parse_args()

    import_state(Path(args.db), Path(args.state), args.email, args.replace)


if __name__ == "__main__":
    main()
