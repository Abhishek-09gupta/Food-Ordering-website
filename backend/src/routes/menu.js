const express = require('express');
const db = require('../db');
const mealdb = require('../mealdbClient');
const { CATEGORIES } = require('../sync');

const router = express.Router();

const IMAGE_OVERRIDES = {
  'Chicken Biryani': 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=900&q=80',
  'Butter Chicken': 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=80',
  'Paneer Tikka': 'https://images.unsplash.com/photo-1615937691194-97dbd3f3f1a4?auto=format&fit=crop&w=900&q=80',
  'Vegetable Korma': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=900&q=80',
  'Mango Kulfi': 'https://images.unsplash.com/photo-1574484284002-952d924569dd?auto=format&fit=crop&w=900&q=80',
  'General Tso\'s Chicken': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80',
  'Crème Brûlée': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80',
};

function enrichImages(items) {
  return items.map((item) => {
    const override = IMAGE_OVERRIDES[item.name];
    const image = override || item.image || item.image_url || item.img || item.strMealThumb || null;
    return image ? { ...item, image } : item;
  });
}

router.get('/categories', (req, res) => {
  res.json(CATEGORIES);
});

router.get('/', async (req, res) => {
  const { category, search, popular } = req.query;
  let items = db.get('menuItems').value();

  if (category && category !== 'all') {
    items = items.filter((m) => m.cat === category);
  }
  if (popular === 'true') {
    items = items.filter((m) => m.popular);
  }
  if (search) {
    const q = search.toLowerCase().trim();
    const localMatches = items.filter((m) => {
      const haystack = `${m.name} ${m.cat} ${m.rest}`.toLowerCase();
      return haystack.includes(q);
    });
    if (localMatches.length > 0) {
      items = localMatches;
    } else {
      try {
        const results = await mealdb.searchMeals(q);
        items = await Promise.all(results.slice(0, 8).map(async (meal) => {
          const details = await mealdb.getMealDetails(meal.idMeal).catch(() => null);
          const area = details?.strArea || 'Indian';
          const catName = details?.strCategory || 'Vegetarian';
          const price = 149 + ((meal.idMeal || '1').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 8) * 25;
          return {
            id: parseInt(meal.idMeal, 10),
            name: meal.strMeal,
            cat: catName,
            restId: 1,
            rest: area,
            price,
            rating: 4.4,
            image: meal.strMealThumb,
            emoji: '🍽️',
            veg: catName === 'Vegetarian' || catName === 'Dessert' || catName === 'Breakfast',
            popular: true,
            source: 'themealdb',
          };
        }));
      } catch (err) {
        items = [];
      }
    }
  }
  res.json(enrichImages(items));
});

router.get('/:id', (req, res) => {
  const item = db.get('menuItems').find({ id: parseInt(req.params.id) }).value();
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(enrichImages([item])[0]);
});

/** Re-pull fresh data from TheMealDB on demand (e.g. hit this after deploying). */
router.post('/sync', async (req, res) => {
  const result = await db.ensureMenuData({ forceRefresh: true });
  res.json(result);
});

module.exports = router;
