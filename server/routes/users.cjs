const express = require('express');
const router = express.Router();
const { getAll, getById, insert, update, remove } = require('../tenantDb.cjs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const ALLOWED_FIELDS = ['name', 'email', 'password', 'role', 'status', 'authMethod'];

function stripPassword(user) {
  if (!user) return user;
  const { password, ...safe } = user;
  return safe;
}

// GET /api/users - list all users
router.get('/', (req, res) => {
  try {
    const users = getAll(req.db, 'users').map(stripPassword);
    res.json(users);
  } catch (err) {
    console.error('Error al obtener usuarios:', err.message);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// POST /api/users - create user
router.post('/', async (req, res) => {
  try {
    const data = {};
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }
    data.id = req.body.id || crypto.randomUUID();
    data.createdAt = req.body.createdAt || new Date().toISOString();

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    insert(req.db, 'users', data);
    const user = getById(req.db, 'users', data.id);
    res.status(201).json(stripPassword(user));
  } catch (err) {
    console.error('Error al crear usuario:', err.message);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// PUT /api/users/:id - update user
router.put('/:id', async (req, res) => {
  try {
    const existing = getById(req.db, 'users', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Usuario no encontrado' });

    const data = {};
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    update(req.db, 'users', req.params.id, data);
    const user = getById(req.db, 'users', req.params.id);
    res.json(stripPassword(user));
  } catch (err) {
    console.error('Error al actualizar usuario:', err.message);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// DELETE /api/users/:id - delete user
router.delete('/:id', (req, res) => {
  try {
    const existing = getById(req.db, 'users', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Usuario no encontrado' });
    remove(req.db, 'users', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error al eliminar usuario:', err.message);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// POST /api/users/login - find by email and check password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ error: 'El email es requerido' });

    const user = req.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    if (user.password) {
      const isOldPlaintext = !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$');
      if (isOldPlaintext) {
        if (user.password !== password) {
          return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        const hashed = await bcrypt.hash(password, 10);
        req.db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, user.id);
      } else {
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Credenciales inválidas' });
      }
    }

    res.json(stripPassword(user));
  } catch (err) {
    console.error('Error en login:', err.message);
    res.status(500).json({ error: 'Error en login' });
  }
});

module.exports = router;
