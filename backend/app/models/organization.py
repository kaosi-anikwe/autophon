import unicodedata
from sqlalchemy import Index
from app.extensions import db
from .base import DatabaseHelperMixin, TimestampMixin


class Organization(db.Model, TimestampMixin, DatabaseHelperMixin):
    __tablename__ = "organizations"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(500), nullable=False, unique=True)
    normalized_name = db.Column(
        db.String(500), nullable=False
    )  # For efficient searching
    active = db.Column(db.Boolean, default=True, nullable=False)

    # Create index for fast searching
    __table_args__ = (
        Index("ix_organization_normalized_name", "normalized_name"),
        Index("ix_organization_active", "active"),
    )

    def __init__(self, name, **kwargs):
        super(Organization, self).__init__(**kwargs)
        self.name = name
        self.normalized_name = self.normalize_name(name)

    @staticmethod
    def normalize_name(name):
        """
        Normalize name for efficient searching and duplicate detection.
        This handles Unicode variations (e.g., ü vs u, é vs e) and case differences.
        """
        if not name:
            return ""

        # Strip whitespace
        name = name.strip()

        # Normalize Unicode: NFD decomposes characters, then we remove diacritical marks
        normalized = unicodedata.normalize("NFD", name)
        # Remove diacritical marks (category 'Mn' = nonspacing marks)
        ascii_name = "".join(
            char for char in normalized if unicodedata.category(char) != "Mn"
        )

        # Convert to lowercase for case-insensitive comparison
        return ascii_name.lower()

    def update_name(self, new_name):
        """Update organization name and normalized version"""
        self.name = new_name
        self.normalized_name = self.normalize_name(new_name)

    @classmethod
    def search(cls, query, limit=50):
        """Search organizations by name with case-insensitive partial matching"""
        if not query:
            return cls.query.filter_by(active=True).limit(limit).all()

        normalized_query = cls.normalize_name(query)
        return (
            cls.query.filter(
                cls.active == True, cls.normalized_name.contains(normalized_query)
            )
            .limit(limit)
            .all()
        )

    @classmethod
    def get_all_active(cls, limit=None):
        """Get all active organizations"""
        query = cls.query.filter_by(active=True)
        if limit:
            query = query.limit(limit)
        return query.all()

    def __repr__(self):
        return f"<Organization {self.name}>"
