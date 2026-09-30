"""
Migration script: Render SQLite (Johann) → CRM Servicio Técnico
Extracts clients, equipment+services→orders, products→inventory
Outputs JSON files ready to import into the CRM.
"""

import sqlite3
import json
from pathlib import Path

DB_PATH = Path(r"D:\Usuarios\Equipo\Descargas\services.db")
OUTPUT_DIR = Path(r"C:\CRM Servicio Técnico\migrated_data")
JOHANN_USER_ID = "8478b452-208e-4a0d-b3f2-47e912138b75"

STATUS_MAP = {
    "Entregado": "Entregado",
    "Revisado": "Listo",
    "Sin revisar": "Ingresado",
    "Revision demorada": "En Reparación",
    "Retiro demorado": "Listo",
    "Cancelado": "Entregado",
}

def load_bucket(cur, bucket):
    cur.execute(
        "SELECT item_id, data FROM tenant_items WHERE user_id=? AND bucket=? ORDER BY item_id",
        (JOHANN_USER_ID, bucket),
    )
    items = {}
    for row in cur.fetchall():
        items[row[0]] = json.loads(row[1])
    return items


def migrate_clients(raw_clients):
    results = []
    for old_id, c in raw_clients.items():
        results.append({
            "id": f"cli-{c['id']}",
            "name": c.get("name", ""),
            "phone": c.get("phone1", ""),
            "phone2": c.get("phone2", ""),
            "documentId": c.get("document", ""),
            "provincia": c.get("province", ""),
            "localidad": c.get("city", ""),
            "address": c.get("address", ""),
            "comments": c.get("comments", ""),
            "createdAt": c.get("createdAt", ""),
        })
    return results


def migrate_products(raw_products):
    results = []
    for old_id, p in raw_products.items():
        name_parts = [p.get("type", ""), p.get("brand", ""), p.get("model", "")]
        name = " ".join(part for part in name_parts if part).strip() or f"Repuesto #{p['id']}"

        cost = p.get("cost", 0) or 0
        margin = p.get("margin", 0) or 0
        final_price = cost * (1 + margin / 100) if margin > 0 else cost

        results.append({
            "id": f"part-r{p['id']}",
            "name": name,
            "sku": f"MIG-{p['id']:04d}",
            "price": round(final_price),
            "costPrice": cost,
            "pricingType": "margin" if margin > 0 else "manual",
            "marginPercent": margin,
            "finalPrice": round(final_price),
            "stock": 0,
            "category": p.get("type", "Otro"),
            "currency": "ARS",
            "iva": "21.0%",
            "compatibleDevices": p.get("features", ""),
        })
    return results


def migrate_orders(raw_services, raw_equipment, raw_clients, raw_products):
    results = []
    products_by_id = {p["id"]: p for p in raw_products.values()}
    clients_by_id = {c["id"]: c for c in raw_clients.values()}

    for old_id, svc in raw_services.items():
        equip_id = svc.get("equipmentId")
        equip = raw_equipment.get(equip_id, {})
        client_id = svc.get("clientId")
        client = clients_by_id.get(client_id, {})

        crm_status = STATUS_MAP.get(svc.get("status", ""), "Ingresado")

        labor_cost = sum(w.get("price", 0) for w in svc.get("works", []))

        parts_used = []
        for part in svc.get("parts", []):
            pid = part.get("productId")
            product = products_by_id.get(pid, {})
            name_parts = [product.get("type", ""), product.get("brand", ""), product.get("model", "")]
            pname = " ".join(p for p in name_parts if p).strip() or f"Repuesto #{pid}"
            parts_used.append({
                "id": f"part-r{pid}" if pid else f"part-unk-{svc['id']}",
                "name": pname,
                "price": part.get("salePrice", 0),
                "quantity": part.get("quantity", 1),
            })

        entry_date = svc.get("entryDate", "")
        finish_date = svc.get("finishDate", "")
        delivery_date = svc.get("deliveryDate", "")

        status_history = [{"status": "Ingresado", "timestamp": entry_date}]
        if crm_status in ("En Reparación", "Listo", "Entregado") and entry_date:
            status_history.append({"status": "En Reparación", "timestamp": entry_date})
        if crm_status in ("Listo", "Entregado") and finish_date:
            status_history.append({"status": "Listo", "timestamp": finish_date})
        if crm_status == "Entregado" and delivery_date:
            status_history.append({"status": "Entregado", "timestamp": delivery_date})

        failure = svc.get("failure", "")
        diagnosis = svc.get("diagnosis", "")
        issues_text = "; ".join(
            i.get("description", "") for i in svc.get("issues", []) if i.get("description")
        )
        works_text = "; ".join(
            w.get("description", "") for w in svc.get("works", []) if w.get("description")
        )

        description = failure or issues_text or "Sin descripción"

        extras = []
        if svc.get("accessories"):
            extras.append(f"Accesorios: {svc['accessories']}")
        if svc.get("derived"):
            extras.append(f"Derivado: {svc['derived']}")
        if svc.get("externalWork"):
            extras.append(f"Trabajo externo: {svc['externalWork']}")
        if svc.get("externalCost", 0) > 0:
            extras.append(f"Costo externo: ${svc['externalCost']}")
        if svc.get("status") == "Cancelado":
            extras.append("SERVICIO CANCELADO")

        diagnostic_notes = diagnosis
        if extras:
            diagnostic_notes = (diagnostic_notes + "\n" + "\n".join(extras)).strip()

        order_num = 1000 + svc["id"]

        results.append({
            "id": f"TS-{order_num}",
            "clientId": f"cli-{client_id}" if client_id else "",
            "clientName": client.get("name", "Cliente desconocido"),
            "clientPhone": client.get("phone1", ""),
            "deviceType": equip.get("type", "Otro"),
            "brand": equip.get("brand", ""),
            "model": equip.get("model", ""),
            "serialNumber": equip.get("serial", ""),
            "devicePassword": equip.get("password", ""),
            "devicePattern": equip.get("pattern", ""),
            "description": description,
            "reportedProblem": failure,
            "plannedWork": works_text if works_text != "Mano de obra migrada" else "",
            "diagnosticNotes": diagnostic_notes,
            "status": crm_status,
            "priority": "Media",
            "assignedTechnician": "",
            "partsUsed": parts_used,
            "laborCost": labor_cost,
            "totalCost": svc.get("total", 0),
            "estimatedDelivery": "",
            "statusHistory": status_history,
            "createdAt": entry_date,
            "updatedAt": delivery_date or finish_date or entry_date,
        })

    results.sort(key=lambda o: o["createdAt"] or "")
    return results


def main():
    OUTPUT_DIR.mkdir(exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    raw_clients = load_bucket(cur, "clients")
    raw_equipment = load_bucket(cur, "equipment")
    raw_services = load_bucket(cur, "services")
    raw_products = load_bucket(cur, "products")
    conn.close()

    clients = migrate_clients(raw_clients)
    inventory = migrate_products(raw_products)
    orders = migrate_orders(raw_services, raw_equipment, raw_clients, raw_products)

    with open(OUTPUT_DIR / "clients.json", "w", encoding="utf-8") as f:
        json.dump(clients, f, ensure_ascii=False, indent=2)

    with open(OUTPUT_DIR / "inventory.json", "w", encoding="utf-8") as f:
        json.dump(inventory, f, ensure_ascii=False, indent=2)

    with open(OUTPUT_DIR / "orders.json", "w", encoding="utf-8") as f:
        json.dump(orders, f, ensure_ascii=False, indent=2)

    print("Migracion completada:")
    print(f"  Clientes:   {len(clients)} -> migrated_data/clients.json")
    print(f"  Repuestos:  {len(inventory)} -> migrated_data/inventory.json")
    print(f"  Ordenes:    {len(orders)} -> migrated_data/orders.json")

    status_counts = {}
    for o in orders:
        status_counts[o["status"]] = status_counts.get(o["status"], 0) + 1
    print(f"\n  Ordenes por estado:")
    for st, cnt in sorted(status_counts.items(), key=lambda x: -x[1]):
        print(f"    {st}: {cnt}")


if __name__ == "__main__":
    main()
