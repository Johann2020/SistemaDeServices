const express = require('express');
const router = express.Router();
const { getById, insert, update, remove } = require('../tenantDb.cjs');
const crypto = require('crypto');

function getOrderWithRelations(db, orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return null;
  order.partsUsed = db.prepare('SELECT * FROM order_parts WHERE orderId = ?').all(orderId);
  order.laborItems = db.prepare('SELECT * FROM order_labor_items WHERE orderId = ?').all(orderId);
  order.statusHistory = db.prepare('SELECT status, timestamp FROM order_status_history WHERE orderId = ? ORDER BY id').all(orderId);
  order.laborCost = order.laborCost || 0;
  order.totalCost = order.totalCost || 0;
  order.paymentStatus = order.paymentStatus || 'Pendiente';
  order.amountPaid = order.amountPaid || 0;
  return order;
}

function getAllOrdersWithRelations(db) {
  const orders = db.prepare('SELECT * FROM orders').all();
  if (orders.length === 0) return orders;

  const allParts = db.prepare('SELECT * FROM order_parts').all();
  const allLaborItems = db.prepare('SELECT * FROM order_labor_items').all();
  const allHistory = db.prepare('SELECT orderId, status, timestamp FROM order_status_history ORDER BY id').all();

  const partsMap = {};
  for (const p of allParts) {
    if (!partsMap[p.orderId]) partsMap[p.orderId] = [];
    partsMap[p.orderId].push(p);
  }
  const laborMap = {};
  for (const l of allLaborItems) {
    if (!laborMap[l.orderId]) laborMap[l.orderId] = [];
    laborMap[l.orderId].push(l);
  }
  const historyMap = {};
  for (const h of allHistory) {
    if (!historyMap[h.orderId]) historyMap[h.orderId] = [];
    historyMap[h.orderId].push({ status: h.status, timestamp: h.timestamp });
  }

  for (const order of orders) {
    order.partsUsed = partsMap[order.id] || [];
    order.laborItems = laborMap[order.id] || [];
    order.statusHistory = historyMap[order.id] || [];
    order.laborCost = order.laborCost || 0;
    order.totalCost = order.totalCost || 0;
    order.paymentStatus = order.paymentStatus || 'Pendiente';
    order.amountPaid = order.amountPaid || 0;
  }
  return orders;
}

router.get('/', (req, res) => {
  try {
    res.json(getAllOrdersWithRelations(req.db));
  } catch (err) {
    console.error('Error al obtener órdenes:', err.message);
    res.status(500).json({ error: 'Error al obtener órdenes' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const order = getOrderWithRelations(req.db, req.params.id);
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json(order);
  } catch (err) {
    console.error('Error al obtener orden:', err.message);
    res.status(500).json({ error: 'Error al obtener orden' });
  }
});

router.post('/', (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = crypto.randomUUID();
    if (!data.createdAt) data.createdAt = new Date().toISOString();

    const partsUsed = data.partsUsed || [];
    const laborItems = data.laborItems || [];
    const statusHistory = data.statusHistory || [];
    delete data.partsUsed;
    delete data.laborItems;
    delete data.statusHistory;

    const createOrder = req.db.transaction(() => {
      insert(req.db, 'orders', data);
      for (const part of partsUsed) {
        if (!part.id) part.id = crypto.randomUUID();
        req.db.prepare(
          'INSERT INTO order_parts (id, orderId, name, price, costPrice, quantity) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(part.id, data.id, part.name || '', part.price || 0, part.costPrice || 0, part.quantity || 1);
      }
      for (const item of laborItems) {
        if (!item.id) item.id = crypto.randomUUID();
        req.db.prepare(
          'INSERT INTO order_labor_items (id, orderId, name, price) VALUES (?, ?, ?, ?)'
        ).run(item.id, data.id, item.name || '', item.price || 0);
      }
      if (statusHistory.length > 0) {
        for (const entry of statusHistory) {
          req.db.prepare(
            'INSERT INTO order_status_history (orderId, status, timestamp) VALUES (?, ?, ?)'
          ).run(data.id, entry.status, entry.timestamp || new Date().toISOString());
        }
      } else {
        req.db.prepare(
          'INSERT INTO order_status_history (orderId, status, timestamp) VALUES (?, ?, ?)'
        ).run(data.id, data.status || 'Ingresado', data.createdAt);
      }
    });
    createOrder();

    res.status(201).json(getOrderWithRelations(req.db, data.id));
  } catch (err) {
    console.error('Error al crear orden:', err.message);
    res.status(500).json({ error: 'Error al crear orden' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = req.db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Orden no encontrada' });

    const data = req.body;
    const partsUsed = data.partsUsed;
    const laborItems = data.laborItems;
    const statusHistory = data.statusHistory;
    delete data.partsUsed;
    delete data.laborItems;
    delete data.statusHistory;
    if (!data.updatedAt) data.updatedAt = new Date().toISOString();

    const updateOrder = req.db.transaction(() => {
      if (Object.keys(data).filter(k => k !== 'id').length > 0) {
        update(req.db, 'orders', req.params.id, data);
      }
      if (Array.isArray(partsUsed)) {
        req.db.prepare('DELETE FROM order_parts WHERE orderId = ?').run(req.params.id);
        for (const part of partsUsed) {
          if (!part.id) part.id = crypto.randomUUID();
          req.db.prepare(
            'INSERT INTO order_parts (id, orderId, name, price, costPrice, quantity) VALUES (?, ?, ?, ?, ?, ?)'
          ).run(part.id, req.params.id, part.name || '', part.price || 0, part.costPrice || 0, part.quantity || 1);
        }
      }
      if (Array.isArray(laborItems)) {
        req.db.prepare('DELETE FROM order_labor_items WHERE orderId = ?').run(req.params.id);
        for (const item of laborItems) {
          if (!item.id) item.id = crypto.randomUUID();
          req.db.prepare(
            'INSERT INTO order_labor_items (id, orderId, name, price) VALUES (?, ?, ?, ?)'
          ).run(item.id, req.params.id, item.name || '', item.price || 0);
        }
      }
      if (Array.isArray(statusHistory)) {
        req.db.prepare('DELETE FROM order_status_history WHERE orderId = ?').run(req.params.id);
        for (const entry of statusHistory) {
          req.db.prepare(
            'INSERT INTO order_status_history (orderId, status, timestamp) VALUES (?, ?, ?)'
          ).run(req.params.id, entry.status, entry.timestamp || new Date().toISOString());
        }
      }
    });
    updateOrder();

    res.json(getOrderWithRelations(req.db, req.params.id));
  } catch (err) {
    console.error('Error al actualizar orden:', err.message);
    res.status(500).json({ error: 'Error al actualizar orden' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = req.db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Orden no encontrada' });
    remove(req.db, 'orders', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error al eliminar orden:', err.message);
    res.status(500).json({ error: 'Error al eliminar orden' });
  }
});

router.patch('/:id/status', (req, res) => {
  try {
    const existing = req.db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Orden no encontrada' });

    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'El estado es requerido' });

    const now = new Date().toISOString();
    const updateStatus = req.db.transaction(() => {
      req.db.prepare('UPDATE orders SET status = ?, updatedAt = ? WHERE id = ?').run(status, now, req.params.id);
      req.db.prepare(
        'INSERT INTO order_status_history (orderId, status, timestamp) VALUES (?, ?, ?)'
      ).run(req.params.id, status, now);
    });
    updateStatus();

    res.json(getOrderWithRelations(req.db, req.params.id));
  } catch (err) {
    console.error('Error al actualizar estado de orden:', err.message);
    res.status(500).json({ error: 'Error al actualizar estado de orden' });
  }
});

module.exports = router;
