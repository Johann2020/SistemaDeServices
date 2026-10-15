const express = require('express');
const router = express.Router();
const { getAll, getById, insert, update, remove } = require('../tenantDb.cjs');
const crypto = require('crypto');

router.get('/', (req, res) => {
  try {
    const types = getAll(req.db, 'device_types');
    res.json(types);
  } catch (err) {
    console.error('Error al obtener tipos de dispositivo:', err.message);
    res.status(500).json({ error: 'Error al obtener tipos de dispositivo' });
  }
});

router.post('/', (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = crypto.randomUUID();
    if (!data.createdAt) data.createdAt = new Date().toISOString();
    if (data.active === undefined) data.active = 1;
    insert(req.db, 'device_types', data);
    const dt = getById(req.db, 'device_types', data.id);
    res.status(201).json(dt);
  } catch (err) {
    console.error('Error al crear tipo de dispositivo:', err.message);
    res.status(500).json({ error: 'Error al crear tipo de dispositivo' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = getById(req.db, 'device_types', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tipo no encontrado' });
    update(req.db, 'device_types', req.params.id, req.body);
    const dt = getById(req.db, 'device_types', req.params.id);
    res.json(dt);
  } catch (err) {
    console.error('Error al actualizar tipo de dispositivo:', err.message);
    res.status(500).json({ error: 'Error al actualizar tipo de dispositivo' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = getById(req.db, 'device_types', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tipo no encontrado' });
    remove(req.db, 'device_types', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error al eliminar tipo de dispositivo:', err.message);
    res.status(500).json({ error: 'Error al eliminar tipo de dispositivo' });
  }
});

module.exports = router;
