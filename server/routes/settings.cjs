const express = require('express');
const router = express.Router();
// Multi-tenant: uses req.db injected by middleware

// GET /api/settings - get all settings as key-value object
router.get('/', (req, res) => {
  try {
    const rows = req.db.prepare('SELECT * FROM settings').all();
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings:', err.message);
    res.status(500).json({ error: 'Error fetching settings' });
  }
});

// GET /api/settings/:key - get one setting
router.get('/:key', (req, res) => {
  try {
    const row = req.db.prepare('SELECT * FROM settings WHERE key = ?').get(req.params.key);
    if (!row) return res.status(404).json({ error: 'Setting not found' });
    res.json({ key: row.key, value: row.value });
  } catch (err) {
    console.error('Error fetching setting:', err.message);
    res.status(500).json({ error: 'Error fetching setting' });
  }
});

// PUT /api/settings/:key - set one setting
router.put('/:key', (req, res) => {
  try {
    const { value } = req.body;
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    req.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(req.params.key, valueStr);
    res.json({ key: req.params.key, value: valueStr });
  } catch (err) {
    console.error('Error setting value:', err.message);
    res.status(500).json({ error: 'Error setting value' });
  }
});

// PUT /api/settings - bulk set settings
router.put('/', (req, res) => {
  try {
    const data = req.body;
    const upsert = req.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const bulkUpsert = req.db.transaction((entries) => {
      for (const [key, value] of entries) {
        const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
        upsert.run(key, valueStr);
      }
    });
    bulkUpsert(Object.entries(data));
    res.json({ success: true });
  } catch (err) {
    console.error('Error setting values:', err.message);
    res.status(500).json({ error: 'Error setting values' });
  }
});

module.exports = router;
