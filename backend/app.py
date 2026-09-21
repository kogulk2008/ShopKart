import os
from flask import Flask, request, jsonify
from extensions import db, jwt, cors
from seed_data import seed_if_empty

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'frontend'))


def create_app():
    app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
    app.config.from_object('config.Config')

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    from routes.auth import auth_bp
    from routes.products import products_bp
    from routes.cart import cart_bp
    from routes.wishlist import wishlist_bp
    from routes.orders import orders_bp
    from routes.payment import payment_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(products_bp, url_prefix='/api/products')
    app.register_blueprint(cart_bp, url_prefix='/api/cart')
    app.register_blueprint(wishlist_bp, url_prefix='/api/wishlist')
    app.register_blueprint(orders_bp, url_prefix='/api/orders')
    app.register_blueprint(payment_bp, url_prefix='/api/payment')
    
    with app.app_context():
        db.create_all()
        seed_if_empty()

    @app.route('/')
    def index():
        return app.send_static_file('index.html')

    # JSON error handlers for the API; anything else falls back to Flask's default.
    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith('/api/'):
            return jsonify({'message': 'Not found.'}), 404
        return app.send_static_file('index.html')

    @app.errorhandler(500)
    def server_error(e):
        if request.path.startswith('/api/'):
            return jsonify({'message': 'Server error. Please try again.'}), 500
        raise e

    return app


app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
