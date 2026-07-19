// Thin wrapper around TheMealDB (https://www.themealdb.com/api.php)
// Uses the free public test key "1" — no signup required for development use.
const BASE = 'https://www.themealdb.com/api/json/v1/1';

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MealDB request failed: ${res.status} ${url}`);
  return res.json();
}

/** All meal categories, e.g. Beef, Chicken, Vegetarian, Dessert... */
async function getCategories() {
  const data = await getJSON(`${BASE}/categories.php`);
  return data.categories || [];
}

/** Meals in a category — only gives id, name, thumbnail (need lookup() for full details). */
async function getMealsByCategory(category) {
  const data = await getJSON(`${BASE}/filter.php?c=${encodeURIComponent(category)}`);
  return data.meals || [];
}

/** Meals for a specific cuisine/area, e.g. Indian or Chinese. */
async function getMealsByArea(area) {
  const data = await getJSON(`${BASE}/filter.php?a=${encodeURIComponent(area)}`);
  return data.meals || [];
}

/** Search meals by free-text name, used by the menu search box. */
async function searchMeals(term) {
  const data = await getJSON(`${BASE}/search.php?s=${encodeURIComponent(term)}`);
  return data.meals || [];
}

/** Full recipe details for a single meal by id, including its cuisine "area". */
async function getMealDetails(id) {
  const data = await getJSON(`${BASE}/lookup.php?i=${encodeURIComponent(id)}`);
  return (data.meals && data.meals[0]) || null;
}

module.exports = { getCategories, getMealsByCategory, getMealsByArea, searchMeals, getMealDetails };
