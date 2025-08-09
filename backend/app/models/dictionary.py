from marshmallow import ValidationError

from app.extensions import db
from .base import TimestampMixin, DatabaseHelperMixin


class UserDictionary(db.Model, TimestampMixin, DatabaseHelperMixin):
    __tablename__ = "user_dicts"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    lang = db.Column(db.String(200), nullable=False)

    # Content
    dictionary_content = db.Column(db.Text, nullable=False)
    file_path = db.Column(db.String(500))

    def __repr__(self):
        return f"<UserDictionary {self.name}>"

    def save_to_file(self):
        """Save dictionary conent to file and update file_path"""
        import os
        from .user import User

        upload_dir = os.getenv("UPLOAD_DIR")
        file_path = os.path.join(
            upload_dir, User.query.get().uuid, "dicts", f"{self.lang}.dict"
        )
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        # write content to file
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(self.dictionary_content)

        # update record
        self.file_path = file_path
        self.insert()

        return file_path

    @classmethod
    def get_user_dictionaries(cls, user_id):
        return cls.query.filter_by(user_id=user_id).all()

    def validate_content_size(self):
        """Validate dictionary content doesn't exceed 50,000 characters"""
        if len(self.dictionary_content) > 50000:
            raise ValidationError("Dictionary content cannot exceed 50,000 characters")
