from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import CartItem, Product

cart_bp = Blueprint('cart', __name__)


def _serialize_cart(user_id):
    items = CartItem.query.filter_by(user_id=user_id).all()
    return [{'id': i.product_id, 'qty': i.qty} for i in items]


@cart_bp.route('', methods=['GET'])
@jwt_required()
def get_cart():
    return jsonify(_serialize_cart(int(get_jwt_identity())))


@cart_bp.route('', methods=['POST'])
@jwt_required()
def add_to_cart():
    uid = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    try:
        pid = int(data.get('productId'))
    except (TypeError, ValueError):
        return jsonify({'message': 'A valid productId is required.'}), 400
    qty = int(data.get('qty', 1))

    product = Product.query.get(pid)
    if not product:
        return jsonify({'message': 'Product not found.'}), 404
    if product.stock <= 0:
        return jsonify({'message': 'This product is out of stock.'}), 400

    item = CartItem.query.filter_by(user_id=uid, product_id=pid).first()
    new_qty = (item.qty if item else 0) + qty
    if new_qty > product.stock:
        return jsonify({'message': f'Only {product.stock} in stock.'}), 400

    if item:
        item.qty = new_qty
    else:
        db.session.add(CartItem(user_id=uid, product_id=pid, qty=qty))
    db.session.commit()
    return jsonify(_serialize_cart(uid))


@cart_bp.route('/<int:pid>', methods=['PUT'])
@jwt_required()
def update_cart_item(pid):
    uid = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    qty = int(data.get('qty', 1))

    item = CartItem.query.filter_by(user_id=uid, product_id=pid).first()
    if not item:
        return jsonify({'message': 'Item not in cart.'}), 404

    product = Product.query.get(pid)
    qty = max(1, qty)
    if product:
        qty = min(qty, product.stock)
    item.qty = qty
    db.session.commit()
    return jsonify(_serialize_cart(uid))


@cart_bp.route('/<int:pid>', methods=['DELETE'])
@jwt_required()
def remove_cart_item(pid):
    uid = int(get_jwt_identity())
    CartItem.query.filter_by(user_id=uid, product_id=pid).delete()
    db.session.commit()
    return jsonify(_serialize_cart(uid))


@cart_bp.route('/clear', methods=['POST'])
@jwt_required()
def clear_cart():
    uid = int(get_jwt_identity())
    CartItem.query.filter_by(user_id=uid).delete()
    db.session.commit()
    return jsonify([])
