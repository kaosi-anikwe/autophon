import os
from datetime import datetime
from enum import Enum

from app.extensions import db
from .base import TimestampMixin, DatabaseHelperMixin


class LanguageType(Enum):
    NORDIC = "nordic"
    OTHER = "other"
    FUTURE = "future"


class Language(db.Model, TimestampMixin, DatabaseHelperMixin):
    __tablename__ = "languages"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False)
    display_name = db.Column(db.String(200), nullable=False)
    language_name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.Enum(LanguageType), nullable=False)
    alphabet = db.Column(db.String(100), nullable=False)
    priority = db.Column(db.Integer, nullable=False, default=99)
    homepage = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=False)

    # File tracking fields
    has_cite_file = db.Column(db.Boolean, default=False)
    has_cleanup_file = db.Column(db.Boolean, default=False)
    has_complex2simple_file = db.Column(db.Boolean, default=False)
    has_g2p_model = db.Column(db.Boolean, default=False)
    has_ipa_file = db.Column(db.Boolean, default=False)
    has_meta_file = db.Column(db.Boolean, default=False)
    has_simple_dict = db.Column(db.Boolean, default=False)
    has_normal_dict = db.Column(db.Boolean, default=False)
    has_dict_json = db.Column(db.Boolean, default=False)
    has_guide_pdf = db.Column(db.Boolean, default=False)
    has_model_zip = db.Column(db.Boolean, default=False)

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

    def get_language_dir(self):
        """Get the directory path for this language's files"""
        admin_path = os.getenv("ADMIN", "")
        return os.path.join(admin_path, self.code)

    def get_file_path(self, file_type):
        """Get the full path for a specific file type"""
        language_dir = self.get_language_dir()
        file_mappings = {
            "cite": f"{self.code}_cite.txt",
            "cleanup": f"{self.code}_cleanup.txt",
            "complex2simple": f"{self.code}_complex2simple.json",
            "g2p_model": f"{self.code}_g2p_model.zip",
            "ipa": f"{self.code}_IPA.json",
            "meta": f"{self.code}_meta.yaml",
            "simple_dict": f"{self.code}_simple.dict",
            "normal_dict": f"{self.code}.dict",
            "dict_json": f"{self.code}.json",
            "guide_pdf": f"{self.code}.pdf",
            "model_zip": f"{self.code}.zip",
        }

        if file_type in file_mappings:
            return os.path.join(language_dir, file_mappings[file_type])
        return None

    def check_file_exists(self, file_type):
        """Check if a specific file exists for this language"""
        file_path = self.get_file_path(file_type)
        if file_path:
            return os.path.exists(file_path)
        return False

    def update_file_status(self):
        """Update the has_* flags based on actual file existence"""
        file_types = [
            "cite",
            "cleanup",
            "complex2simple",
            "g2p_model",
            "ipa",
            "meta",
            "simple_dict",
            "normal_dict",
            "dict_json",
            "guide_pdf",
            "model_zip",
        ]

        for file_type in file_types:
            field_name = (
                f"has_{file_type.replace('_', '_')}_file"
                if file_type.endswith("_model")
                else f"has_{file_type.replace('_', '_')}"
            )
            if file_type == "dict_json":
                field_name = "has_dict_json"
            elif file_type == "guide_pdf":
                field_name = "has_guide_pdf"
            elif file_type == "model_zip":
                field_name = "has_model_zip"
            elif file_type == "g2p_model":
                field_name = "has_g2p_model"
            elif file_type == "simple_dict":
                field_name = "has_simple_dict"
            elif file_type == "normal_dict":
                field_name = "has_normal_dict"
            elif file_type == "complex2simple":
                field_name = "has_complex2simple_file"
            else:
                field_name = f"has_{file_type}_file"

            setattr(self, field_name, self.check_file_exists(file_type))

    def ensure_language_directory(self):
        """Ensure the language directory exists"""
        language_dir = self.get_language_dir()
        if not os.path.exists(language_dir):
            os.makedirs(language_dir, exist_ok=True)
        return language_dir

    def get_file_info(self):
        """Get detailed information about all language files"""
        file_types = [
            "cite",
            "cleanup",
            "complex2simple",
            "g2p_model",
            "ipa",
            "meta",
            "simple_dict",
            "normal_dict",
            "dict_json",
            "guide_pdf",
            "model_zip",
        ]

        file_info = {}
        for file_type in file_types:
            file_path = self.get_file_path(file_type)
            if file_path and os.path.exists(file_path):
                stat = os.stat(file_path)
                file_info[file_type] = {
                    "exists": True,
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                }
            else:
                file_info[file_type] = {"exists": False, "size": None, "modified": None}

        return file_info

    def get_missing_files(self):
        """Get list of missing file types"""
        file_info = self.get_file_info()
        return [
            file_type for file_type, info in file_info.items() if not info["exists"]
        ]

    def get_is_complete(self):
        """Check if all required files are present"""
        return len(self.get_missing_files()) == 0

    def get_alternatives_as_strings(self):
        """Get alternative language codes as list of strings"""
        return [alt.code for alt in self.alternatives]


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
