const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'crm.db');
const db = new Database(dbPath);

// Enable WAL mode and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    phone2 TEXT DEFAULT '',
    documentId TEXT DEFAULT '',
    provincia TEXT DEFAULT '',
    localidad TEXT DEFAULT '',
    address TEXT DEFAULT '',
    comments TEXT DEFAULT '',
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    clientId TEXT,
    clientName TEXT DEFAULT '',
    clientPhone TEXT DEFAULT '',
    deviceType TEXT DEFAULT '',
    brand TEXT DEFAULT '',
    model TEXT DEFAULT '',
    serialNumber TEXT DEFAULT '',
    description TEXT DEFAULT '',
    reportedProblem TEXT DEFAULT '',
    plannedWork TEXT DEFAULT '',
    diagnosticNotes TEXT DEFAULT '',
    devicePassword TEXT DEFAULT '',
    devicePattern TEXT DEFAULT '',
    priority TEXT DEFAULT 'Media',
    status TEXT DEFAULT 'Ingresado',
    assignedTechnician TEXT DEFAULT '',
    laborCost REAL DEFAULT 0,
    totalCost REAL DEFAULT 0,
    estimatedDelivery TEXT DEFAULT '',
    cancellationReason TEXT DEFAULT '',
    createdAt TEXT NOT NULL,
    updatedAt TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS order_parts (
    id TEXT NOT NULL,
    orderId TEXT NOT NULL,
    name TEXT DEFAULT '',
    price REAL DEFAULT 0,
    costPrice REAL DEFAULT 0,
    quantity INTEGER DEFAULT 1,
    PRIMARY KEY (orderId, id),
    FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS order_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderId TEXT NOT NULL,
    status TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    name TEXT DEFAULT '',
    sku TEXT DEFAULT '',
    price REAL DEFAULT 0,
    costPrice REAL DEFAULT 0,
    finalPrice REAL DEFAULT 0,
    marginPercent REAL DEFAULT 35,
    stock INTEGER DEFAULT 0,
    minStock INTEGER DEFAULT 0,
    category TEXT DEFAULT 'Otro',
    iva TEXT DEFAULT '21.0%',
    currency TEXT DEFAULT 'ARS',
    pricingType TEXT DEFAULT 'manual',
    compatibleDevices TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS technicians (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    phone2 TEXT DEFAULT '',
    documentId TEXT DEFAULT '',
    provincia TEXT DEFAULT '',
    localidad TEXT DEFAULT '',
    address TEXT DEFAULT '',
    comments TEXT DEFAULT '',
    category TEXT DEFAULT 'Taller',
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    clientId TEXT DEFAULT '',
    clientName TEXT DEFAULT '',
    clientPhone TEXT DEFAULT '',
    deviceType TEXT DEFAULT '',
    brand TEXT DEFAULT '',
    model TEXT DEFAULT '',
    serialNumber TEXT DEFAULT '',
    status TEXT DEFAULT 'Borrador',
    notes TEXT DEFAULT '',
    totalCost REAL DEFAULT 0,
    validUntil TEXT DEFAULT '',
    type TEXT DEFAULT 'simple',
    orderId TEXT DEFAULT '',
    convertedToOrderId TEXT DEFAULT '',
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS budget_items (
    id TEXT NOT NULL,
    budgetId TEXT NOT NULL,
    name TEXT DEFAULT '',
    type TEXT DEFAULT 'repuesto',
    price REAL DEFAULT 0,
    quantity INTEGER DEFAULT 1,
    PRIMARY KEY (budgetId, id),
    FOREIGN KEY (budgetId) REFERENCES budgets(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT DEFAULT '',
    role TEXT DEFAULT 'reader',
    tenantId TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    authMethod TEXT DEFAULT 'credentials',
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT DEFAULT ''
  );
`);

// Migrations for existing databases
const columns = db.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
if (!columns.includes('paymentStatus')) {
  db.exec("ALTER TABLE orders ADD COLUMN paymentStatus TEXT DEFAULT 'Pendiente'");
}
if (!columns.includes('amountPaid')) {
  db.exec("ALTER TABLE orders ADD COLUMN amountPaid REAL DEFAULT 0");
}

// Helper functions
function getAll(table) {
  return db.prepare(`SELECT * FROM ${table}`).all();
}

function getById(table, id) {
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
}

function insert(table, data) {
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  const columns = keys.join(', ');
  const values = keys.map(k => data[k] !== undefined && data[k] !== null ? data[k] : '');
  const stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (${columns}) VALUES (${placeholders})`);
  return stmt.run(...values);
}

function update(table, id, data) {
  const keys = Object.keys(data).filter(k => k !== 'id');
  if (keys.length === 0) return;
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => data[k] !== undefined && data[k] !== null ? data[k] : '');
  const stmt = db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`);
  return stmt.run(...values, id);
}

function remove(table, id) {
  return db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
}

module.exports = { db, getAll, getById, insert, update, remove };
