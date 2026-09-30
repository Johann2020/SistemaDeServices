const express = require('express');
const router = express.Router();
const { getById, insert, update, remove } = require('../tenantDb.cjs');
const crypto = require('crypto');

function getBudgetWithItems(db, budgetId) {
  const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(budgetId);
  if (!budget) return null;
  budget.items = db.prepare('SELECT * FROM budget_items WHERE budgetId = ?').all(budgetId);
  budget.totalCost = budget.totalCost || 0;
  return budget;
}

function getAllBudgetsWithItems(db) {
  const budgets = db.prepare('SELECT * FROM budgets').all();
  for (const budget of budgets) {
    budget.items = db.prepare('SELECT * FROM budget_items WHERE budgetId = ?').all(budget.id);
    budget.totalCost = budget.totalCost || 0;
  }
  return budgets;
}

// GET /api/budgets - list all budgets with items
router.get('/', (req, res) => {
  try {
    const budgets = getAllBudgetsWithItems(req.db);
    res.json(budgets);
  } catch (err) {
    console.error('Error fetching budgets:', err.message);
    res.status(500).json({ error: 'Error fetching budgets' });
  }
});

// GET /api/budgets/:id - get one budget with items
router.get('/:id', (req, res) => {
  try {
    const budget = getBudgetWithItems(req.db, req.params.id);
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    res.json(budget);
  } catch (err) {
    console.error('Error fetching budget:', err.message);
    res.status(500).json({ error: 'Error fetching budget' });
  }
});

// POST /api/budgets - create budget with items
router.post('/', (req, res) => {
  try {
    const data = req.body;
    if (!data.id) data.id = crypto.randomUUID();
    if (!data.createdAt) data.createdAt = new Date().toISOString();

    const items = data.items || [];
    delete data.items;

    const createBudget = req.db.transaction(() => {
      insert(req.db, 'budgets', data);

      for (const item of items) {
        if (!item.id) item.id = crypto.randomUUID();
        req.db.prepare(
          'INSERT INTO budget_items (id, budgetId, name, type, price, quantity) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(item.id, data.id, item.name || '', item.type || 'repuesto', item.price || 0, item.quantity || 1);
      }
    });
    createBudget();

    const budget = getBudgetWithItems(req.db, data.id);
    res.status(201).json(budget);
  } catch (err) {
    console.error('Error creating budget:', err.message);
    res.status(500).json({ error: 'Error creating budget' });
  }
});

// PUT /api/budgets/:id - update budget, optionally replace items
router.put('/:id', (req, res) => {
  try {
    const existing = req.db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Budget not found' });

    const data = req.body;
    const items = data.items;
    delete data.items;

    const updateBudget = req.db.transaction(() => {
      if (Object.keys(data).filter(k => k !== 'id').length > 0) {
        update(req.db, 'budgets', req.params.id, data);
      }

      if (Array.isArray(items)) {
        req.db.prepare('DELETE FROM budget_items WHERE budgetId = ?').run(req.params.id);
        for (const item of items) {
          if (!item.id) item.id = crypto.randomUUID();
          req.db.prepare(
            'INSERT INTO budget_items (id, budgetId, name, type, price, quantity) VALUES (?, ?, ?, ?, ?, ?)'
          ).run(item.id, req.params.id, item.name || '', item.type || 'repuesto', item.price || 0, item.quantity || 1);
        }
      }
    });
    updateBudget();

    const budget = getBudgetWithItems(req.db, req.params.id);
    res.json(budget);
  } catch (err) {
    console.error('Error updating budget:', err.message);
    res.status(500).json({ error: 'Error updating budget' });
  }
});

// DELETE /api/budgets/:id - delete budget (cascade handles items)
router.delete('/:id', (req, res) => {
  try {
    const existing = req.db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Budget not found' });
    remove(req.db, 'budgets', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting budget:', err.message);
    res.status(500).json({ error: 'Error deleting budget' });
  }
});

module.exports = router;
