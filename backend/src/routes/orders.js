const express = require('express');
const db = require('../db');
const { identify } = require('../middleware/auth');
const { withDetails, totals, getCartLines } = require('./cart');

const router = express.Router();
router.use(identify);

const TRACKING_STEPS = [
  { key: 'placed', label: 'Order placed', detail: 'We received your order and it is waiting for the kitchen.' },
  { key: 'confirmed', label: 'Kitchen confirmed', detail: 'The kitchen has accepted the order.' },
  { key: 'preparing', label: 'Preparing food', detail: 'Your food is being freshly prepared.' },
  { key: 'on-the-way', label: 'On the way', detail: 'A rider has picked up the order.' },
  { key: 'delivered', label: 'Delivered', detail: 'Enjoy your meal.' },
];

function buildTracking(status) {
  if (status === 'cancelled') {
    return {
      current: 'cancelled',
      steps: [{ key: 'cancelled', label: 'Cancelled', detail: 'This order was cancelled.', active: true, completed: true }],
    };
  }

  const startIndex = TRACKING_STEPS.findIndex((step) => step.key === status);
  const safeIndex = startIndex >= 0 ? startIndex : 0;
  return {
    current: status || 'placed',
    steps: TRACKING_STEPS.map((step, index) => ({
      ...step,
      active: index <= safeIndex,
      completed: index < safeIndex,
    })),
  };
}

function attachTracking(order) {
  return { ...order, tracking: buildTracking(order.status || 'placed') };
}

router.post('/', (req, res) => {
  const { address, payment } = req.body;
  if (!address || !address.name || !address.phone || !address.line1 || !address.city || !address.pin) {
    return res.status(400).json({ error: 'Complete delivery address is required' });
  }
  if (!payment) return res.status(400).json({ error: 'Payment method is required' });

  const lines = getCartLines(req.ownerKey);
  if (lines.length === 0) return res.status(400).json({ error: 'Cart is empty' });

  const order = {
    id: 'ORD' + Date.now(),
    ownerKey: req.ownerKey,
    items: withDetails(lines),
    totals: totals(lines),
    address,
    payment,
    status: 'placed',
    tracking: buildTracking('placed'),
    createdAt: new Date().toISOString(),
  };
  db.get('orders').push(order).write();
  db.set(`carts.${req.ownerKey}`, []).write();

  res.status(201).json(attachTracking(order));
});

router.get('/', (req, res) => {
  const orders = db.get('orders').filter({ ownerKey: req.ownerKey }).value();
  res.json(orders.map(attachTracking).slice().reverse());
});

router.get('/:id', (req, res) => {
  const order = db.get('orders').find({ id: req.params.id, ownerKey: req.ownerKey }).value();
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(attachTracking(order));
});

router.patch('/:id', (req, res) => {
  const { action } = req.body || {};
  const existing = db.get('orders').find({ id: req.params.id, ownerKey: req.ownerKey }).value();
  if (!existing) return res.status(404).json({ error: 'Order not found' });

  if (action === 'cancel') {
    if (existing.status === 'cancelled') return res.status(400).json({ error: 'Order is already cancelled' });
    if (existing.status === 'delivered') return res.status(400).json({ error: 'Delivered orders cannot be cancelled' });
    const updated = db.get('orders').find({ id: req.params.id, ownerKey: req.ownerKey }).assign({
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      tracking: buildTracking('cancelled'),
    }).write();
    return res.json(attachTracking(updated));
  }

  if (action === 'track') {
    const nextStatus = existing.status === 'placed'
      ? 'confirmed'
      : existing.status === 'confirmed'
        ? 'preparing'
        : existing.status === 'preparing'
          ? 'on-the-way'
          : existing.status === 'on-the-way'
            ? 'delivered'
            : existing.status;

    const updated = db.get('orders').find({ id: req.params.id, ownerKey: req.ownerKey }).assign({
      status: nextStatus,
      tracking: buildTracking(nextStatus),
    }).write();
    return res.json(attachTracking(updated));
  }

  return res.status(400).json({ error: 'Unsupported action' });
});

module.exports = router;
