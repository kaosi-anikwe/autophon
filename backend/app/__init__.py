import os
from flask import Flask
from dotenv import load_dotenv

from app.config import config
from app.utils.logger import setup_logging
from app.extensions import db, migrate, jwt, cors, ma, bc

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


def load_audio_extensions(app):
    """Load audio extensions configuration from admin/audio_extensions.txt into app global property"""
    try:
        # Construct path to audio_extensions.txt
        audio_extensions_path = os.path.join(os.getenv("ADMIN"), "audio_extensions.txt")

        audio_extensions = []
        if os.path.exists(audio_extensions_path):
            with open(audio_extensions_path, "r") as file:
                for line in file:
                    extension = line.strip()
                    if extension:
                        audio_extensions.append(extension)

        # Store as a global property on the Flask app
        app.audio_extensions = audio_extensions
        app.logger.info(f"Audio extensions configuration loaded: {audio_extensions}")

    except Exception as e:
        app.logger.error(f"Failed to load audio extensions configuration: {str(e)}")
        app.audio_extensions = []


def load_site_status(app):
    """Load site active status from admin/switch.txt into app global property"""
    try:
        # Construct path to switch.txt
        switch_path = os.path.join(
            os.getenv("ADMIN_UPDATES", os.getenv("ADMIN", "")), "switch.txt"
        )

        site_active = True  # Default to active
        if os.path.exists(switch_path):
            with open(switch_path, "r") as file:
                status_lines = file.readlines()
                if status_lines:
                    site_active = status_lines[0].strip() == "on"

        # Store as a global property on the Flask app
        app.site_active = site_active
        app.logger.info(f"Site active status loaded: {site_active}")

    except Exception as e:
        app.logger.error(f"Failed to load site active status: {str(e)}")
        app.site_active = True  # Default to active on error


def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv("FLASK_CONFIG", "default")

    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Load configuration files as global app properties
    load_user_limits(app)
    load_audio_extensions(app)
    load_site_status(app)

    # Setup logging
    logger = setup_logging(app)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bc.init_app(app)

    # Configure CORS with credentials support
    cors.init_app(
        app,
        origins=app.config["CORS_ORIGINS"],
        supports_credentials=app.config["CORS_SUPPORTS_CREDENTIALS"],
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["Set-Cookie"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    ma.init_app(app)

    # Initialize logger in extensions
    from app.extensions import init_logger

    init_logger()

    # Register blueprints
    from app.api.v1.routes import api_bp
    from app.api.admin.routes import admin_api_bp

    app.register_blueprint(api_bp, url_prefix="/api/v1")
    app.register_blueprint(admin_api_bp, url_prefix="/api/v1/admin")

    @app.route("/api/v1/health")
    def health_check():
        return {"status": "healthy", "message": "API is running"}

    @app.before_request
    def check_site_status():
        """Check site status before each request with admin bypass"""
        from flask import request, g
        from flask_jwt_extended import get_jwt_identity

        # Reload site status for each request to get real-time updates
        load_site_status(app)

        # Make site status available in request context
        g.site_is_active = getattr(app, "site_active", True)

        # If site is active, allow all requests
        if g.site_is_active:
            return

        # Site is inactive - check authorization and apply restrictions

        # Always allow these endpoints for everyone (no auth required)
        always_allowed = [
            "/api/v1/config",
            "/api/v1/health",
            "/api/v1/admin/site-status",
            "/api/v1/public/languages",
            "/api/v1/engines",
            "/api/v1/team",
            "/api/v1/team-images",
            "/api/v1/contact/send-email",
            "/api/v1/auth/verify",
            "/api/v1/auth/login",
            "/api/v1/auth/logout",
        ]

        # Check if path is always allowed
        if request.path in always_allowed or request.path.startswith("/api/v1/static/"):
            return

        # Check if user is authenticated and is admin
        try:
            # Try to get JWT identity without strict verification
            from flask_jwt_extended import verify_jwt_in_request

            verify_jwt_in_request(optional=True)
            current_user_id = get_jwt_identity()

            if current_user_id:
                from app.models.user import User

                current_user = User.query.get(int(current_user_id))

                # If user is admin, allow access to all routes
                if current_user and current_user.admin:
                    return
        except Exception:
            # JWT verification failed or other error - treat as non-admin
            pass

        # Site is inactive and user is not admin - block access
        return {"message": "Site is currently inactive", "active": False}, 503

    return app
