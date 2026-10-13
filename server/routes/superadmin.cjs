const express = require('express');
const router = express.Router();
const { masterDb } = require('../masterDb.cjs');
const { getTenantDb } = require('../tenantDb.cjs');
const { generateToken } = require('../auth.cjs');

// Only the designated superadmin can access these routes.
// The email is checked server-side on every request.
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'gelrothjohann@gmail.com';

function superadminGuard(req, res, next) {
  if (req.user.email !== SUPERADMIN_EMAIL) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
}

router.use(superadminGuard);

router.get('/accounts', (req, res) => {
  try {
    const accounts = masterDb.prepare(
      'SELECT id, email, name, picture, tenantId, role, createdAt FROM accounts ORDER BY createdAt DESC'
    ).all();

    const result = accounts.map(acc => {
      const stats = { clients: 0, orders: 0, inventory: 0, technicians: 0, budgets: 0 };
      try {
        const db = getTenantDb(acc.tenantId);
        stats.clients = db.prepare('SELECT COUNT(*) as c FROM clients').get().c;
        stats.orders = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
        stats.inventory = db.prepare('SELECT COUNT(*) as c FROM inventory').get().c;
        stats.technicians = db.prepare('SELECT COUNT(*) as c FROM technicians').get().c;
        stats.budgets = db.prepare('SELECT COUNT(*) as c FROM budgets').get().c;
      } catch (_) {}

      const loginStats = { total: 0, today: 0, last7: 0, last30: 0, lastLogin: null };
      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
        const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

        loginStats.total = masterDb.prepare(
          'SELECT COUNT(*) as c FROM login_events WHERE accountId = ?'
        ).get(acc.id).c;
        loginStats.today = masterDb.prepare(
          'SELECT COUNT(*) as c FROM login_events WHERE accountId = ? AND timestamp >= ?'
        ).get(acc.id, todayStart).c;
        loginStats.last7 = masterDb.prepare(
          'SELECT COUNT(*) as c FROM login_events WHERE accountId = ? AND timestamp >= ?'
        ).get(acc.id, weekAgo).c;
        loginStats.last30 = masterDb.prepare(
          'SELECT COUNT(*) as c FROM login_events WHERE accountId = ? AND timestamp >= ?'
        ).get(acc.id, monthAgo).c;
        const lastRow = masterDb.prepare(
          'SELECT timestamp FROM login_events WHERE accountId = ? ORDER BY timestamp DESC LIMIT 1'
        ).get(acc.id);
        loginStats.lastLogin = lastRow ? lastRow.timestamp : null;
      } catch (_) {}

      return { ...acc, stats, loginStats };
    });

    res.json(result);
  } catch (err) {
    console.error('Superadmin accounts error:', err.message);
    res.status(500).json({ error: 'Error al obtener cuentas' });
  }
});

router.get('/accounts/:accountId/logins', (req, res) => {
  try {
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const rows = masterDb.prepare(
      `SELECT DATE(timestamp) as day, COUNT(*) as count
       FROM login_events WHERE accountId = ? AND timestamp >= ?
       GROUP BY DATE(timestamp) ORDER BY day`
    ).all(req.params.accountId, monthAgo);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener logins' });
  }
});

// Switch session to view a specific tenant's CRM.
// This is an admin-only feature: the superadmin guard above
// ensures only the designated admin email can call it.
router.post('/switch-tenant/:accountId', (req, res) => {
  try {
    const target = masterDb.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.accountId);
    if (!target) return res.status(404).json({ error: 'Cuenta no encontrada' });

    const token = generateToken({
      id: target.id,
      email: target.email,
      tenantId: target.tenantId,
      role: target.role,
    });

    res.cookie('crm_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: target.id,
        email: target.email,
        name: target.name,
        picture: target.picture,
        tenantId: target.tenantId,
        role: target.role,
      },
    });
  } catch (err) {
    console.error('Switch tenant error:', err.message);
    res.status(500).json({ error: 'Error al cambiar tenant' });
  }
});

// Return to superadmin's own session
router.post('/return-to-admin', (req, res) => {
  try {
    const admin = masterDb.prepare('SELECT * FROM accounts WHERE email = ?').get(SUPERADMIN_EMAIL);
    if (!admin) return res.status(404).json({ error: 'Cuenta admin no encontrada' });

    const token = generateToken(admin);
    res.cookie('crm_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        picture: admin.picture,
        tenantId: admin.tenantId,
        role: admin.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al retornar' });
  }
});

module.exports = router;
