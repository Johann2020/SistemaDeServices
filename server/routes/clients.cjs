const express = require('express');
const router = express.Router();
const { getAll, getById, insert, update, remove } = require('../tenantDb.cjs');
const crypto = require('crypto');

router.get('/', (req, res) => {
  try {
    res.json(getAll(req.db, 'clients'));
  } catch (err) {
    console.error('Error fetching clients:', err.message);
    res.status(500).json({ error: 'Error fetching clients' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const client = getById(req.db, 'clients', req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) {
    console.error('Error fetching client:', err.message);
    res.status(500).json({ error: 'Error fetching client' });
  }
});

router.post('/', (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = crypto.randomUUID();
    if (!data.createdAt) data.createdAt = new Date().toISOString();
    insert(req.db, 'clients', data);
    const client = getById(req.db, 'clients', data.id);
    res.status(201).json(client);
  } catch (err) {
    console.error('Error creating client:', err.message);
    res.status(500).json({ error: 'Error creating client' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = getById(req.db, 'clients', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Client not found' });
    update(req.db, 'clients', req.params.id, req.body);
    const client = getById(req.db, 'clients', req.params.id);
    res.json(client);
  } catch (err) {
    console.error('Error updating client:', err.message);
    res.status(500).json({ error: 'Error updating client' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = getById(req.db, 'clients', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Client not found' });
    const deleteAll = req.db.transaction(() => {
      req.db.prepare('DELETE FROM orders WHERE clientId = ?').run(req.params.id);
      remove(req.db, 'clients', req.params.id);
    });
    deleteAll();
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting client:', err.message);
    res.status(500).json({ error: 'Error deleting client' });
  }
});

module.exports = router;
