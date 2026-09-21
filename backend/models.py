import json
from datetime import datetime, timezone
from sqlalchemy import Text
from sqlalchemy.dialects.mysql import LONGTEXT
from extensions import db

# Product images are base64 data URLs which can be large — use LONGTEXT on
# MySQL (TEXT there caps at ~64KB) while staying plain TEXT on SQLite.
LongText = Text().with_variant(LONGTEXT, 'mysql')


def utcnow():
    return datetime.now(timezone.utc)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(20))
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='customer')  # 'customer' | 'seller'
    addresses = db.Column(db.Text, default='[]')  # JSON list of saved addresses
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'role': self.role,
            'addresses': json.loads(self.addresses or '[]'),
            'joined': self.created_at.isoformat(),
        }


class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(80), nullable=False, index=True)
    price = db.Column(db.Integer, nullable=False)
    original_price = db.Column(db.Integer)
    discount = db.Column(db.Integer, default=0)
    rating = db.Column(db.Float, default=4.0)
    stock = db.Column(db.Integer, default=0)
    image = db.Column(LongText)
    description = db.Column(db.Text)
    specs = db.Column(db.Text, default='{}')  # JSON object
    seller_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'price': self.price,
            'originalPrice': self.original_price,
            'discount': self.discount,
            'rating': self.rating,
            'stock': self.stock,
            'image': self.image,
            'description': self.description,
            'specs': json.loads(self.specs or '{}'),
            'sellerId': self.seller_id,
        }


class CartItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    qty = db.Column(db.Integer, default=1)
    __table_args__ = (db.UniqueConstraint('user_id', 'product_id', name='uq_cart_user_product'),)


class WishlistItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    __table_args__ = (db.UniqueConstraint('user_id', 'product_id', name='uq_wish_user_product'),)


class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_code = db.Column(db.String(20), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    address = db.Column(db.Text)

    payment_method = db.Column(db.String(20))

    # Order status
    status = db.Column(db.String(20), default='Ordered')

    # Payment information
    payment_status = db.Column(db.String(20), default='Pending')
    razorpay_order_id = db.Column(db.String(100), nullable=True)
    razorpay_payment_id = db.Column(db.String(100), nullable=True)

    subtotal = db.Column(db.Integer, default=0)
    discount = db.Column(db.Integer, default=0)
    delivery = db.Column(db.Integer, default=0)
    total = db.Column(db.Integer, default=0)

    created_at = db.Column(db.DateTime, default=utcnow)

    user = db.relationship('User', backref='orders')
    items = db.relationship(
        'OrderItem',
        backref='order',
        cascade='all, delete-orphan'
    )
    def to_dict(self):
        return {
            'id': self.order_code,
            'date': self.created_at.isoformat(),
            'status': self.status,
            'payment':self.payment_method,
            'paymentStatus': self.payment_status,
            'razorpayOrderId': self.razorpay_order_id,
            'razorpayPaymentId': self.razorpay_payment_id,
            'address': json.loads(self.address or '{}'),
            'totals': {
                'subtotal': self.subtotal,
                'discount': self.discount,
                'delivery': self.delivery,
                'total': self.total,
            },
            'items': [i.to_dict() for i in self.items],
            'userEmail': self.user.email if self.user else None,
        }


class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    product_id = db.Column(db.Integer)
    name = db.Column(db.String(200))
    image = db.Column(LongText)
    price = db.Column(db.Integer)
    qty = db.Column(db.Integer)

    def to_dict(self):
        return {'id': self.product_id, 'name': self.name, 'image': self.image, 'price': self.price, 'qty': self.qty}
