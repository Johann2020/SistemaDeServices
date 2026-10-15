const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const crypto = require('crypto');
const { dataDir } = require('./masterDb.cjs');

const SCHEMA_SQL = `
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
    workPerformed TEXT DEFAULT '',
    devicePassword TEXT DEFAULT '',
    devicePattern TEXT DEFAULT '',
    priority TEXT DEFAULT 'Media',
    status TEXT DEFAULT 'Ingresado',
    assignedTechnician TEXT DEFAULT '',
    technicianId TEXT DEFAULT '',
    deviceTypeId TEXT DEFAULT '',
    laborCost REAL DEFAULT 0,
    totalCost REAL DEFAULT 0,
    estimatedDelivery TEXT DEFAULT '',
    cancellationReason TEXT DEFAULT '',
    paymentStatus TEXT DEFAULT 'Pendiente',
    amountPaid REAL DEFAULT 0,
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

  CREATE TABLE IF NOT EXISTS order_labor_items (
    id TEXT NOT NULL,
    orderId TEXT NOT NULL,
    name TEXT DEFAULT '',
    price REAL DEFAULT 0,
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
    deviceTypeId TEXT DEFAULT '',
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

  CREATE TABLE IF NOT EXISTS device_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    sortOrder INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_orders_clientId ON orders(clientId);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_order_status_history_orderId ON order_status_history(orderId);
  CREATE INDEX IF NOT EXISTS idx_budgets_clientId ON budgets(clientId);
`;

const dbCache = new Map();

function getTenantDb(tenantId) {
  if (dbCache.has(tenantId)) return dbCache.get(tenantId);

  const tenantDir = path.join(dataDir, 'tenants');
  fs.mkdirSync(tenantDir, { recursive: true });

  const dbPath = path.join(tenantDir, `${tenantId}.db`);
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);

  // Run migrations for existing tenant DBs
  const columns = db.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
  if (!columns.includes('paymentStatus')) {
    db.exec("ALTER TABLE orders ADD COLUMN paymentStatus TEXT DEFAULT 'Pendiente'");
  }
  if (!columns.includes('amountPaid')) {
    db.exec("ALTER TABLE orders ADD COLUMN amountPaid REAL DEFAULT 0");
  }
  if (!columns.includes('workPerformed')) {
    db.exec("ALTER TABLE orders ADD COLUMN workPerformed TEXT DEFAULT ''");
  }

  // Migrate 'Teléfono' → 'Celular' (duplicate category removed)
  db.exec("UPDATE orders SET deviceType = 'Celular' WHERE deviceType = 'Teléfono'");
  db.exec("UPDATE budgets SET deviceType = 'Celular' WHERE deviceType = 'Teléfono'");

  // Clean removed categories from persisted device-type settings
  const removedTypes = ['Teléfono', 'Otro'];
  for (const settingKey of ['allDeviceTypes', 'activeDeviceTypes']) {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(settingKey);
    if (row) {
      try {
        const arr = JSON.parse(row.value);
        const cleaned = arr.filter(t => !removedTypes.includes(t));
        if (cleaned.length !== arr.length) {
          db.prepare("UPDATE settings SET value = ? WHERE key = ?").run(JSON.stringify(cleaned), settingKey);
        }
      } catch (_) {}
    }
  }

  // Add normalization columns
  if (!columns.includes('technicianId')) {
    db.exec("ALTER TABLE orders ADD COLUMN technicianId TEXT DEFAULT ''");
  }
  if (!columns.includes('deviceTypeId')) {
    db.exec("ALTER TABLE orders ADD COLUMN deviceTypeId TEXT DEFAULT ''");
  }

  const budgetCols = db.prepare("PRAGMA table_info(budgets)").all().map(c => c.name);
  if (!budgetCols.includes('deviceTypeId')) {
    db.exec("ALTER TABLE budgets ADD COLUMN deviceTypeId TEXT DEFAULT ''");
  }

  db.exec("CREATE INDEX IF NOT EXISTS idx_orders_technicianId ON orders(technicianId)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_orders_deviceTypeId ON orders(deviceTypeId)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_budgets_deviceTypeId ON budgets(deviceTypeId)");

  const laborCols = db.prepare("PRAGMA table_info(order_labor_items)").all().map(c => c.name);
  if (!laborCols.includes('quantity')) {
    db.exec("ALTER TABLE order_labor_items ADD COLUMN quantity INTEGER DEFAULT 1");
  }

  // Populate device_types table from settings
  const dtCount = db.prepare('SELECT COUNT(*) as cnt FROM device_types').get();
  if (dtCount.cnt === 0) {
    const DEFAULTS = [
      'Notebook', 'Celular', 'Tablet', 'CPU / PC Desktop',
      'Televisor / Monitor', 'Impresora', 'Consola de Videojuegos',
      'Smartwatch', 'Radio / Equipo de Audio', 'Microondas / Horno',
      'Lavarropas / Secarropas', 'Aire Acondicionado / Ventilador',
      'Cafetera', 'Licuadora / Procesadora', 'Cámara Fotográfica'
    ];
    let allTypes = [...DEFAULTS];
    let activeTypes = [...DEFAULTS];
    const allSetting = db.prepare("SELECT value FROM settings WHERE key = 'allDeviceTypes'").get();
    if (allSetting) {
      try { allTypes = [...new Set([...DEFAULTS, ...JSON.parse(allSetting.value)])]; } catch (_) {}
    }
    const activeSetting = db.prepare("SELECT value FROM settings WHERE key = 'activeDeviceTypes'").get();
    if (activeSetting) {
      try { activeTypes = JSON.parse(activeSetting.value); } catch (_) {}
    }
    const insertDT = db.prepare('INSERT OR IGNORE INTO device_types (id, name, active, sortOrder) VALUES (?, ?, ?, ?)');
    allTypes.forEach((name, idx) => {
      insertDT.run(crypto.randomUUID(), name, activeTypes.includes(name) ? 1 : 0, idx);
    });
  }

  // Populate technicianId on orders from assignedTechnician name
  const techList = db.prepare('SELECT id, name FROM technicians').all();
  if (techList.length > 0) {
    const techByName = {};
    for (const t of techList) techByName[t.name] = t.id;
    const ordersNoTech = db.prepare("SELECT id, assignedTechnician FROM orders WHERE (technicianId IS NULL OR technicianId = '') AND assignedTechnician != ''").all();
    if (ordersNoTech.length > 0) {
      const updTech = db.prepare('UPDATE orders SET technicianId = ? WHERE id = ?');
      for (const o of ordersNoTech) {
        const tid = techByName[o.assignedTechnician];
        if (tid) updTech.run(tid, o.id);
      }
    }
  }

  // Populate deviceTypeId on orders and budgets from deviceType name
  const dtList = db.prepare('SELECT id, name FROM device_types').all();
  if (dtList.length > 0) {
    const dtByName = {};
    for (const dt of dtList) dtByName[dt.name] = dt.id;
    const ordersNoDT = db.prepare("SELECT id, deviceType FROM orders WHERE (deviceTypeId IS NULL OR deviceTypeId = '') AND deviceType != ''").all();
    if (ordersNoDT.length > 0) {
      const updODT = db.prepare('UPDATE orders SET deviceTypeId = ? WHERE id = ?');
      for (const o of ordersNoDT) {
        const dtid = dtByName[o.deviceType];
        if (dtid) updODT.run(dtid, o.id);
      }
    }
    const budgetsNoDT = db.prepare("SELECT id, deviceType FROM budgets WHERE (deviceTypeId IS NULL OR deviceTypeId = '') AND deviceType != ''").all();
    if (budgetsNoDT.length > 0) {
      const updBDT = db.prepare('UPDATE budgets SET deviceTypeId = ? WHERE id = ?');
      for (const b of budgetsNoDT) {
        const dtid = dtByName[b.deviceType];
        if (dtid) updBDT.run(dtid, b.id);
      }
    }
  }

  // Migrate legacy workPerformed → diagnosticNotes for orders without laborItems
  const legacyOrders = db.prepare(
    `SELECT id, diagnosticNotes, workPerformed FROM orders
     WHERE workPerformed != '' AND workPerformed IS NOT NULL
       AND id NOT IN (SELECT DISTINCT orderId FROM order_labor_items)`
  ).all();
  if (legacyOrders.length > 0) {
    const upd = db.prepare('UPDATE orders SET diagnosticNotes = ?, workPerformed = ? WHERE id = ?');
    for (const o of legacyOrders) {
      const merged = o.diagnosticNotes
        ? o.diagnosticNotes + '\n\nTrabajos realizados:\n' + o.workPerformed
        : 'Trabajos realizados:\n' + o.workPerformed;
      upd.run(merged, '', o.id);
    }
  }

  // Force WAL checkpoint to persist data into the main .db file
  try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (_) {}

  dbCache.set(tenantId, db);
  return db;
}

function getAll(db, table) {
  assertTable(table);
  return db.prepare(`SELECT * FROM ${table}`).all();
}

function getById(db, table, id) {
  assertTable(table);
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
}

const VALID_TABLES = new Set([
  'clients', 'orders', 'order_parts', 'order_labor_items', 'order_status_history',
  'inventory', 'technicians', 'budgets', 'budget_items',
  'users', 'settings', 'device_types',
]);

function assertTable(table) {
  if (!VALID_TABLES.has(table)) throw new Error(`Invalid table: ${table}`);
}

const VALID_COL = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function sanitizeKeys(data) {
  const clean = {};
  for (const k of Object.keys(data)) {
    if (VALID_COL.test(k)) clean[k] = data[k];
  }
  return clean;
}

function insert(db, table, data) {
  assertTable(table);
  const safe = sanitizeKeys(data);
  const keys = Object.keys(safe);
  if (keys.length === 0) return;
  const placeholders = keys.map(() => '?').join(', ');
  const cols = keys.join(', ');
  const values = keys.map(k => safe[k] !== undefined && safe[k] !== null ? safe[k] : '');
  const stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${placeholders})`);
  return stmt.run(...values);
}

function update(db, table, id, data) {
  assertTable(table);
  const safe = sanitizeKeys(data);
  const keys = Object.keys(safe).filter(k => k !== 'id');
  if (keys.length === 0) return;
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => safe[k] !== undefined && safe[k] !== null ? safe[k] : '');
  const stmt = db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`);
  return stmt.run(...values, id);
}

function remove(db, table, id) {
  assertTable(table);
  return db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
}

function checkpointAllDbs() {
  for (const [, db] of dbCache) {
    try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (_) {}
  }
}

function closeAllDbs() {
  for (const [tenantId, db] of dbCache) {
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.close();
    } catch (_) {}
    dbCache.delete(tenantId);
  }
}

module.exports = { getTenantDb, getAll, getById, insert, update, remove, checkpointAllDbs, closeAllDbs };
