import uuid

from app.extensions import db
from app.utils.helpers import generate_user_icon
from .base import DatabaseHelperMixin, TimestampMixin


class User(db.Model, TimestampMixin, DatabaseHelperMixin):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(6), unique=True)
    title = db.Column(db.String(10))
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    email = db.Column(db.String(120), unique=True, nullable=False)
    verified = db.Column(db.Boolean, default=False)
    edited = db.Column(db.Boolean, default=False)
    org = db.Column(db.String(500))
    industry = db.Column(db.String(255))
    admin = db.Column(db.Boolean, default=False)
    deleted = db.Column(db.String(100))
    password_hash = db.Column(db.String(255), nullable=False)
    tokens_revoked_at = db.Column(db.DateTime)  # For global token invalidation

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
        if self.title:
            return f"{self.title} {self.first_name} {self.last_name}"
        else:
            return f"{self.first_name} {self.last_name}"

    def profile_image(self, force=False):
        return generate_user_icon(f"{self.first_name} {self.last_name}", self.id, force)

    def revoke_all_tokens(self, reason="manual"):
        """Revoke all tokens for this user by updating the revocation timestamp"""
        from datetime import datetime, timezone

        self.tokens_revoked_at = datetime.now(timezone.utc)
        self.update()
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
