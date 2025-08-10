import os
from flask import Flask
from dotenv import load_dotenv

from app.config import config
from app.utils.logger import setup_logging
from app.extensions import db, migrate, jwt, cors, ma

load_dotenv()


def load_user_limits(app):
    """Load user limits configuration from admin/user_limits.txt into app global property"""
    try:
        # Construct path to user_limits.txt relative to the app directory
        user_limits_path = os.path.join(os.getenv("ADMIN"), "user_limits.txt")

        user_limits = {}
        if os.path.exists(user_limits_path):
            with open(user_limits_path, "r") as file:
                for line in file:
                    line = line.strip()
                    if line and ":" in line:
                        key, value = line.split(":", 1)
                        key = key.strip()
                        value = value.strip()
                        # Try to convert to int if it's a number
                        try:
                            value = int(value)
                        except ValueError:
                            pass
                        user_limits[key] = value

        # Store as a global property on the Flask app
        app.user_limits = user_limits
        app.logger.info(f"User limits configuration loaded: {user_limits}")

    except Exception as e:
        app.logger.error(f"Failed to load user limits configuration: {str(e)}")
        app.user_limits = {}


def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv("FLASK_CONFIG", "default")

    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Load user limits configuration as a global app property
    load_user_limits(app)

    # Setup logging
    logger = setup_logging(app)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app)
    ma.init_app(app)

    # Initialize logger in extensions
    from app.extensions import init_logger

    init_logger()

    # Register blueprints
    from app.api.v1.routes import api_bp

    app.register_blueprint(api_bp, url_prefix="/api/v1")

    @app.route("/api/v1/health")
    def health_check():
        return {"status": "healthy", "message": "API is running"}

    return app
