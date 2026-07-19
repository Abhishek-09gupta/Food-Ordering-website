const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const { syncFromMealDB, resolveItemImage } = require('./sync');
const fallback = require('./fallbackSeed');

const adapter = new FileSync(path.join(__dirname, '..', 'data', 'db.json'));
const db = low(adapter);

db.defaults({
  users: [],
  restaurants: [],
  menuItems: [],
  categories: [],
  carts: {},
  favorites: {},
  orders: [],
  meta: { lastSync: null },
}).write();

/**
 * Populates categories/restaurants/menuItems from TheMealDB if we've never
 * synced before (or if forceRefresh is true). Falls back to a small built-in
 * seed if the API can't be reached and there's no cached data yet.
 */
async function ensureMenuData({ forceRefresh = false } = {}) {
  const hasData = db.get('menuItems').value().length > 0;
  if (hasData && !forceRefresh) return { source: 'cache', count: hasData };

  try {
    console.log('Syncing menu data from TheMealDB...');
    const { categories, restaurants, menuItems: syncedMenuItems } = await syncFromMealDB();
    if (syncedMenuItems.length === 0) throw new Error('MealDB sync returned no items');

    const mergedMenuItems = [];
    const seenItemNames = new Set();
    for (const item of syncedMenuItems) {
      const key = (item.name || '').toLowerCase();
      if (!seenItemNames.has(key)) {
        mergedMenuItems.push(item);
        seenItemNames.add(key);
      }
    }
    for (const item of fallback.menuItems) {
      const key = (item.name || '').toLowerCase();
      if (!seenItemNames.has(key)) {
        mergedMenuItems.push({ ...item, id: item.id + 1000 + mergedMenuItems.length });
        seenItemNames.add(key);
      }
    }

    const resolvedMenuItems = await Promise.all(mergedMenuItems.map((item) => resolveItemImage(item, syncedMenuItems)));
    db.set('categories', categories).write();
    db.set('restaurants', restaurants).write();
    db.set('menuItems', resolvedMenuItems).write();
    db.set('meta.lastSync', new Date().toISOString()).write();
    console.log(`Synced ${mergedMenuItems.length} dishes across ${restaurants.length} kitchens from TheMealDB.`);
    return { source: 'themealdb', count: mergedMenuItems.length };
  } catch (err) {
    console.warn('Could not sync TheMealDB, using fallback data:', err.message);
    if (!hasData) {
      db.set('categories', fallback.categories).write();
      db.set('restaurants', fallback.restaurants).write();
      db.set('menuItems', fallback.menuItems).write();
    }
    return { source: 'fallback', count: db.get('menuItems').value().length };
  }
}

module.exports = db;
module.exports.ensureMenuData = ensureMenuData;
