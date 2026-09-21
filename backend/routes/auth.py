import json
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from extensions import db
from models import User

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = (data.get('phone') or '').strip()
    password = data.get('password') or ''
    role = data.get('role') if data.get('role') in ('customer', 'seller') else 'customer'

    if not name or not email or not password:
        return jsonify({'message': 'Name, email and password are required.'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'message': "An account with this email already exists."}), 409

    user = User(name=name, email=email, phone=phone, role=role,
                password_hash=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': user.to_dict()}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'message': 'Invalid email or password.'}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': user.to_dict()})


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({'message': 'User not found.'}), 404
    return jsonify(user.to_dict())


@auth_bp.route('/address', methods=['POST'])
@jwt_required()
def add_address():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({'message': 'User not found.'}), 404
    data = request.get_json(silent=True) or {}

    addresses = json.loads(user.addresses or '[]')
    addresses.append(data)
    user.addresses = json.dumps(addresses)
    if data.get('name'):
        user.name = data['name']
    if data.get('phone'):
        user.phone = data['phone']
    db.session.commit()
    return jsonify(user.to_dict())
