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
    console.error('Error al obtener técnicos:', err.message);
    res.status(500).json({ error: 'Error al obtener técnicos' });
  }
});

// GET /api/technicians/:id - get one technician
router.get('/:id', (req, res) => {
  try {
    const technician = getById(req.db, 'technicians', req.params.id);
    if (!technician) return res.status(404).json({ error: 'Técnico no encontrado' });
    res.json(technician);
  } catch (err) {
    console.error('Error al obtener técnico:', err.message);
    res.status(500).json({ error: 'Error al obtener técnico' });
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
    console.error('Error al crear técnico:', err.message);
    res.status(500).json({ error: 'Error al crear técnico' });
  }
});

// PUT /api/technicians/:id - update technician
router.put('/:id', (req, res) => {
  try {
    const existing = getById(req.db, 'technicians', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Técnico no encontrado' });
    update(req.db, 'technicians', req.params.id, req.body);
    const technician = getById(req.db, 'technicians', req.params.id);
    res.json(technician);
  } catch (err) {
    console.error('Error al actualizar técnico:', err.message);
    res.status(500).json({ error: 'Error al actualizar técnico' });
  }
});

// DELETE /api/technicians/:id - delete technician
router.delete('/:id', (req, res) => {
  try {
    const existing = getById(req.db, 'technicians', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Técnico no encontrado' });
    remove(req.db, 'technicians', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error al eliminar técnico:', err.message);
    res.status(500).json({ error: 'Error al eliminar técnico' });
  }
});

module.exports = router;
