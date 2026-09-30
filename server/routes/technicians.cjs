const express = require('express');
const router = express.Router();
const { getAll, getById, insert, update, remove } = require('../tenantDb.cjs');
const crypto = require('crypto');

// GET /api/technicians - list all technicians
router.get('/', (req, res) => {
  try {
    const technicians = getAll(req.db, 'technicians');
    res.json(technicians);
  } catch (err) {
    console.error('Error fetching technicians:', err.message);
    res.status(500).json({ error: 'Error fetching technicians' });
  }
});

// GET /api/technicians/:id - get one technician
router.get('/:id', (req, res) => {
  try {
    const technician = getById(req.db, 'technicians', req.params.id);
    if (!technician) return res.status(404).json({ error: 'Technician not found' });
    res.json(technician);
  } catch (err) {
    console.error('Error fetching technician:', err.message);
    res.status(500).json({ error: 'Error fetching technician' });
  }
});

// POST /api/technicians - create technician
router.post('/', (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = crypto.randomUUID();
    if (!data.createdAt) data.createdAt = new Date().toISOString();
    insert(req.db, 'technicians', data);
    const technician = getById(req.db, 'technicians', data.id);
    res.status(201).json(technician);
  } catch (err) {
    console.error('Error creating technician:', err.message);
    res.status(500).json({ error: 'Error creating technician' });
  }
});

// PUT /api/technicians/:id - update technician
router.put('/:id', (req, res) => {
  try {
    const existing = getById(req.db, 'technicians', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Technician not found' });
    update(req.db, 'technicians', req.params.id, req.body);
    const technician = getById(req.db, 'technicians', req.params.id);
    res.json(technician);
  } catch (err) {
    console.error('Error updating technician:', err.message);
    res.status(500).json({ error: 'Error updating technician' });
  }
});

// DELETE /api/technicians/:id - delete technician
router.delete('/:id', (req, res) => {
  try {
    const existing = getById(req.db, 'technicians', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Technician not found' });
    remove(req.db, 'technicians', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting technician:', err.message);
    res.status(500).json({ error: 'Error deleting technician' });
  }
});

module.exports = router;
