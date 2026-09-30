const express = require('express');
const router = express.Router();
const { getAll, getById, insert, update, remove } = require('../tenantDb.cjs');
const crypto = require('crypto');

// GET /api/users - list all users
router.get('/', (req, res) => {
  try {
    const users = getAll(req.db, 'users');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err.message);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// POST /api/users - create user
router.post('/', (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = crypto.randomUUID();
    if (!data.createdAt) data.createdAt = new Date().toISOString();
    insert(req.db, 'users', data);
    const user = getById(req.db, 'users', data.id);
    res.status(201).json(user);
  } catch (err) {
    console.error('Error creating user:', err.message);
    res.status(500).json({ error: 'Error creating user' });
  }
});

// PUT /api/users/:id - update user
router.put('/:id', (req, res) => {
  try {
    const existing = getById(req.db, 'users', req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    update(req.db, 'users', req.params.id, req.body);
    const user = getById(req.db, 'users', req.params.id);
    res.json(user);
  } catch (err) {
    console.error('Error updating user:', err.message);
    res.status(500).json({ error: 'Error updating user' });
  }
});

// DELETE /api/users/:id - delete user
router.delete('/:id', (req, res) => {
  try {
    const existing = getById(req.db, 'users', req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    remove(req.db, 'users', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting user:', err.message);
    res.status(500).json({ error: 'Error deleting user' });
  }
});

// POST /api/users/login - find by email and check password
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = req.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.password && user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    console.error('Error during login:', err.message);
    res.status(500).json({ error: 'Error during login' });
  }
});

module.exports = router;
