const express = require('express');
const { randomUUID } = require('crypto');
const uuid = () => randomUUID();
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/institutes  — list all (any authenticated user)
router.get('/', authRequired, (req, res) => {
  const data = db.load();
  res.json({ institutes: data.institutes });
});

// GET /api/institutes/:id
router.get('/:id', authRequired, (req, res) => {
  const data = db.load();
  const inst = data.institutes.find(i => i.id === req.params.id);
  if (!inst) return res.status(404).json({ error: 'Institute not found' });
  res.json({ institute: inst });
});

// POST /api/institutes  — admin/authority only
router.post('/', authRequired, requireRole('admin', 'authority'), (req, res) => {
  const { name, type, district, scheme, address, lat, lng, incharge, contact } = req.body;
  if (!name || !type || !district) {
    return res.status(400).json({ error: 'name, type, district are required' });
  }
  const data = db.load();
  const institute = {
    id: uuid(),
    name,
    type, // e.g. 'NGO', 'Institute', 'Project'
    district,
    scheme: scheme || 'General',
    address: address || '',
    lat: lat ?? null,
    lng: lng ?? null,
    incharge: incharge || '',
    contact: contact || '',
    status: 'active',
    createdAt: new Date().toISOString()
  };
  data.institutes.push(institute);
  db.save(data);
  res.status(201).json({ institute });
});

// PATCH /api/institutes/:id
router.patch('/:id', authRequired, requireRole('admin', 'authority'), (req, res) => {
  const data = db.load();
  const inst = data.institutes.find(i => i.id === req.params.id);
  if (!inst) return res.status(404).json({ error: 'Institute not found' });
  Object.assign(inst, req.body, { id: inst.id });
  db.save(data);
  res.json({ institute: inst });
});

// DELETE /api/institutes/:id
router.delete('/:id', authRequired, requireRole('admin'), (req, res) => {
  const data = db.load();
  const before = data.institutes.length;
  data.institutes = data.institutes.filter(i => i.id !== req.params.id);
  if (data.institutes.length === before) return res.status(404).json({ error: 'Institute not found' });
  db.save(data);
  res.json({ success: true });
});

module.exports = router;
