const express = require('express');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const uuid = () => randomUUID();
const db = require('../db');
const { hashPassword, verifyPassword } = require('../utils/password');
const { JWT_SECRET, authRequired } = require('../middleware/auth');

const router = express.Router();

const VALID_ROLES = ['inspector', 'ngo', 'authority'];

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password, role, institute } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password, role are required' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
  }
  const data = db.load();
  if (data.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'A user with this email already exists' });
  }
  const user = {
    id: uuid(),
    name,
    email,
    passwordHash: hashPassword(password),
    role,
    institute: institute || null,
    createdAt: new Date().toISOString()
  };
  data.users.push(user);
  db.save(data);
  const { passwordHash, ...safeUser } = user;
  res.status(201).json({ user: safeUser });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const data = db.load();
  const user = data.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role, institute: user.institute },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
  const { passwordHash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// GET /api/auth/me
router.get('/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
