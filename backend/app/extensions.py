from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_marshmallow import Marshmallow

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
cors = CORS()
ma = Marshmallow()

# Import logger (will be initialized after app creation)
logger = None

def init_logger():
    """Initialize logger after app setup"""
    global logger
    from app.utils.logger import get_logger
    logger = get_logger(__name__)


# JWT Token Blacklist Callbacks
@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    """Check if token is blacklisted or user tokens are revoked"""
    from app.models.token_blacklist import TokenBlacklist
    from app.models.user import User
    from datetime import datetime, timezone

    jti = jwt_payload["jti"]
    user_id = jwt_payload["sub"]
    token_issued_at = datetime.fromtimestamp(jwt_payload["iat"], tz=timezone.utc)

    # Check if token is specifically blacklisted
    if TokenBlacklist.is_jti_blacklisted(jti):
        if logger:
            logger.warning(f"Blocked blacklisted token for user {user_id}: {jti}")
        return True

    # Check if all user tokens have been revoked
    user = User.query.get(user_id)
    if user and user.tokens_revoked_at:
        if token_issued_at < user.tokens_revoked_at:
            if logger:
                logger.warning(f"Blocked revoked token for user {user_id}: token issued at {token_issued_at}")
            return True

    return False


@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    """Return error response when token is revoked"""
    user_id = jwt_payload.get("sub")
    if logger:
        logger.warning(f"Revoked token access attempted for user {user_id}")
    return {"message": "Token has been revoked", "error": "token_revoked"}, 401


@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    """Return error response when token is expired"""
    user_id = jwt_payload.get("sub")
    if logger:
        logger.info(f"Expired token access attempted for user {user_id}")
    return {"message": "Token has expired", "error": "token_expired"}, 401


@jwt.invalid_token_loader
def invalid_token_callback(error):
    """Return error response when token is invalid"""
    if logger:
        logger.warning(f"Invalid token access attempted: {error}")
    return {"message": "Invalid token", "error": "invalid_token"}, 401


@jwt.unauthorized_loader
def missing_token_callback(error):
    """Return error response when token is missing"""
    if logger:
        logger.info(f"Unauthorized access attempted: {error}")
    return {
        "message": "Authorization token is required",
        "error": "authorization_required",
    }, 401
