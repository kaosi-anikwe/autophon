import uuid
from sqlalchemy import DateTime

from app.extensions import db
from app.utils.helpers import generate_user_icon
from .base import DatabaseHelperMixin, TimestampMixin


class User(db.Model, TimestampMixin, DatabaseHelperMixin):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(50), unique=True)
    title = db.Column(db.String(10))
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    email = db.Column(db.String(120), unique=True, nullable=False)
    verified = db.Column(db.Boolean, default=False)
    trans_default = db.Column(db.String(10))
    dict_default = db.Column(db.String(20))
    edited = db.Column(db.Boolean, default=False)
    org = db.Column(db.String(500))
    industry = db.Column(db.String(255))
    admin = db.Column(db.Boolean, default=False)
    deleted = db.Column(db.String(100))
    password_hash = db.Column(db.String(255), nullable=False)
    tokens_revoked_at = db.Column(
        DateTime(timezone=True)
    )  # For global token invalidation

    # Relationships - defined after class definition to avoid circular imports

    def __init__(self, **kwargs):
        super(User, self).__init__(**kwargs)
        if not self.uuid:
            self.uuid = self.generate_unique_uuid()

    @staticmethod
    def generate_unique_uuid():
        """Generate a unique 6-character UUID"""
        while True:
            new_uuid = uuid.uuid4().hex[:6]
            if not User.query.filter_by(uuid=new_uuid).first():
                return new_uuid

    def display_name(self):
        # Return concatenation of name components
        if self.title and self.title != "No title":
            return f"{self.title} {self.first_name} {self.last_name}"
        else:
            return f"{self.first_name} {self.last_name}"

    def profile_image(self, force=False):
        return generate_user_icon(
            f"{self.first_name} {self.last_name}", self.uuid, force
        ) if not self.deleted else ""

    def revoke_all_tokens(self, reason="manual"):
        """Revoke all tokens for this user by updating the revocation timestamp"""
        from app.utils.datetime_helpers import utc_now
        from app.utils.logger import get_logger

        logger = get_logger(__name__)

        self.tokens_revoked_at = utc_now()
        self.update()
        logger.info(
            f"All tokens revoked for user {self.email} (ID: {self.id}) - Reason: {reason}"
        )
        return self.tokens_revoked_at

    def __repr__(self):
        return self.display_name()


# Configure relationships after imports
def configure_relationships():
    """Configure model relationships after all models are imported"""
    User.tasks = db.relationship(
        "Task", backref="owner", lazy=True, cascade="all, delete-orphan"
    )
    User.dictionaries = db.relationship("UserDictionary", backref="owner", lazy=True)
