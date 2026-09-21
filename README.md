# ShopKart — Full-Stack Edition

A modern multi-category marketplace with a **real Flask + database backend**.
Products, accounts, carts, wishlists and orders are now stored server-side —
nothing lives in the browser except your login token.

```
shopkart-fullstack/
├── backend/     Flask API + database (SQLite by default, MySQL-ready)
└── frontend/    The ShopKart website (HTML/CSS/JS) — served by Flask
```

## 1. Install Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

(If you'd rather use a virtual environment: `python3 -m venv venv && source venv/bin/activate` first.)

## 2. Run it

```bash
python app.py
```

Then open **http://localhost:5000** — that's it. Flask serves both the API
(`/api/...`) and the website itself, so there's only one server and one port,
and no CORS setup needed.

The database (`backend/shopkart.db`, a SQLite file) is created and seeded
automatically the first time you run it: 45 products across 13 categories,
plus two demo accounts:

| Role     | Email                  | Password   |
|----------|------------------------|------------|
| Customer | demo@shopkart.com      | demo1234   |
| Seller   | seller@shopkart.com    | seller123  |

## 3. Using it

- Browse, search, filter and add products to your cart/wishlist as a customer.
- Log in as the seller (or register a new "Seller" account) to reach the
  **Seller Dashboard** and add/edit/delete products — changes appear on the
  storefront immediately because everyone reads from the same database.
- Place an order through checkout, then view it under **My Orders**. As the
  seller, the same order shows up in the dashboard's Orders tab, where you
  can move it through Ordered → Packed → Shipped → Delivered.
- Everything persists across browsers, devices and restarts, because it's
  now in the database rather than LocalStorage.

## Switching to MySQL

By default the app uses SQLite (`backend/shopkart.db`) — zero setup. To use
MySQL instead:

1. Create a database: `CREATE DATABASE shopkart;`
2. Set an environment variable before starting the app:
   ```bash
   export DATABASE_URL="mysql+pymysql://<user>:<password>@localhost:3306/shopkart"
   python app.py
   ```
3. The app will create all tables and seed the catalog automatically, same
   as with SQLite.

## Security notes (read this before deploying anywhere real)

This is a demo/college-project-grade backend, not a production one:

- Passwords **are** hashed with Werkzeug's `generate_password_hash` (not
  plain text) — a real improvement over the original LocalStorage version.
- Auth uses JWTs (`flask-jwt-extended`) stored in the browser's LocalStorage.
  For production you'd want httpOnly cookies, refresh-token rotation, rate
  limiting on login/register, and email verification.
- `SECRET_KEY` / `JWT_SECRET_KEY` in `backend/config.py` are hardcoded dev
  defaults — set real random values via environment variables before
  deploying anywhere public.
- The dev server (`app.run()`) is Flask's built-in server, explicitly not
  meant for production — use `gunicorn`/`uwsgi` behind a real web server.
- There's no payment integration — checkout is a UI-only simulation, as in
  the original spec.
- Healthcare products are limited to over-the-counter items (thermometer,
  BP monitor, first-aid kit); there's no prescription-verification workflow.

## API overview

All endpoints are under `/api`:

| Method | Path                       | Auth       | Purpose                          |
|--------|-----------------------------|------------|-----------------------------------|
| POST   | /auth/register              | —          | Create an account                |
| POST   | /auth/login                 | —          | Log in, get a JWT                |
| GET    | /auth/me                    | required   | Current user's profile           |
| GET    | /products                   | —          | List all products                |
| GET    | /products/:id               | —          | One product                      |
| POST   | /products                   | seller     | Create a product                 |
| PUT    | /products/:id               | seller     | Update a product                 |
| DELETE | /products/:id               | seller     | Delete a product                 |
| GET    | /cart                       | required   | Current user's cart              |
| POST   | /cart                       | required   | Add an item                      |
| PUT    | /cart/:productId            | required   | Update quantity                  |
| DELETE | /cart/:productId            | required   | Remove an item                   |
| GET    | /wishlist                   | required   | Current user's wishlist          |
| POST   | /wishlist/:productId        | required   | Toggle wishlist status           |
| GET    | /orders                     | required   | Your orders (all orders if seller)|
| POST   | /orders                     | required   | Place an order from your cart    |
| PUT    | /orders/:code/status        | seller     | Update an order's status         |
