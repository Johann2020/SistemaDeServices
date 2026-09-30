const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const masterDbPath = path.join(dataDir, 'master.db');
const masterDb = new Database(masterDbPath);

masterDb.pragma('journal_mode = WAL');
masterDb.pragma('foreign_keys = ON');

masterDb.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    googleId TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    picture TEXT DEFAULT '',
    tenantId TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'admin',
    createdAt TEXT NOT NULL
  );
`);

function findAccountByGoogleId(googleId) {
  return masterDb.prepare('SELECT * FROM accounts WHERE googleId = ?').get(googleId);
}

function findAccountByEmail(email) {
  return masterDb.prepare('SELECT * FROM accounts WHERE email = ?').get(email);
}

function createAccount(data) {
  const stmt = masterDb.prepare(
    'INSERT INTO accounts (id, googleId, email, name, picture, tenantId, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run(data.id, data.googleId, data.email, data.name, data.picture || '', data.tenantId, data.role || 'admin', data.createdAt);
  return masterDb.prepare('SELECT * FROM accounts WHERE id = ?').get(data.id);
}

module.exports = { masterDb, findAccountByGoogleId, findAccountByEmail, createAccount, dataDir };
