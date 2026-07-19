require('dotenv').config();
const express = require('express');
const cors = require('cors');

const db = require('./src/db');
const authRoutes = require('./src/routes/auth');
const restaurantRoutes = require('./src/routes/restaurants');
const menuRoutes = require('./src/routes/menu');
const cartRoutes = require('./src/routes/cart');
const favoriteRoutes = require('./src/routes/favorites');
const orderRoutes = require('./src/routes/orders');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors()); // frontend runs on a different origin/port, so CORS must be open
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/orders', orderRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

async function start() {
  // Pull real menu data from TheMealDB on each startup so the storefront stays in sync.
  await db.ensureMenuData({ forceRefresh: true });
  app.listen(PORT, () => {
    console.log(`TastyHub API running on http://localhost:${PORT}`);
  });
}

start();
