import os
from flask import Flask
from app.extensions import db, migrate, jwt, cors, ma
from app.config import config


def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv("FLASK_CONFIG", "default")

    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app)
    ma.init_app(app)

    # Register blueprints
    from app.api.v1.routes import api_bp

    app.register_blueprint(api_bp, url_prefix="/api/v1")

    @app.route("/api/v1/health")
    def health_check():
        return {"status": "healthy", "message": "API is running"}

    return app
