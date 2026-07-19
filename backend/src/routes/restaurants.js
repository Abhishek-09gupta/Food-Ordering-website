const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.get('restaurants').value());
});

router.get('/:id', (req, res) => {
  const rest = db.get('restaurants').find({ id: parseInt(req.params.id) }).value();
  if (!rest) return res.status(404).json({ error: 'Restaurant not found' });
  res.json(rest);
});

module.exports = router;
