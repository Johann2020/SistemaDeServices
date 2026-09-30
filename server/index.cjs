const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const crypto = require('crypto');
const { authMiddleware, generateToken, exchangeGoogleCode, findOrCreateFromGoogle } = require('./auth.cjs');
const { getTenantDb, insert } = require('./tenantDb.cjs');
const { findAccountByEmail } = require('./masterDb.cjs');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));

// --- Auth routes (no tenant DB needed) ---

// Return Google Client ID to frontend
app.get('/api/auth/config', (req, res) => {
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID || '' });
});

// Google OAuth callback - exchange code for user info, create/find account, set JWT cookie
app.post('/api/auth/google', async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });

    const profile = await exchangeGoogleCode(code, redirectUri);
    const account = findOrCreateFromGoogle(profile);
    const token = generateToken(account);

    res.cookie('crm_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      user: {
        id: account.id,
        email: account.email,
        name: account.name,
        picture: account.picture,
        tenantId: account.tenantId,
        role: account.role,
      },
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ error: 'Error de autenticación con Google: ' + err.message });
  }
});

// Get current session
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const account = findAccountByEmail(req.user.email);
  if (!account) return res.status(401).json({ error: 'Cuenta no encontrada' });
  res.json({
    user: {
      id: account.id,
      email: account.email,
      name: account.name,
      picture: account.picture,
      tenantId: account.tenantId,
      role: account.role,
    },
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('crm_token');
  res.json({ success: true });
});

// --- Tenant-scoped API routes ---
// Middleware: authenticate + inject tenant DB into req.db
app.use('/api', authMiddleware, (req, res, next) => {
  // Skip auth routes that were already handled above
  if (req.path.startsWith('/auth/')) return next();
  try {
    req.db = getTenantDb(req.tenantId);
    next();
  } catch (err) {
    console.error('Tenant DB error:', err.message);
    res.status(500).json({ error: 'Error de base de datos' });
  }
});

app.use('/api/clients', require('./routes/clients.cjs'));
app.use('/api/orders', require('./routes/orders.cjs'));
app.use('/api/inventory', require('./routes/inventory.cjs'));
app.use('/api/technicians', require('./routes/technicians.cjs'));
app.use('/api/budgets', require('./routes/budgets.cjs'));
app.use('/api/users', require('./routes/users.cjs'));
app.use('/api/settings', require('./routes/settings.cjs'));

// Migration endpoint
app.post('/api/migrate', (req, res) => {
  try {
    const db = req.db;
    const { clients, orders, inventory, technicians, budgets, users, settings } = req.body;

    const migrate = db.transaction(() => {
      db.prepare('DELETE FROM order_parts').run();
      db.prepare('DELETE FROM order_status_history').run();
      db.prepare('DELETE FROM budget_items').run();
      db.prepare('DELETE FROM orders').run();
      db.prepare('DELETE FROM clients').run();
      db.prepare('DELETE FROM inventory').run();
      db.prepare('DELETE FROM technicians').run();
      db.prepare('DELETE FROM budgets').run();
      db.prepare('DELETE FROM users').run();
      db.prepare('DELETE FROM settings').run();

      if (Array.isArray(clients)) {
        for (const client of clients) {
          if (!client.id) client.id = crypto.randomUUID();
          if (!client.createdAt) client.createdAt = new Date().toISOString();
          insert(db, 'clients', {
            id: client.id, name: client.name || '', phone: client.phone || '',
            phone2: client.phone2 || '', documentId: client.documentId || '',
            provincia: client.provincia || '', localidad: client.localidad || '',
            address: client.address || '', comments: client.comments || '',
            createdAt: client.createdAt
          });
        }
      }

      if (Array.isArray(orders)) {
        for (const order of orders) {
          if (!order.id) order.id = crypto.randomUUID();
          if (!order.createdAt) order.createdAt = new Date().toISOString();
          const partsUsed = order.partsUsed || [];
          const statusHistory = order.statusHistory || [];
          insert(db, 'orders', {
            id: order.id, clientId: order.clientId || '', clientName: order.clientName || '',
            clientPhone: order.clientPhone || '', deviceType: order.deviceType || '',
            brand: order.brand || '', model: order.model || '', serialNumber: order.serialNumber || '',
            description: order.description || '', reportedProblem: order.reportedProblem || '',
            plannedWork: order.plannedWork || '', diagnosticNotes: order.diagnosticNotes || '', workPerformed: order.workPerformed || '',
            devicePassword: order.devicePassword || '', devicePattern: order.devicePattern || '',
            priority: order.priority || 'Media', status: order.status || 'Ingresado',
            assignedTechnician: order.assignedTechnician || '', laborCost: order.laborCost || 0,
            totalCost: order.totalCost || 0, estimatedDelivery: order.estimatedDelivery || '',
            cancellationReason: order.cancellationReason || '', createdAt: order.createdAt,
            updatedAt: order.updatedAt || ''
          });
          for (const part of partsUsed) {
            if (!part.id) part.id = crypto.randomUUID();
            db.prepare('INSERT INTO order_parts (id, orderId, name, price, costPrice, quantity) VALUES (?, ?, ?, ?, ?, ?)')
              .run(part.id, order.id, part.name || '', part.price || 0, part.costPrice || 0, part.quantity || 1);
          }
          for (const entry of statusHistory) {
            db.prepare('INSERT INTO order_status_history (orderId, status, timestamp) VALUES (?, ?, ?)')
              .run(order.id, entry.status, entry.timestamp || new Date().toISOString());
          }
        }
      }

      if (Array.isArray(inventory)) {
        for (const item of inventory) {
          if (!item.id) item.id = crypto.randomUUID();
          insert(db, 'inventory', {
            id: item.id, name: item.name || '', sku: item.sku || '', price: item.price || 0,
            costPrice: item.costPrice || 0, finalPrice: item.finalPrice || 0,
            marginPercent: item.marginPercent != null ? item.marginPercent : 35,
            stock: item.stock || 0, minStock: item.minStock || 0, category: item.category || 'Otro',
            iva: item.iva || '21.0%', currency: item.currency || 'ARS',
            pricingType: item.pricingType || 'manual', compatibleDevices: item.compatibleDevices || ''
          });
        }
      }

      if (Array.isArray(technicians)) {
        for (const tech of technicians) {
          if (!tech.id) tech.id = crypto.randomUUID();
          if (!tech.createdAt) tech.createdAt = new Date().toISOString();
          insert(db, 'technicians', {
            id: tech.id, name: tech.name || '', phone: tech.phone || '', phone2: tech.phone2 || '',
            documentId: tech.documentId || '', provincia: tech.provincia || '',
            localidad: tech.localidad || '', address: tech.address || '', comments: tech.comments || '',
            category: tech.category || 'Taller', createdAt: tech.createdAt
          });
        }
      }

      if (Array.isArray(budgets)) {
        for (const budget of budgets) {
          if (!budget.id) budget.id = crypto.randomUUID();
          if (!budget.createdAt) budget.createdAt = new Date().toISOString();
          const items = budget.items || [];
          insert(db, 'budgets', {
            id: budget.id, clientId: budget.clientId || '', clientName: budget.clientName || '',
            clientPhone: budget.clientPhone || '', deviceType: budget.deviceType || '',
            brand: budget.brand || '', model: budget.model || '', serialNumber: budget.serialNumber || '',
            status: budget.status || 'Borrador', notes: budget.notes || '', totalCost: budget.totalCost || 0,
            validUntil: budget.validUntil || '', type: budget.type || 'simple',
            orderId: budget.orderId || '', convertedToOrderId: budget.convertedToOrderId || '',
            createdAt: budget.createdAt
          });
          for (const item of items) {
            if (!item.id) item.id = crypto.randomUUID();
            db.prepare('INSERT INTO budget_items (id, budgetId, name, type, price, quantity) VALUES (?, ?, ?, ?, ?, ?)')
              .run(item.id, budget.id, item.name || '', item.type || 'repuesto', item.price || 0, item.quantity || 1);
          }
        }
      }

      if (Array.isArray(users)) {
        for (const user of users) {
          if (!user.id) user.id = crypto.randomUUID();
          if (!user.createdAt) user.createdAt = new Date().toISOString();
          insert(db, 'users', {
            id: user.id, name: user.name || '', email: user.email || '',
            password: user.password || '', role: user.role || 'reader',
            tenantId: user.tenantId || '', status: user.status || 'pending',
            authMethod: user.authMethod || 'credentials', createdAt: user.createdAt
          });
        }
      }

      if (settings && typeof settings === 'object') {
        const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        for (const [key, value] of Object.entries(settings)) {
          upsert.run(key, typeof value === 'string' ? value : JSON.stringify(value));
        }
      }
    });

    migrate();
    res.json({ success: true });
  } catch (err) {
    console.error('Migration error:', err.message);
    res.status(500).json({ error: 'Migration failed: ' + err.message });
  }
});

// Health check (no auth)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Serve frontend static files in production ---
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`CRM Server running on port ${PORT}`);
});
