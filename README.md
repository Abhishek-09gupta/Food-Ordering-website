# TastyHub — Food Ordering Experience

TastyHub is a polished full-stack food ordering prototype with a live-backed menu, a modern storefront UI, and a working checkout/order flow. The app is split into a Node.js/Express backend and a static frontend that communicate over HTTP.

## What’s new in the latest version

- Live menu data from TheMealDB is synced into the backend on startup and cached locally in backend/data/db.json.
- The search bar is functional and searches the live catalog directly.
- The restaurant/menu experience is curated around these cuisines: Indian, Chinese, French, Russian, and American.
- The menu now includes 50+ dishes with 5+ items per category, and each item uses a real dish image.
- The homepage hero area rotates through featured food images.
- The checkout experience includes a visible UPI QR payment panel and a card details form for credit/debit payments.
- The footer includes clickable social buttons for Instagram, Facebook, YouTube, and Twitter.
- Users can sign up, log in, reset a password, browse favorites, and view order history with tracking and cancellation controls.

## Project structure

```text
tiffin-torch/
├── backend/          # Express API, authentication, cart, favorites, orders
│   ├── server.js
│   ├── src/
│   │   ├── db.js
│   │   ├── mealdbClient.js
│   │   ├── sync.js
│   │   ├── fallbackSeed.js
│   │   └── routes/
│   └── data/db.json
└── frontend/         # Static landing page + store UI
    ├── index.html
    ├── css/style.css
    └── js/app.js
```

## Getting started

### 1. Start the backend

```bash
cd backend
npm install
npm start
```

The backend runs on http://localhost:4000 and exposes the API under /api.

If you want to refresh the catalog from TheMealDB at any time, run:

```bash
curl -X POST http://localhost:4000/api/menu/sync
```

### 2. Start the frontend

Open a second terminal:

```bash
cd frontend
python -m http.server 5500
```

Then open http://localhost:5500 in your browser.

> The frontend is configured to call the backend at http://localhost:4000/api by default.

## Backend API overview

| Method | Route | Description |
| --- | --- | --- |
| POST | /api/auth/signup | Create an account |
| POST | /api/auth/login | Log in and receive a token |
| POST | /api/auth/forgot-password | Reset a password |
| GET | /api/restaurants | List curated restaurant options |
| GET | /api/menu | List menu items, with category/search support |
| GET | /api/menu/categories | List available categories |
| POST | /api/menu/sync | Force a fresh sync from TheMealDB |
| GET | /api/cart | Read the current cart |
| POST | /api/cart | Add an item to the cart |
| PUT | /api/cart/:itemId | Update item quantity |
| DELETE | /api/cart | Clear the cart |
| GET | /api/favorites | Read favorites |
| POST | /api/favorites/:itemId | Toggle a favorite |
| POST | /api/orders | Place an order |
| GET | /api/orders | View order history |
| PATCH | /api/orders/:id | Update tracking or cancel an order |

## Notes

- Payments are captured in the UI flow but are not processed through a real gateway.
- Order tracking and cancellation are demo-style state changes for the frontend experience.
- The local JSON database is intended for development and demo purposes.

