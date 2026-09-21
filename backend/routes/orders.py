import json
import time
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Order, OrderItem, CartItem, Product, User

orders_bp = Blueprint('orders', __name__)

VALID_STATUSES = ('Ordered', 'Packed', 'Shipped', 'Delivered')


@orders_bp.route('', methods=['GET'])
@jwt_required()
def list_orders():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({'message': 'User not found.'}), 404

    # Sellers see every order placed on the platform; customers see only their own.
    if user.role == 'seller':
        orders = Order.query.order_by(Order.created_at.desc()).all()
    else:
        orders = Order.query.filter_by(user_id=user.id).order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders])


@orders_bp.route('', methods=['POST'])
@jwt_required()
def place_order():
    uid = int(get_jwt_identity())
    user = User.query.get(uid)
    data = request.get_json(silent=True) or {}
    address = data.get('address', {})
    payment = data.get('payment', 'cod')

    cart_items = CartItem.query.filter_by(user_id=uid).all()
    if not cart_items:
        return jsonify({'message': 'Your cart is empty.'}), 400

    subtotal = 0
    original_total = 0
    line_items = []
    for ci in cart_items:
        product = Product.query.get(ci.product_id)
        if not product or product.stock < ci.qty:
            name = product.name if product else 'A product in your cart'
            return jsonify({'message': f'{name} no longer has enough stock.'}), 400
        subtotal += product.price * ci.qty
        original_total += (product.original_price or product.price) * ci.qty
        line_items.append((product, ci.qty))

    discount = max(0, original_total - subtotal)
    delivery = 79 if 0 < subtotal < 999 else 0
    total = subtotal + delivery

    order = Order(
        order_code='SK' + str(int(time.time()))[-8:],
        user_id=uid, address=json.dumps(address), payment_method=payment,
        status='Ordered', subtotal=subtotal, discount=discount, delivery=delivery, total=total
    )
    db.session.add(order)
    db.session.flush()  # assigns order.id before we attach items

    for product, qty in line_items:
        db.session.add(OrderItem(
            order_id=order.id, product_id=product.id, name=product.name,
            image=product.image, price=product.price, qty=qty
        ))
        product.stock -= qty

    # Save this address to the user's profile for next time
    addresses = json.loads(user.addresses or '[]')
    addresses.append(address)
    user.addresses = json.dumps(addresses)
    if address.get('name'):
        user.name = address['name']
    if address.get('phone'):
        user.phone = address['phone']

    CartItem.query.filter_by(user_id=uid).delete()
    db.session.commit()

    return jsonify(order.to_dict()), 201


@orders_bp.route('/<code>/status', methods=['PUT'])
@jwt_required()
def update_order_status(code):
    user = User.query.get(int(get_jwt_identity()))
    if not user or user.role != 'seller':
        return jsonify({'message': 'Seller access required.'}), 403

    order = Order.query.filter_by(order_code=code).first()
    if not order:
        return jsonify({'message': 'Order not found.'}), 404

    status = (request.get_json(silent=True) or {}).get('status')
    if status not in VALID_STATUSES:
        return jsonify({'message': 'Invalid status.'}), 400

    order.status = status
    db.session.commit()
    return jsonify(order.to_dict())
