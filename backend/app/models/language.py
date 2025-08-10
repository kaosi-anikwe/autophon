from enum import Enum

from app.extensions import db
from .base import TimestampMixin


class LanguageType(Enum):
    NORDIC = "nordic"
    OTHER = "other"
    FUTURE = "future"


class Language(db.Model, TimestampMixin):
    __tablename__ = "languages"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False)
    display_name = db.Column(db.String(200), nullable=False)
    language_name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.Enum(LanguageType), nullable=False)
    alphabet = db.Column(db.String(100), nullable=False)
    priority = db.Column(db.Integer, nullable=False, default=99)
    homepage = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)

    # Self-referencing many-to-many for alternatives
    alternatives = db.relationship(
        "Language",
        secondary="language_alternatives",
        primaryjoin="Language.id == language_alternatives.c.language_id",
        secondaryjoin="Language.id == language_alternatives.c.alternative_language_id",
        backref="alternative_for",
        lazy="dynamic",
    )

    # Many-to-many with engines
    engines = db.relationship(
        "Engine", secondary="language_engines", back_populates="languages"
    )

    # Tasks using this language
    tasks = db.relationship("Task", backref="language", lazy=True)

    def __repr__(self):
        return f"<Language {self.code}>"

    @classmethod
    def get_homepage_languages(cls):
        return (
            cls.query.filter_by(homepage=True, is_active=True)
            .order_by(cls.priority)
            .all()
        )

    @classmethod
    def get_by_type(cls, language_type):
        return (
            cls.query.filter_by(type=language_type, is_active=True)
            .order_by(cls.priority)
            .all()
        )

    @classmethod
    def active(cls):
        return cls.query.filter_by(is_active=True).all()


# Association table for language alternatives
language_alternatives = db.Table(
    "language_alternatives",
    db.Column(
        "language_id", db.Integer, db.ForeignKey("languages.id"), primary_key=True
    ),
    db.Column(
        "alternative_language_id",
        db.Integer,
        db.ForeignKey("languages.id"),
        primary_key=True,
    ),
)

# Association table for language-engine relationships
language_engines = db.Table(
    "language_engines",
    db.Column("id", db.Integer, primary_key=True),
    db.Column("language_id", db.Integer, db.ForeignKey("languages.id"), nullable=False),
    db.Column("engine_id", db.Integer, db.ForeignKey("engines.id"), nullable=False),
    db.Column("is_default", db.Boolean, default=False),
    db.UniqueConstraint("language_id", "engine_id", name="unique_language_engine"),
)
