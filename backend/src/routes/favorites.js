const express = require('express');
const db = require('../db');
const { identify } = require('../middleware/auth');

const router = express.Router();
router.use(identify);

router.get('/', (req, res) => {
  const ids = db.get(`favorites.${req.ownerKey}`).value() || [];
  const items = db.get('menuItems').filter((m) => ids.includes(m.id)).value();
  res.json(items);
});

router.post('/:itemId', (req, res) => {
  const itemId = parseInt(req.params.itemId);
  const path = `favorites.${req.ownerKey}`;
  if (!db.has(path).value()) db.set(path, []).write();

  const current = db.get(path).value();
  let updated;
  if (current.includes(itemId)) {
    updated = current.filter((id) => id !== itemId);
  } else {
    updated = [...current, itemId];
  }
  db.set(path, updated).write();
  res.json({ favorites: updated });
});

module.exports = router;
