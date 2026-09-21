import json
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Product, User

products_bp = Blueprint('products', __name__)


def _current_seller():
    """Returns the current user if they are a seller, else None."""
    user = User.query.get(int(get_jwt_identity()))
    return user if user and user.role == 'seller' else None


def _compute_discount(price, original_price):
    if original_price and original_price > price:
        return round((original_price - price) / original_price * 100)
    return 0


@products_bp.route('', methods=['GET'])
def list_products():
    products = Product.query.order_by(Product.id).all()
    return jsonify([p.to_dict() for p in products])


@products_bp.route('/<int:pid>', methods=['GET'])
def get_product(pid):
    p = Product.query.get(pid)
    if not p:
        return jsonify({'message': 'Product not found.'}), 404
    return jsonify(p.to_dict())


@products_bp.route('', methods=['POST'])
@jwt_required()
def create_product():
    seller = _current_seller()
    if not seller:
        return jsonify({'message': 'Seller access required.'}), 403

    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    category = (data.get('category') or '').strip()
    try:
        price = int(data.get('price') or 0)
        stock = int(data.get('stock') or 0)
    except (TypeError, ValueError):
        return jsonify({'message': 'Price and stock must be numbers.'}), 400
    original_price = int(data.get('originalPrice') or price)

    if not name or not category or price <= 0 or stock < 0:
        return jsonify({'message': 'Please provide valid product details.'}), 400

    product = Product(
        name=name, category=category, price=price, original_price=original_price,
        discount=_compute_discount(price, original_price),
        rating=min(5, max(0, float(data.get('rating') or 4.0))),
        stock=stock, image=data.get('image') or '', description=data.get('description', ''),
        specs=json.dumps(data.get('specs', {})), seller_id=seller.id
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201


@products_bp.route('/<int:pid>', methods=['PUT'])
@jwt_required()
def update_product(pid):
    seller = _current_seller()
    if not seller:
        return jsonify({'message': 'Seller access required.'}), 403

    product = Product.query.get(pid)
    if not product:
        return jsonify({'message': 'Product not found.'}), 404

    data = request.get_json(silent=True) or {}
    price = int(data.get('price', product.price))
    original_price = int(data.get('originalPrice', product.original_price or price))

    product.name = (data.get('name') or product.name).strip()
    product.category = data.get('category', product.category)
    product.price = price
    product.original_price = original_price
    product.discount = _compute_discount(price, original_price)
    product.rating = min(5, max(0, float(data.get('rating', product.rating))))
    product.stock = int(data.get('stock', product.stock))
    if data.get('image'):
        product.image = data['image']
    product.description = data.get('description', product.description)

    db.session.commit()
    return jsonify(product.to_dict())


@products_bp.route('/<int:pid>', methods=['DELETE'])
@jwt_required()
def delete_product(pid):
    seller = _current_seller()
    if not seller:
        return jsonify({'message': 'Seller access required.'}), 403

    product = Product.query.get(pid)
    if not product:
        return jsonify({'message': 'Product not found.'}), 404

    db.session.delete(product)
    db.session.commit()
    return jsonify({'message': 'Product deleted.'})
