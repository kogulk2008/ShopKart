import json
import os
import time
import hmac
import hashlib

import razorpay

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models import User, Product, CartItem, Order, OrderItem
from dotenv import load_dotenv

load_dotenv()

payment_bp = Blueprint('payment', __name__)


# =========================================================
# RAZORPAY CONFIGURATION
# =========================================================

RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET')


if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
    raise RuntimeError(
        'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not configured.'
    )


razorpay_client = razorpay.Client(
    auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
)


# =========================================================
# HELPER: CALCULATE CART TOTAL
# Uses the SAME pricing logic as orders.py
# =========================================================

def calculate_cart_total(user_id):
    cart_items = CartItem.query.filter_by(user_id=user_id).all()

    if not cart_items:
        return None, 'Your cart is empty.'

    subtotal = 0
    original_total = 0
    line_items = []

    for cart_item in cart_items:

        product = Product.query.get(cart_item.product_id)

        if not product:
            return None, 'A product in your cart no longer exists.'

        if cart_item.qty <= 0:
            return None, f'Invalid quantity for {product.name}.'

        if product.stock < cart_item.qty:
            return None, f'{product.name} no longer has enough stock.'

        subtotal += product.price * cart_item.qty

        original_total += (
            product.original_price or product.price
        ) * cart_item.qty

        line_items.append((product, cart_item.qty))

    discount = max(
        0,
        original_total - subtotal
    )

    # EXACT SAME RULE AS orders.py
    delivery = 79 if 0 < subtotal < 999 else 0

    # IMPORTANT:
    # Your existing orders.py uses subtotal + delivery.
    # Discount is displayed separately and is already reflected
    # in product.price.
    total = subtotal + delivery

    return {
        'cart_items': cart_items,
        'line_items': line_items,
        'subtotal': subtotal,
        'discount': discount,
        'delivery': delivery,
        'total': total
    }, None


# =========================================================
# CREATE RAZORPAY ORDER
# POST /api/payment/create-order
# =========================================================

@payment_bp.route('/create-order', methods=['POST'])
@jwt_required()
def create_payment_order():

    uid = int(get_jwt_identity())

    user = User.query.get(uid)

    if not user:
        return jsonify({
            'message': 'User not found.'
        }), 404

    cart_data, error = calculate_cart_total(uid)

    if error:
        return jsonify({
            'message': error
        }), 400

    total = cart_data['total']

    if total <= 0:
        return jsonify({
            'message': 'Invalid order amount.'
        }), 400

    # Razorpay expects amount in the smallest currency unit.
    # ₹100 = 10000 paise.
    amount_paise = total * 100

    # Create a unique receipt
    receipt = f'SK_{uid}_{int(time.time())}'

    try:

        razorpay_order = razorpay_client.order.create({
            'amount': amount_paise,
            'currency': 'INR',
            'receipt': receipt,
            'partial_payment': False,
            'notes': {
                'user_id': str(uid)
            }
        })

    except Exception as e:

        print('Razorpay order creation error:', str(e))

        return jsonify({
            'message': 'Unable to create payment order.'
        }), 500

    return jsonify({

        'message': 'Razorpay order created.',

        # Public key only
        'key_id': RAZORPAY_KEY_ID,

        # Razorpay Order ID
        'razorpay_order_id': razorpay_order['id'],

        # Amount in paise
        'amount': amount_paise,

        'currency': 'INR',

        # Useful for displaying checkout summary
        'summary': {
            'subtotal': cart_data['subtotal'],
            'discount': cart_data['discount'],
            'delivery': cart_data['delivery'],
            'total': cart_data['total']
        }

    }), 200


# =========================================================
# VERIFY RAZORPAY PAYMENT
# POST /api/payment/verify-payment
# =========================================================

@payment_bp.route('/verify-payment', methods=['POST'])
@jwt_required()
def verify_payment():

    uid = int(get_jwt_identity())

    user = User.query.get(uid)

    if not user:
        return jsonify({
            'message': 'User not found.'
        }), 404

    data = request.get_json(silent=True) or {}

    razorpay_order_id = data.get('razorpay_order_id')
    razorpay_payment_id = data.get('razorpay_payment_id')
    razorpay_signature = data.get('razorpay_signature')
    address = data.get('address', {})

    # -----------------------------------------------------
    # Validate required fields
    # -----------------------------------------------------

    if not razorpay_order_id:
        return jsonify({
            'message': 'Razorpay order ID is missing.'
        }), 400

    if not razorpay_payment_id:
        return jsonify({
            'message': 'Razorpay payment ID is missing.'
        }), 400

    if not razorpay_signature:
        return jsonify({
            'message': 'Razorpay signature is missing.'
        }), 400

    # -----------------------------------------------------
    # Verify signature
    # -----------------------------------------------------

    generated_signature = hmac.new(
        RAZORPAY_KEY_SECRET.encode('utf-8'),
        f'{razorpay_order_id}|{razorpay_payment_id}'.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(
        generated_signature,
        razorpay_signature
    ):
        return jsonify({
            'message': 'Payment verification failed.'
        }), 400

    # -----------------------------------------------------
    # Check whether this payment was already processed
    # -----------------------------------------------------

    existing_order = Order.query.filter_by(
        razorpay_payment_id=razorpay_payment_id
    ).first()

    if existing_order:

        return jsonify({
            'message': 'Payment was already processed.',
            'order': existing_order.to_dict()
        }), 200

    # -----------------------------------------------------
    # Recalculate cart from DATABASE
    # Never trust browser amount
    # -----------------------------------------------------

    cart_data, error = calculate_cart_total(uid)

    if error:
        return jsonify({
            'message': error
        }), 400

    # -----------------------------------------------------
    # Check Razorpay order ID belongs to the expected order
    # -----------------------------------------------------

    try:

        razorpay_order = razorpay_client.order.fetch(
            razorpay_order_id
        )

    except Exception as e:

        print('Razorpay order fetch error:', str(e))

        return jsonify({
            'message': 'Unable to verify Razorpay order.'
        }), 400

    expected_amount = cart_data['total'] * 100

    if razorpay_order.get('amount') != expected_amount:

        return jsonify({
            'message': 'Payment amount does not match the order.'
        }), 400

    if razorpay_order.get('currency') != 'INR':

        return jsonify({
            'message': 'Invalid payment currency.'
        }), 400

    # -----------------------------------------------------
    # Create ShopKart order
    # -----------------------------------------------------

    try:

        order_code = 'SK' + str(int(time.time()))[-8:]

        # Avoid extremely unlikely duplicate order code
        while Order.query.filter_by(
            order_code=order_code
        ).first():

            time.sleep(1)

            order_code = 'SK' + str(int(time.time()))[-8:]

        order = Order(

            order_code=order_code,

            user_id=uid,

            address=json.dumps(address),

            payment_method='razorpay',

            status='Ordered',

            payment_status='Paid',

            razorpay_order_id=razorpay_order_id,

            razorpay_payment_id=razorpay_payment_id,

            subtotal=cart_data['subtotal'],

            discount=cart_data['discount'],

            delivery=cart_data['delivery'],

            total=cart_data['total']

        )

        db.session.add(order)

        db.session.flush()

        # -------------------------------------------------
        # Add order items + reduce stock
        # -------------------------------------------------

        for product, qty in cart_data['line_items']:

            # Re-check stock immediately before updating
            if product.stock < qty:

                db.session.rollback()

                return jsonify({
                    'message': (
                        f'{product.name} is no longer '
                        'available in the requested quantity.'
                    )
                }), 400

            db.session.add(OrderItem(

                order_id=order.id,

                product_id=product.id,

                name=product.name,

                image=product.image,

                price=product.price,

                qty=qty

            ))

            product.stock -= qty

        # -------------------------------------------------
        # Save address to user profile
        # -------------------------------------------------

        addresses = json.loads(
            user.addresses or '[]'
        )

        if address:

            addresses.append(address)

            user.addresses = json.dumps(addresses)

            if address.get('name'):
                user.name = address['name']

            if address.get('phone'):
                user.phone = address['phone']

        # -------------------------------------------------
        # Clear cart
        # -------------------------------------------------

        CartItem.query.filter_by(
            user_id=uid
        ).delete()

        # -------------------------------------------------
        # Save everything
        # -------------------------------------------------

        db.session.commit()

        return jsonify({

            'message': 'Payment successful and order created.',

            'order': order.to_dict()

        }), 201

    except Exception as e:

        db.session.rollback()

        print('Order creation error:', str(e))

        return jsonify({
            'message': 'Payment was verified, but order creation failed. Please contact support.'
        }), 500