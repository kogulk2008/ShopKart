import json
import os
from werkzeug.security import generate_password_hash
from extensions import db
from models import User, Product

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


def seed_if_empty():
    """Seed demo accounts and the product catalog on first run only."""
    if User.query.count() == 0:
        seller = User(
            name='ShopKart Seller', email='seller@shopkart.com', phone='9999900000',
            role='seller', password_hash=generate_password_hash('seller123')
        )
        customer = User(
            name='Demo Customer', email='demo@shopkart.com', phone='9999911111',
            role='customer', password_hash=generate_password_hash('demo1234')
        )
        db.session.add_all([seller, customer])
        db.session.commit()

    if Product.query.count() == 0:
        with open(os.path.join(BASE_DIR, 'seed_products.json'), encoding='utf-8') as f:
            seed_products = json.load(f)
        for p in seed_products:
            db.session.add(Product(
                name=p['name'], category=p['category'], price=p['price'],
                original_price=p.get('originalPrice'), discount=p.get('discount', 0),
                rating=p.get('rating', 4.0), stock=p.get('stock', 0), image=p.get('image', ''),
                description=p.get('description', ''), specs=json.dumps(p.get('specs', {}))
            ))
        db.session.commit()
        print(f"Seeded {len(seed_products)} products.")
