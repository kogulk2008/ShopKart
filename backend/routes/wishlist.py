from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import WishlistItem, Product

wishlist_bp = Blueprint('wishlist', __name__)


@wishlist_bp.route('', methods=['GET'])
@jwt_required()
def get_wishlist():
    uid = int(get_jwt_identity())
    items = WishlistItem.query.filter_by(user_id=uid).all()
    return jsonify([i.product_id for i in items])


@wishlist_bp.route('/<int:pid>', methods=['POST'])
@jwt_required()
def toggle_wishlist(pid):
    uid = int(get_jwt_identity())
    if not Product.query.get(pid):
        return jsonify({'message': 'Product not found.'}), 404

    existing = WishlistItem.query.filter_by(user_id=uid, product_id=pid).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        active = False
    else:
        db.session.add(WishlistItem(user_id=uid, product_id=pid))
        db.session.commit()
        active = True
    return jsonify({'active': active})
