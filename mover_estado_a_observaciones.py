from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "data" / "services.db"


def sqlite_backup(source: Path) -> Path:
    backup = source.with_name(f"{source.stem}_backup_pre_mov_estado_{datetime.now():%Y%m%d_%H%M%S}{source.suffix}")
    with sqlite3.connect(source) as src, sqlite3.connect(backup) as dst:
        src.backup(dst)
    return backup


def move_state_to_observations(db_path: Path, email: str, dry_run: bool) -> None:
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        user = conn.execute("SELECT id FROM users WHERE lower(email) = lower(?)", (email,)).fetchone()
        if not user:
            raise SystemExit(f"No existe el usuario {email!r} en {db_path}")

        row = conn.execute(
            "SELECT data FROM tenant_data WHERE user_id = ? AND bucket = 'equipment'",
            (user["id"],),
        ).fetchone()
        if not row:
            raise SystemExit(f"El usuario {email!r} no tiene equipos cargados.")

        equipment = json.loads(row["data"])
        changed = 0
        for item in equipment:
            condition = str(item.get("condition") or "").strip()
            observations = str(item.get("observations") or "").strip()
            if not condition:
                if "observations" not in item:
                    item["observations"] = observations
                continue
            merged = "\n".join(part for part in [observations, condition] if part).strip()
            if merged != observations or condition:
                item["observations"] = merged
                item["condition"] = ""
                changed += 1

    print(f"Equipos modificados: {changed}")

    if dry_run:
        print("Modo prueba: no se escribieron cambios.")
        return

    backup = sqlite_backup(db_path)
    with sqlite3.connect(db_path) as conn:
        user_id = conn.execute("SELECT id FROM users WHERE lower(email) = lower(?)", (email,)).fetchone()[0]
        conn.execute(
            """
            UPDATE tenant_data
            SET data = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND bucket = 'equipment'
            """,
            (json.dumps(equipment, ensure_ascii=False), user_id),
        )
    print(f"Backup creado: {backup}")
    print(f"Estado movido a observaciones para {email}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Mueve el contenido de condition a observations para equipos de un usuario.")
    parser.add_argument("--db", default=str(DB_PATH), help="Ruta a services.db")
    parser.add_argument("--email", required=True, help="Email del usuario")
    parser.add_argument("--dry-run", action="store_true", help="Muestra cambios sin escribir")
    args = parser.parse_args()
    move_state_to_observations(Path(args.db), args.email, args.dry_run)


if __name__ == "__main__":
    main()
