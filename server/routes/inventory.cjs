const express = require('express');
const router = express.Router();
const { getAll, getById, insert, update, remove } = require('../tenantDb.cjs');
const crypto = require('crypto');

// GET /api/inventory - list all items
router.get('/', (req, res) => {
  try {
    const items = getAll(req.db, 'inventory');
    res.json(items);
  } catch (err) {
    console.error('Error fetching inventory:', err.message);
    res.status(500).json({ error: 'Error fetching inventory' });
  }
});

// GET /api/inventory/:id - get one item
router.get('/:id', (req, res) => {
  try {
    const item = getById(req.db, 'inventory', req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    console.error('Error fetching inventory item:', err.message);
    res.status(500).json({ error: 'Error fetching inventory item' });
  }
});

// POST /api/inventory - create item
router.post('/', (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = crypto.randomUUID();
    insert(req.db, 'inventory', data);
    const item = getById(req.db, 'inventory', data.id);
    res.status(201).json(item);
  } catch (err) {
    console.error('Error creating inventory item:', err.message);
    res.status(500).json({ error: 'Error creating inventory item' });
  }
});

// PUT /api/inventory/:id - update item
router.put('/:id', (req, res) => {
  try {
    const existing = getById(req.db, 'inventory', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Item not found' });
    update(req.db, 'inventory', req.params.id, req.body);
    const item = getById(req.db, 'inventory', req.params.id);
    res.json(item);
  } catch (err) {
    console.error('Error updating inventory item:', err.message);
    res.status(500).json({ error: 'Error updating inventory item' });
  }
});

// DELETE /api/inventory/:id - delete item
router.delete('/:id', (req, res) => {
  try {
    const existing = getById(req.db, 'inventory', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Item not found' });
    remove(req.db, 'inventory', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting inventory item:', err.message);
    res.status(500).json({ error: 'Error deleting inventory item' });
  }
});

module.exports = router;
