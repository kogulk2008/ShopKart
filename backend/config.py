import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'shopkart-dev-secret-change-me')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'shopkart-jwt-secret-change-me')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)

    # Default: SQLite — zero setup, works immediately.
    # To use MySQL instead, set the DATABASE_URL environment variable, e.g.:
    #   mysql+pymysql://root:password@localhost:3306/shopkart
    # (create the "shopkart" database first: CREATE DATABASE shopkart;)
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', f"sqlite:///{os.path.join(BASE_DIR, 'shopkart.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
