import secrets
from datetime import timedelta
from sqlalchemy import DateTime, Enum
import enum

from app.extensions import db
from .base import DatabaseHelperMixin, TimestampMixin
from app.utils.datetime_helpers import utc_now, make_utc_aware


class TokenType(enum.Enum):
    PASSWORD_RESET = "password_reset"
    EMAIL_VERIFICATION = "email_verification"


class VerificationToken(db.Model, TimestampMixin, DatabaseHelperMixin):
    __tablename__ = "verification_tokens"

    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(255), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    token_type = db.Column(Enum(TokenType), nullable=False)
    expires_at = db.Column(DateTime(timezone=True), nullable=False)
    used = db.Column(db.Boolean, default=False)
    used_at = db.Column(DateTime(timezone=True))

    # Relationship
    user = db.relationship("User", backref="verification_tokens")

    def __init__(self, user_id, token_type, expires_in_hours=24):
        super(VerificationToken, self).__init__()
        self.user_id = user_id
        self.token_type = token_type
        self.token = self.generate_token()
        self.expires_at = utc_now() + timedelta(hours=expires_in_hours)

    @staticmethod
    def generate_token():
        """Generate a secure random token"""
        return secrets.token_urlsafe(32)

    def is_valid(self):
        """Check if token is valid (not used and not expired)"""
        return not self.used and make_utc_aware(self.expires_at) > utc_now()

    def mark_as_used(self):
        """Mark token as used"""
        self.used = True
        self.used_at = utc_now()
        self.update()

    @classmethod
    def get_valid_token(cls, token, token_type):
        """Get a valid token by token string and type"""
        token_obj = cls.query.filter_by(
            token=token, token_type=token_type, used=False
        ).first()

        if token_obj and token_obj.is_valid():
            return token_obj
        return None

    @classmethod
    def cleanup_expired_tokens(cls):
        """Remove expired tokens from database"""
        expired_tokens = cls.query.filter(cls.expires_at < utc_now()).all()
        count = len(expired_tokens)

        for token in expired_tokens:
            token.delete()

        return count

    @classmethod
    def revoke_user_tokens(cls, user_id, token_type=None):
        """Revoke all tokens for a user (optionally filtered by type)"""
        query = cls.query.filter_by(user_id=user_id, used=False)

        if token_type:
            query = query.filter_by(token_type=token_type)

        tokens = query.all()
        count = len(tokens)

        for token in tokens:
            token.mark_as_used()

        return count

    def __repr__(self):
        return f"<VerificationToken {self.token_type.value} for user {self.user_id}>"
