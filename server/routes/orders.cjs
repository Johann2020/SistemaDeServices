const express = require('express');
const router = express.Router();
const { getById, insert, update, remove } = require('../tenantDb.cjs');
const crypto = require('crypto');

function getOrderWithRelations(db, orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return null;
  order.partsUsed = db.prepare('SELECT * FROM order_parts WHERE orderId = ?').all(orderId);
  order.statusHistory = db.prepare('SELECT status, timestamp FROM order_status_history WHERE orderId = ? ORDER BY id').all(orderId);
  order.laborCost = order.laborCost || 0;
  order.totalCost = order.totalCost || 0;
  order.paymentStatus = order.paymentStatus || 'Pendiente';
  order.amountPaid = order.amountPaid || 0;
  return order;
}

function getAllOrdersWithRelations(db) {
  const orders = db.prepare('SELECT * FROM orders').all();
  for (const order of orders) {
    order.partsUsed = db.prepare('SELECT * FROM order_parts WHERE orderId = ?').all(order.id);
    order.statusHistory = db.prepare('SELECT status, timestamp FROM order_status_history WHERE orderId = ? ORDER BY id').all(order.id);
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
    console.error('Error fetching orders:', err.message);
    res.status(500).json({ error: 'Error fetching orders' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const order = getOrderWithRelations(req.db, req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error('Error fetching order:', err.message);
    res.status(500).json({ error: 'Error fetching order' });
  }
});

router.post('/', (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = crypto.randomUUID();
    if (!data.createdAt) data.createdAt = new Date().toISOString();

    const partsUsed = data.partsUsed || [];
    const statusHistory = data.statusHistory || [];
    delete data.partsUsed;
    delete data.statusHistory;

    const createOrder = req.db.transaction(() => {
      insert(req.db, 'orders', data);
      for (const part of partsUsed) {
        if (!part.id) part.id = crypto.randomUUID();
        req.db.prepare(
          'INSERT INTO order_parts (id, orderId, name, price, costPrice, quantity) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(part.id, data.id, part.name || '', part.price || 0, part.costPrice || 0, part.quantity || 1);
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
    console.error('Error creating order:', err.message);
    res.status(500).json({ error: 'Error creating order' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = req.db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    const data = req.body;
    const partsUsed = data.partsUsed;
    const statusHistory = data.statusHistory;
    delete data.partsUsed;
    delete data.statusHistory;

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
    console.error('Error updating order:', err.message);
    res.status(500).json({ error: 'Error updating order' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = req.db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Order not found' });
    remove(req.db, 'orders', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting order:', err.message);
    res.status(500).json({ error: 'Error deleting order' });
  }
});

router.patch('/:id/status', (req, res) => {
  try {
    const existing = req.db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });

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
    console.error('Error updating order status:', err.message);
    res.status(500).json({ error: 'Error updating order status' });
  }
});

module.exports = router;
