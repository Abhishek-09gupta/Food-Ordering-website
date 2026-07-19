const mealdb = require('./mealdbClient');

// A curated subset of TheMealDB's real categories, with an icon for our UI.
// We keep only the sections requested by the storefront experience.
const CATEGORIES = [
  { id: 'Chicken', name: 'Chicken', icon: '🍗' },
  { id: 'Seafood', name: 'Seafood', icon: '🦐' },
  { id: 'Vegetarian', name: 'Vegetarian', icon: '🥗' },
  { id: 'Dessert', name: 'Dessert', icon: '🍰' },
  { id: 'Breakfast', name: 'Breakfast', icon: '🍳' },
];

const CATEGORY_ICONS = {
  Chicken: '🍗',
  Seafood: '🦐',
  Vegetarian: '🥗',
  Dessert: '🍰',
  Breakfast: '🍳',
};

// Only dishes from these cuisines are kept — everything else is filtered out
// during sync, so the restaurant grid contains only the requested kitchens.
const ALLOWED_AREAS = ['Indian', 'Chinese', 'French', 'Russian', 'American'];
const ALLOWED_AREAS_SET = new Set(ALLOWED_AREAS);

const AREA_EMOJI = {
  Indian: '🍛', Chinese: '🥡', French: '🥐', Russian: '🥟', American: '🍔',
};

const VEG_CATEGORIES = new Set(['Vegetarian', 'Dessert', 'Breakfast']);
const PLACEHOLDER_IMAGE_RE = /58oia61564916529|placeholder|example\.com/i;
const IMAGE_OVERRIDES = {
  'butter chicken': 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=80',
  'chicken biryani': 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=900&q=80',
  'vegetable korma': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=900&q=80',
  'paneer tikka': 'https://images.unsplash.com/photo-1615937691194-97dbd3f3f1a4?auto=format&fit=crop&w=900&q=80',
  'mango kulfi': 'https://images.unsplash.com/photo-1574484284002-952d924569dd?auto=format&fit=crop&w=900&q=80',
  'kung pao chicken': 'https://images.unsplash.com/photo-1559847844-5315695d273d?auto=format&fit=crop&w=900&q=80',
  'general tso chicken': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80',
  'hot sour soup': 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80',
  'vegetable fried rice': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80',
  'tiramisu': 'https://images.unsplash.com/photo-1571877227200-a0d98ea4a1b2?auto=format&fit=crop&w=900&q=80',
  'coq au vin': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=80',
  'french onion soup': 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80',
  'creme brulee': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80',
  'borscht': 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80',
  'beef stroganoff': 'https://images.unsplash.com/photo-1559847844-5315695d273d?auto=format&fit=crop&w=900&q=80',
  'pelmeni': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
  'apple pie': 'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&w=900&q=80',
  'classic cheeseburger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80',
  'chicken caesar wrap': 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=900&q=80',
  'french toast': 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=900&q=80',
  'pancakes': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80',
  'veggie omelette': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
  'mushroom ravioli': 'https://images.unsplash.com/photo-1516100882582-96c3a05fe590?auto=format&fit=crop&w=900&q=80',
  'saffron rice pudding': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80',
};

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Deterministic "price" and "rating" derived from the meal id, since MealDB has no pricing data. */
function synthesize(idMeal) {
  const h = hashStr(idMeal);
  const price = 149 + (h % 46) * 10;             // ₹149 - ₹599
  const rating = (3.8 + ((h >> 3) % 12) / 10).toFixed(1); // 3.8 - 4.9
  const popular = h % 4 === 0;
  return { price, rating: parseFloat(rating), popular };
}

function normalizeName(value) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function resolveItemImage(item, candidates = []) {
  const image = item.image || item.image_url || item.img || '';
  if (image && !PLACEHOLDER_IMAGE_RE.test(image)) return { ...item, image };

  const name = (item.name || '').trim();
  if (!name) return item;

  const normalizedName = normalizeName(name);
  const override = IMAGE_OVERRIDES[normalizedName];
  if (override) return { ...item, image: override };

  const match = candidates.find((candidate) => {
    const candidateName = normalizeName(candidate.name || '');
    if (!candidateName) return false;
    return candidateName === normalizedName || candidateName.includes(normalizedName) || normalizedName.includes(candidateName);
  });
  if (match?.image && !PLACEHOLDER_IMAGE_RE.test(match.image)) return { ...item, image: match.image };

  try {
    const results = await mealdb.searchMeals(name);
    const mealMatch = results.find((meal) => {
      const mealName = normalizeName(meal.strMeal || '');
      return mealName === normalizedName || mealName.includes(normalizedName) || normalizedName.includes(mealName);
    });
    if (mealMatch?.strMealThumb) return { ...item, image: mealMatch.strMealThumb };
  } catch (err) {
    // Fall back to the existing image if the search lookup fails.
  }

  return item;
}

/**
 * Pulls a curated menu from TheMealDB. Rather than stopping after a tiny
 * filtered subset, this version walks the allowed cuisines directly and keeps
 * collecting until the local cache has a healthy menu inventory.
 */
async function syncFromMealDB({ targetItems = 60, itemsPerArea = 18 } = {}) {
  const menuItems = [];
  const restaurantsByArea = new Map();
  const seenIds = new Set();
  let nextRestId = 1;

  for (const area of ALLOWED_AREAS) {
    const h = hashStr(area);
    restaurantsByArea.set(area, {
      id: nextRestId++,
      name: area,
      cuisine: area,
      rating: parseFloat((4.1 + (h % 8) / 10).toFixed(1)),
      time: `${20 + (h % 20)}-${35 + (h % 15)} min`,
      emoji: AREA_EMOJI[area] || '🍽️',
    });
  }

  for (const area of ALLOWED_AREAS) {
    let list;
    try {
      list = await mealdb.getMealsByArea(area);
    } catch (err) {
      console.warn(`Could not fetch area ${area}:`, err.message);
      continue;
    }

    for (let i = 0; i < list.length && i < itemsPerArea && menuItems.length < targetItems; i++) {
      const meal = list[i];
      let details;
      try {
        details = await mealdb.getMealDetails(meal.idMeal);
      } catch (err) {
        continue;
      }
      if (!details) continue;

      const mealArea = details.strArea;
      if (!ALLOWED_AREAS_SET.has(mealArea)) continue;

      const catName = details.strCategory;
      if (!CATEGORIES.some((category) => category.id === catName)) continue;

      const itemId = parseInt(meal.idMeal, 10);
      if (seenIds.has(itemId)) continue;
      seenIds.add(itemId);

      const restaurant = restaurantsByArea.get(mealArea) || restaurantsByArea.get('Indian');
      const { price, rating, popular } = synthesize(itemId);

      menuItems.push({
        id: itemId,
        name: meal.strMeal,
        cat: catName,
        restId: restaurant.id,
        rest: restaurant.name,
        price,
        rating,
        image: details.strMealThumb || meal.strMealThumb,
        emoji: CATEGORY_ICONS[catName] || '🍽️',
        veg: VEG_CATEGORIES.has(catName),
        popular,
        source: 'themealdb',
      });
    }
  }

  if (menuItems.length < targetItems) {
    for (const cat of CATEGORIES) {
      let list;
      try {
        list = await mealdb.getMealsByCategory(cat.id);
      } catch (err) {
        console.warn(`Could not fetch category ${cat.id}:`, err.message);
        continue;
      }

      for (let i = 0; i < list.length && menuItems.length < targetItems; i++) {
        const meal = list[i];
        let details;
        try {
          details = await mealdb.getMealDetails(meal.idMeal);
        } catch (err) {
          continue;
        }
        if (!details) continue;

        const mealArea = details.strArea;
        if (!ALLOWED_AREAS_SET.has(mealArea)) continue;

        const catName = details.strCategory;
        if (!CATEGORIES.some((category) => category.id === catName)) continue;

        const itemId = parseInt(meal.idMeal, 10);
        if (seenIds.has(itemId)) continue;
        seenIds.add(itemId);

        const restaurant = restaurantsByArea.get(mealArea) || restaurantsByArea.get('Indian');
        const { price, rating, popular } = synthesize(itemId);

        menuItems.push({
          id: itemId,
          name: meal.strMeal,
          cat: catName,
          restId: restaurant.id,
          rest: restaurant.name,
          price,
          rating,
          image: details.strMealThumb || meal.strMealThumb,
          emoji: CATEGORY_ICONS[catName] || '🍽️',
          veg: VEG_CATEGORIES.has(catName),
          popular,
          source: 'themealdb',
        });
      }
    }
  }

  return {
    categories: CATEGORIES,
    restaurants: Array.from(restaurantsByArea.values()),
    menuItems,
  };
}

module.exports = { syncFromMealDB, CATEGORIES, resolveItemImage };
