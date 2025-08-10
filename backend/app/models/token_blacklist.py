from datetime import datetime, timezone

from app.extensions import db
from .base import TimestampMixin, DatabaseHelperMixin


class TokenBlacklist(db.Model, TimestampMixin, DatabaseHelperMixin):
    """Model for storing blacklisted JWT tokens"""

    __tablename__ = "token_blacklist"

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), unique=True, nullable=False, index=True)  # JWT ID
    token_type = db.Column(db.String(20), nullable=False)  # 'access' or 'refresh'
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    expires = db.Column(db.DateTime, nullable=False)
    revoked_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    reason = db.Column(
        db.String(100)
    )  # 'logout', 'password_change', 'admin_revoke', etc.

    def __repr__(self):
        return f"<TokenBlacklist jti={self.jti} type={self.token_type}>"

    @classmethod
    def is_jti_blacklisted(cls, jti):
        """Check if a JTI is blacklisted"""
        token = cls.query.filter_by(jti=jti).first()
        return token is not None

    @classmethod
    def add_token_to_blacklist(cls, jti, token_type, user_id, expires, reason=None):
        """Add a token to the blacklist"""
        if cls.is_jti_blacklisted(jti):
            return  # Token already blacklisted

        blacklisted_token = cls(
            jti=jti,
            token_type=token_type,
            user_id=user_id,
            expires=expires,
            reason=reason,
        )
        blacklisted_token.insert()
        return blacklisted_token

    @classmethod
    def revoke_all_user_tokens(cls, user_id, reason="admin_revoke"):
        """Revoke all tokens for a specific user by updating their revocation timestamp"""
        from app.models.user import User

        user = User.query.get(user_id)
        if not user:
            return None

        # Set the global revocation timestamp for this user
        # This will invalidate all tokens issued before this timestamp
        revoked_at = user.revoke_all_tokens(reason=reason)

        return {
            "user_id": user_id,
            "revoked_at": revoked_at,
            "reason": reason,
            "message": "All tokens for this user have been revoked",
        }

    @classmethod
    def cleanup_expired_tokens(cls):
        """Remove expired tokens from blacklist to prevent table growth"""
        now = datetime.now(timezone.utc)
        expired_tokens = cls.query.filter(cls.expires < now).all()

        for token in expired_tokens:
            token.delete()

        return len(expired_tokens)
