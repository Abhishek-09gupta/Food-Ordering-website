const express = require('express');
const db = require('../db');
const { identify } = require('../middleware/auth');

const router = express.Router();
router.use(identify);

const DELIVERY_FEE = 29;
const TAX_RATE = 0.05;

function getCartLines(ownerKey) {
  return db.get(`carts.${ownerKey}`).value() || [];
}

function withDetails(lines) {
  const menuItems = db.get('menuItems').value();
  return lines
    .map((line) => {
      const item = menuItems.find((m) => m.id === line.itemId);
      if (!item) return null;
      return { ...item, qty: line.qty, lineTotal: item.price * line.qty };
    })
    .filter(Boolean);
}

function totals(lines) {
  const subtotal = withDetails(lines).reduce((sum, l) => sum + l.lineTotal, 0);
  const deliveryFee = lines.length > 0 ? DELIVERY_FEE : 0;
  const tax = Math.round(subtotal * TAX_RATE);
  return { subtotal, deliveryFee, tax, total: subtotal + deliveryFee + tax };
}

router.get('/', (req, res) => {
  const lines = getCartLines(req.ownerKey);
  res.json({ items: withDetails(lines), totals: totals(lines) });
});

router.post('/', (req, res) => {
  const { itemId, qty = 1 } = req.body;
  const item = db.get('menuItems').find({ id: itemId }).value();
  if (!item) return res.status(404).json({ error: 'Menu item not found' });

  const path = `carts.${req.ownerKey}`;
  if (!db.has(path).value()) db.set(path, []).write();

  const existing = db.get(path).find({ itemId }).value();
  if (existing) {
    db.get(path).find({ itemId }).assign({ qty: existing.qty + qty }).write();
  } else {
    db.get(path).push({ itemId, qty }).write();
  }
  const lines = getCartLines(req.ownerKey);
  res.status(201).json({ items: withDetails(lines), totals: totals(lines) });
});

router.put('/:itemId', (req, res) => {
  const itemId = parseInt(req.params.itemId);
  const { qty } = req.body;
  const path = `carts.${req.ownerKey}`;

  if (qty <= 0) {
    db.set(path, getCartLines(req.ownerKey).filter((l) => l.itemId !== itemId)).write();
  } else {
    const existing = db.get(path).find({ itemId }).value();
    if (!existing) return res.status(404).json({ error: 'Item not in cart' });
    db.get(path).find({ itemId }).assign({ qty }).write();
  }
  const lines = getCartLines(req.ownerKey);
  res.json({ items: withDetails(lines), totals: totals(lines) });
});

router.delete('/:itemId', (req, res) => {
  const itemId = parseInt(req.params.itemId);
  const path = `carts.${req.ownerKey}`;
  db.set(path, getCartLines(req.ownerKey).filter((l) => l.itemId !== itemId)).write();
  const lines = getCartLines(req.ownerKey);
  res.json({ items: withDetails(lines), totals: totals(lines) });
});

router.delete('/', (req, res) => {
  db.set(`carts.${req.ownerKey}`, []).write();
  res.json({ items: [], totals: totals([]) });
});

module.exports = router;
module.exports.withDetails = withDetails;
module.exports.totals = totals;
module.exports.getCartLines = getCartLines;
