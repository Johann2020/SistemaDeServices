from __future__ import annotations

import argparse
import json
import math
import shutil
import sqlite3
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "data" / "services.db"
ACCESS_PATH = ROOT / "Sistema .net" / "Salida" / "Database.accdb"


def export_access(access_path: Path) -> dict[str, list[dict]]:
    script = r"""
param(
  [string]$AccessPath,
  [string]$OutPath
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Data
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$AccessPath;Persist Security Info=False")
$conn.Open()
$result = [ordered]@{}
foreach ($table in @('Clientes', 'Equipos', 'Services', 'Autocompletar')) {
  $cmd = $conn.CreateCommand()
  $cmd.CommandText = "SELECT * FROM [$table]"
  $da = New-Object System.Data.OleDb.OleDbDataAdapter($cmd)
  $dt = New-Object System.Data.DataTable
  [void]$da.Fill($dt)
  $rows = @()
  foreach ($row in $dt.Rows) {
    $item = [ordered]@{}
    foreach ($col in $dt.Columns) {
      $value = $row[$col.ColumnName]
      if ($value -is [DBNull]) {
        $value = $null
      } elseif ($value -is [DateTime]) {
        $value = $value.ToString("yyyy-MM-ddTHH:mm:ss")
      }
      $item[$col.ColumnName] = $value
    }
    $rows += [pscustomobject]$item
  }
  $result[$table] = $rows
}
$conn.Close()
$result | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $OutPath
"""
    with tempfile.TemporaryDirectory() as tmp:
      script_path = Path(tmp) / "export_access.ps1"
      out_path = Path(tmp) / "access_export.json"
      script_path.write_text(script, encoding="utf-8")
      subprocess.run(
          [
              "powershell",
              "-NoProfile",
              "-ExecutionPolicy",
              "Bypass",
              "-File",
              str(script_path),
              "-AccessPath",
              str(access_path),
              "-OutPath",
              str(out_path),
          ],
          check=True,
          cwd=ROOT,
      )
      return json.loads(out_path.read_text(encoding="utf-8-sig"))


def clean(value) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    return str(value).strip()


def normalize_equipment_type(value) -> str:
    text = clean(value)
    key = text.casefold()
    if key in {"celular", "celulares", "celuar", "celula", "telefono", "telefono celular", "movil"}:
        return "Telefono"
    if key in {"tablet", "tablets"}:
        return "Tablet"
    if key in {"notebook", "note", "laptop", "netbook", "netbook del gobierno"}:
        return "Notebook"
    if key in {
        "cpu",
        "pc",
        "pc escritorio",
        "pc de escritorio",
        "computadora",
        "computadora de escritorio",
        "gabinete",
        "gabynete",
    }:
        return "CPU / PC"
    if key in {"monitor", "monitores"}:
        return "Monitor"
    if key in {"impresora", "impresoras"}:
        return "Impresora"
    return text or "Otro"


def number(value) -> int:
    try:
        return int(round(float(value or 0)))
    except (TypeError, ValueError):
        return 0


def iso(value) -> str:
    text = clean(value)
    if not text:
        return ""
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M:%S", "%d/%m/%Y"):
        try:
            return datetime.strptime(text, fmt).replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            pass
    return text


def split_bullets(value: str) -> list[str]:
    return [item.strip() for item in clean(value).split("•") if item.strip()]


def parse_complex(value: str) -> list[dict]:
    items = []
    for raw in split_bullets(value):
        entry = {"description": "", "done": False, "note": ""}
        for piece in [part for part in raw.split("◘") if part]:
            if piece.startswith("T:"):
                entry["description"] = piece[2:].strip()
            elif piece == "R:Si":
                entry["done"] = True
            elif piece == "R:No":
                entry["done"] = False
            elif piece.startswith("M:"):
                entry["note"] = piece[2:].strip()
        if entry["description"]:
            items.append(entry)
    return items


def status_from_access(row: dict) -> str:
    estado = number(row.get("Estado"))
    if estado == 1:
        return "Revisado"
    if estado == 2:
        return "Entregado"
    return "Sin revisar"


def distribute(total: int, count: int) -> list[int]:
    if total <= 0 or count <= 0:
        return [0] * max(count, 0)
    base = total // count
    rest = total - base * count
    values = [base] * count
    if values:
        values[0] += rest
    return values


def migrate(data: dict) -> dict[str, list | dict]:
    clients = []
    client_id_map = {}
    for row in data.get("Clientes", []):
        old_id = number(row.get("Id"))
        new_id = len(clients) + 1
        client_id_map[old_id] = new_id
        clients.append({
            "id": new_id,
            "name": clean(row.get("Nombre")) or f"Cliente {old_id}",
            "province": "",
            "city": clean(row.get("Localidad")),
            "address": clean(row.get("Direccion")),
            "phone1": clean(row.get("Tel_1")),
            "phone2": clean(row.get("Tel_2")),
            "document": clean(row.get("DNI_Cuit")),
            "comments": clean(row.get("Comentarios")),
            "createdAt": iso(row.get("FechaCarga")) or datetime.now(timezone.utc).isoformat(),
        })

    equipment = []
    equipment_id_map = {}
    for row in data.get("Equipos", []):
        old_id = number(row.get("Id"))
        client_id = client_id_map.get(number(row.get("Id_Cliente")))
        if not client_id:
            continue
        new_id = len(equipment) + 1
        equipment_id_map[old_id] = new_id
        equipment.append({
            "id": new_id,
            "clientId": client_id,
            "type": normalize_equipment_type(row.get("Tipo")),
            "brand": clean(row.get("Marca")),
            "model": clean(row.get("Modelo")),
            "serial": "",
            "condition": clean(row.get("Otros")),
            "password": "",
            "pattern": "",
            "createdAt": datetime.now(timezone.utc).isoformat(),
        })

    products = []
    product_by_name = {}

    def product_for(name: str, price: int) -> int:
        key = name.casefold()
        if key in product_by_name:
            return product_by_name[key]
        product_id = len(products) + 1
        product_by_name[key] = product_id
        products.append({
            "id": product_id,
            "type": "Repuesto migrado",
            "brand": "",
            "model": name,
            "features": "",
            "cost": max(price, 0),
            "margin": 0,
        })
        return product_id

    services = []
    for row in data.get("Services", []):
        client_id = client_id_map.get(number(row.get("Id_Cliente")))
        equipment_id = equipment_id_map.get(number(row.get("Id_Equipo")))
        if not client_id or not equipment_id:
            continue

        issues = parse_complex(row.get("Problema_Sc"))
        requested = parse_complex(row.get("Trabajo_Sc"))
        extra_names = split_bullets(row.get("Trabajos_Ex"))
        problem_fixed = parse_complex(row.get("Problemas_Fs"))
        for item in problem_fixed:
            if item["description"] and not any(existing["description"] == item["description"] for existing in issues):
                issues.append(item)

        parts = []
        part_names = split_bullets(row.get("Repuesto"))
        parts_total = number(row.get("Precio_Repuesto"))
        part_prices = distribute(parts_total, len(part_names))
        for index, part_name in enumerate(part_names):
            sale_price = part_prices[index] if index < len(part_prices) else 0
            parts.append({
                "productId": product_for(part_name, sale_price),
                "quantity": 1,
                "salePrice": sale_price,
            })

        external_cost = number(row.get("Precio_Derivacion"))
        final_total = number(row.get("Precio_Final"))
        labor_total = max(0, final_total - parts_total - external_cost)
        work_items = []
        raw_works = [
            *[{**item, "source": "requested"} for item in requested],
            *[{"description": name, "done": True, "note": "", "source": "extra"} for name in extra_names],
        ]
        prices = distribute(labor_total, len([item for item in raw_works if item["done"]]))
        price_index = 0
        for item in raw_works:
            price = 0
            if item["done"]:
                price = prices[price_index] if price_index < len(prices) else 0
                price_index += 1
            work_items.append({
                "description": item["description"],
                "price": price,
                "done": bool(item["done"]),
                "note": item.get("note", ""),
                "source": item.get("source", "extra"),
            })
        if labor_total and not work_items:
            work_items.append({
                "description": "Mano de obra migrada",
                "price": labor_total,
                "done": True,
                "note": "",
                "source": "extra",
            })

        external_works = []
        if clean(row.get("Derivado")) or clean(row.get("Trabajo_Derivacion")) or external_cost:
            external_works.append({
                "technician": clean(row.get("Derivado")) or "Externo",
                "description": clean(row.get("Trabajo_Derivacion")) or "Trabajo externo",
                "price": external_cost,
            })

        if number(row.get("Espera")):
            wait_note = clean(row.get("Motivo_Espera"))
            if wait_note:
                diagnosis = f"{clean(row.get('Diagnostico'))}\nEn espera: {wait_note}".strip()
            else:
                diagnosis = clean(row.get("Diagnostico"))
        else:
            diagnosis = clean(row.get("Diagnostico"))

        failure = " | ".join(item["description"] for item in issues if item["description"])
        services.append({
            "id": number(row.get("Id")),
            "clientId": client_id,
            "equipmentId": equipment_id,
            "status": status_from_access(row),
            "entryDate": iso(row.get("Fecha_Ingreso")),
            "finishDate": iso(row.get("Fecha_Fin")),
            "deliveryDate": iso(row.get("Fecha_Entrega")),
            "failure": failure,
            "diagnosis": diagnosis,
            "accessories": clean(row.get("Accesorios")),
            "derived": clean(row.get("Derivado")),
            "externalWork": " | ".join(f"{w['technician']}: {w['description']}" for w in external_works),
            "externalCost": external_cost,
            "works": work_items,
            "issues": issues,
            "externalWorks": external_works,
            "parts": parts,
            "total": final_total,
        })

    frequent = {}
    for row in data.get("Autocompletar", []):
        if clean(row.get("Columna")) in {"Solucion", "Trabajo", "Trabajos_Ex"}:
            value = clean(row.get("Valor"))
            if value:
                frequent[value] = 0
    for service in services:
        for work in service.get("works", []):
            if work["description"] and work["price"]:
                frequent.setdefault(work["description"], work["price"])

    settings = {
        "transportCost": 0,
        "margins": [],
        "frequentWorks": [{"description": k, "price": v} for k, v in sorted(frequent.items())],
        "serviceFilters": {"all": True, "statuses": []},
    }

    return {
        "clients": clients,
        "equipment": equipment,
        "products": products,
        "services": services,
        "settings": settings,
    }


def write_state(email: str, state: dict, replace: bool) -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        user = conn.execute("SELECT id FROM users WHERE lower(email) = lower(?)", (email,)).fetchone()
        if not user:
            raise SystemExit(f"No existe el usuario {email!r} en {DB_PATH}")
        user_id = user["id"]
        if not replace:
            existing = conn.execute("SELECT COUNT(*) FROM tenant_data WHERE user_id = ?", (user_id,)).fetchone()[0]
            if existing:
                raise SystemExit("El usuario ya tiene datos. Use --replace para reemplazarlos.")
        backup = DB_PATH.with_name(f"{DB_PATH.stem}_backup_pre_migracion_{datetime.now():%Y%m%d_%H%M%S}{DB_PATH.suffix}")
        shutil.copy2(DB_PATH, backup)
        for bucket in ("clients", "equipment", "products", "services", "settings"):
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


def main() -> None:
    parser = argparse.ArgumentParser(description="Migra la base Access del sistema .NET al sistema web.")
    parser.add_argument("--access", default=str(ACCESS_PATH), help="Ruta a Database.accdb")
    parser.add_argument("--email", default="gelrothjohann@gmail.com", help="Usuario destino")
    parser.add_argument("--importar", action="store_true", help="Escribe los datos en services.db")
    parser.add_argument("--replace", action="store_true", help="Reemplaza los datos actuales del usuario destino")
    args = parser.parse_args()

    data = export_access(Path(args.access))
    state = migrate(data)
    summary = {
        "clientes": len(state["clients"]),
        "equipos": len(state["equipment"]),
        "productos_migrados": len(state["products"]),
        "services": len(state["services"]),
        "trabajos_frecuentes": len(state["settings"]["frequentWorks"]),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if args.importar:
        write_state(args.email, state, args.replace)
        print(f"Migracion completada para {args.email}")
    else:
        preview = ROOT / "data" / "preview_migracion_access.json"
        preview.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Vista previa generada: {preview}")


if __name__ == "__main__":
    main()
