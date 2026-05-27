from __future__ import annotations

import argparse
import json
import sqlite3
from collections import Counter
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "data" / "services.db"


TYPE_MAP = {
    "celular": "Telefono",
    "celulares": "Telefono",
    "celuar": "Telefono",
    "celula": "Telefono",
    "telefono": "Telefono",
    "telefono celular": "Telefono",
    "movil": "Telefono",
    "tablet": "Tablet",
    "tablets": "Tablet",
    "notebook": "Notebook",
    "note": "Notebook",
    "laptop": "Notebook",
    "netbook": "Notebook",
    "netbook del gobierno": "Notebook",
    "cpu": "CPU / PC",
    "pc": "CPU / PC",
    "pc escritorio": "CPU / PC",
    "pc de escritorio": "CPU / PC",
    "computadora": "CPU / PC",
    "computadora de escritorio": "CPU / PC",
    "gabinete": "CPU / PC",
    "gabynete": "CPU / PC",
    "monitor": "Monitor",
    "monitores": "Monitor",
    "impresora": "Impresora",
    "impresoras": "Impresora",
}


def normalize_type(value: str) -> str:
    text = str(value or "").strip()
    return TYPE_MAP.get(text.casefold(), text or "Otro")


def sqlite_backup(source: Path) -> Path:
    backup = source.with_name(f"{source.stem}_backup_pre_normalizar_tipos_{datetime.now():%Y%m%d_%H%M%S}{source.suffix}")
    with sqlite3.connect(source) as src, sqlite3.connect(backup) as dst:
        src.backup(dst)
    return backup


def normalize_equipment(db_path: Path, email: str, dry_run: bool) -> None:
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
        before = Counter(str(item.get("type") or "").strip() or "Otro" for item in equipment)
        changed = 0
        for item in equipment:
            current = str(item.get("type") or "").strip()
            normalized = normalize_type(current)
            if normalized != current:
                item["type"] = normalized
                changed += 1
        after = Counter(str(item.get("type") or "").strip() or "Otro" for item in equipment)

    print("Tipos antes:")
    for name, count in before.most_common(20):
        print(f"  {name}: {count}")
    print("\nTipos despues:")
    for name, count in after.most_common(20):
        print(f"  {name}: {count}")
    print(f"\nEquipos modificados: {changed}")

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


def main() -> None:
    parser = argparse.ArgumentParser(description="Normaliza tipos de equipos migrados para un usuario.")
    parser.add_argument("--db", default=str(DB_PATH), help="Ruta a services.db")
    parser.add_argument("--email", required=True, help="Email del usuario")
    parser.add_argument("--dry-run", action="store_true", help="Muestra cambios sin escribir")
    args = parser.parse_args()
    normalize_equipment(Path(args.db), args.email, args.dry_run)


if __name__ == "__main__":
    main()
