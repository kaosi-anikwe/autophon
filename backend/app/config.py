import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")

    # Database configuration
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT configuration
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # JWT Cookie configuration
    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_ACCESS_COOKIE_NAME = "access_token"
    JWT_REFRESH_COOKIE_NAME = "refresh_token"
    JWT_COOKIE_SECURE = True  # Secure cookies for HTTPS
    JWT_COOKIE_HTTPONLY = True
    JWT_COOKIE_SAMESITE = "Lax"  # Same-origin setup
    JWT_COOKIE_CSRF_PROTECT = False  # Can enable for extra CSRF protection
    JWT_COOKIE_DOMAIN = None  # Same-origin, no domain needed

    # CORS configuration
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "https://new.autophontest.se").split(",")
    CORS_SUPPORTS_CREDENTIALS = True


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False

    # Secure cookies for production
    JWT_COOKIE_SECURE = True  # Require HTTPS for cookies


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}
