const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, requireAuth } = require('../middleware/auth');

const router = express.Router();

function sign(user) {
  return jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

router.post('/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  const existing = db.get('users').find({ email: email.toLowerCase() }).value();
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = {
    id: Date.now(),
    name,
    email: email.toLowerCase(),
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  db.get('users').push(user).write();

  const token = sign(user);
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const user = db.get('users').find({ email: email.toLowerCase() }).value();
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = sign(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

router.post('/forgot-password', (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) return res.status(400).json({ error: 'email and newPassword are required' });

  const user = db.get('users').find({ email: email.toLowerCase() }).value();
  if (!user) return res.status(404).json({ error: 'No account found with that email' });

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.get('users').find({ id: user.id }).assign({ passwordHash }).write();
  res.json({ ok: true, message: 'Password updated successfully' });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
