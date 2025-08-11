"""JWT Helper Functions"""

from flask_jwt_extended import get_jwt_identity


def get_current_user_id():
    """Get current user ID as integer from JWT token"""
    user_id = int(get_jwt_identity())
    return int(user_id) if user_id else None
