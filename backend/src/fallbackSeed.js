// Used only as a fallback if the app has never successfully synced with
// TheMealDB (e.g. no internet on first run). Once a real sync succeeds,
// this is never used again.
const categories = [
  { id: 'Chicken', name: 'Chicken', icon: '🍗' },
  { id: 'Seafood', name: 'Seafood', icon: '🦐' },
  { id: 'Vegetarian', name: 'Vegetarian', icon: '🥗' },
  { id: 'Dessert', name: 'Dessert', icon: '🍰' },
  { id: 'Breakfast', name: 'Breakfast', icon: '🍳' },
];

const restaurants = [
  { id: 1, name: 'Indian', cuisine: 'Indian', rating: 4.6, time: '25-35 min', emoji: '🍛' },
  { id: 2, name: 'Chinese', cuisine: 'Chinese', rating: 4.5, time: '20-30 min', emoji: '🥡' },
  { id: 3, name: 'French', cuisine: 'French', rating: 4.4, time: '22-32 min', emoji: '🥐' },
  { id: 4, name: 'Russian', cuisine: 'Russian', rating: 4.3, time: '24-34 min', emoji: '🥟' },
  { id: 5, name: 'American', cuisine: 'American', rating: 4.7, time: '20-28 min', emoji: '🍔' },
];

const menuItems = [
  { id: 1, name: 'Butter Chicken', cat: 'Chicken', restId: 1, rest: 'Indian', price: 289, rating: 4.5, emoji: '🍗', veg: false, popular: true, image: '', source: 'fallback' },
  { id: 2, name: 'Chicken Biryani', cat: 'Chicken', restId: 1, rest: 'Indian', price: 319, rating: 4.6, emoji: '🍗', veg: false, popular: true, image: '', source: 'fallback' },
  { id: 3, name: 'Vegetable Korma', cat: 'Vegetarian', restId: 1, rest: 'Indian', price: 259, rating: 4.3, emoji: '🥗', veg: true, popular: true, image: '', source: 'fallback' },
  { id: 4, name: 'Paneer Tikka', cat: 'Vegetarian', restId: 1, rest: 'Indian', price: 279, rating: 4.7, emoji: '🥗', veg: true, popular: true, image: '', source: 'fallback' },
  { id: 5, name: 'Mango Kulfi', cat: 'Dessert', restId: 1, rest: 'Indian', price: 149, rating: 4.4, emoji: '🍰', veg: true, popular: false, image: '', source: 'fallback' },
  { id: 6, name: 'Kung Pao Chicken', cat: 'Chicken', restId: 2, rest: 'Chinese', price: 299, rating: 4.6, emoji: '🍗', veg: false, popular: true, image: '', source: 'fallback' },
  { id: 7, name: 'General Tso\'s Chicken', cat: 'Chicken', restId: 2, rest: 'Chinese', price: 309, rating: 4.5, emoji: '🍗', veg: false, popular: true, image: '', source: 'fallback' },
  { id: 8, name: 'Hot & Sour Soup', cat: 'Seafood', restId: 2, rest: 'Chinese', price: 189, rating: 4.3, emoji: '🦐', veg: false, popular: true, image: '', source: 'fallback' },
  { id: 9, name: 'Vegetable Fried Rice', cat: 'Vegetarian', restId: 2, rest: 'Chinese', price: 229, rating: 4.4, emoji: '🥗', veg: true, popular: true, image: '', source: 'fallback' },
  { id: 10, name: 'Tiramisu', cat: 'Dessert', restId: 3, rest: 'French', price: 199, rating: 4.7, emoji: '🍰', veg: true, popular: true, image: '', source: 'fallback' },
  { id: 11, name: 'Coq au Vin', cat: 'Chicken', restId: 3, rest: 'French', price: 349, rating: 4.8, emoji: '🍗', veg: false, popular: true, image: '', source: 'fallback' },
  { id: 12, name: 'French Onion Soup', cat: 'Vegetarian', restId: 3, rest: 'French', price: 219, rating: 4.2, emoji: '🥗', veg: true, popular: true, image: '', source: 'fallback' },
  { id: 13, name: 'Crème Brûlée', cat: 'Dessert', restId: 3, rest: 'French', price: 189, rating: 4.6, emoji: '🍰', veg: true, popular: false, image: '', source: 'fallback' },
  { id: 14, name: 'Borscht', cat: 'Vegetarian', restId: 4, rest: 'Russian', price: 229, rating: 4.3, emoji: '🥗', veg: true, popular: true, image: '', source: 'fallback' },
  { id: 15, name: 'Beef Stroganoff', cat: 'Chicken', restId: 4, rest: 'Russian', price: 329, rating: 4.4, emoji: '🍗', veg: false, popular: true, image: '', source: 'fallback' },
  { id: 16, name: 'Pelmeni', cat: 'Seafood', restId: 4, rest: 'Russian', price: 279, rating: 4.5, emoji: '🦐', veg: false, popular: true, image: '', source: 'fallback' },
  { id: 17, name: 'Apple Pie', cat: 'Dessert', restId: 5, rest: 'American', price: 169, rating: 4.6, emoji: '🍰', veg: true, popular: true, image: '', source: 'fallback' },
  { id: 18, name: 'Classic Cheeseburger', cat: 'Chicken', restId: 5, rest: 'American', price: 249, rating: 4.5, emoji: '🍗', veg: false, popular: true, image: '', source: 'fallback' },
  { id: 19, name: 'Chicken Caesar Wrap', cat: 'Chicken', restId: 5, rest: 'American', price: 239, rating: 4.3, emoji: '🍗', veg: false, popular: true, image: '', source: 'fallback' },
  { id: 20, name: 'French Toast', cat: 'Breakfast', restId: 5, rest: 'American', price: 179, rating: 4.4, emoji: '🍳', veg: true, popular: true, image: '', source: 'fallback' },
  { id: 21, name: 'Pancakes', cat: 'Breakfast', restId: 5, rest: 'American', price: 159, rating: 4.3, emoji: '🍳', veg: true, popular: true, image: '', source: 'fallback' },
  { id: 22, name: 'Veggie Omelette', cat: 'Breakfast', restId: 1, rest: 'Indian', price: 199, rating: 4.2, emoji: '🍳', veg: true, popular: false, image: '', source: 'fallback' },
  { id: 23, name: 'Mushroom Ravioli', cat: 'Vegetarian', restId: 3, rest: 'French', price: 269, rating: 4.5, emoji: '🥗', veg: true, popular: true, image: '', source: 'fallback' },
  { id: 24, name: 'Saffron Rice Pudding', cat: 'Dessert', restId: 1, rest: 'Indian', price: 169, rating: 4.4, emoji: '🍰', veg: true, popular: false, image: '', source: 'fallback' },
];

module.exports = { categories, restaurants, menuItems };
