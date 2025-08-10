from app.extensions import db
from .base import TimestampMixin


class Engine(db.Model, TimestampMixin):
    __tablename__ = "engines"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    path = db.Column(db.String(100), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    documentation_link = db.Column(db.String(500))
    is_active = db.Column(db.Boolean, default=True)

    # Many-to-many with languages
    languages = db.relationship(
        "Language", secondary="language_engines", back_populates="engines"
    )

    # Tasks using this engine
    tasks = db.relationship("Task", backref="engine", lazy=True)

    def __repr__(self):
        return f"<Engine {self.code}>"
