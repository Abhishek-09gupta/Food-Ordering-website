# TastyHub — Food Ordering Website

TastyHub is a polished full-stack food ordering prototype with a live-backed menu, a modern storefront UI, and a working checkout and order flow. The app combines a Node.js/Express backend with a static frontend that communicates over HTTP.

## Highlights

- Live menu data from TheMealDB is synced into the backend on startup and cached locally in [backend/data/db.json](backend/data/db.json).
- The search experience works directly against the live catalog.
- The storefront highlights curated cuisines such as Indian, Chinese, French, Russian, and American.
- The homepage includes a hero section, featured food carousel, categories, restaurants, and checkout steps.
- The UI now includes branded logo styling in both the navbar and footer.
- Users can sign up, log in, reset a password, browse favorites, and view order history with tracking and cancellation controls.

## Project structure

```text
TastyHub/
├── backend/                 # Express API, authentication, cart, favorites, orders
│   ├── package.json
│   ├── server.js
│   ├── src/
│   │   ├── db.js
│   │   ├── mealdbClient.js
│   │   ├── sync.js
│   │   ├── fallbackSeed.js
│   │   └── routes/
│   └── data/db.json
└── frontend/                # Static landing page and storefront UI
    ├── index.html
    ├── css/style.css
    ├── image/logo.png
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

To refresh the menu catalog from TheMealDB at any time, run:

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

