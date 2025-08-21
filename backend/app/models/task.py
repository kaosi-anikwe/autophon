from enum import Enum
from app.extensions import db
from sqlalchemy import DateTime

from .base import TimestampMixin, DatabaseHelperMixin


class TaskStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    UPLOADED = "uploaded"
    UPLOADING = "uploading"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    ALIGNED = "aligned"
    EXPIRED = "expired"


class FileType(Enum):
    AUDIO = "audio"
    TEXTGRID = "textgrid"
    HELD = "held"
    OUTPUT = "output"
    LOG = "log"


class Task(db.Model, TimestampMixin, DatabaseHelperMixin):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.String(100), unique=True, nullable=False)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id")
    )  # nullable due to anonymous users

    # Anonymous user identifier
    user_uuid = db.Column(db.String(50))

    # language and engine relationships
    lang_id = db.Column(db.Integer, db.ForeignKey("languages.id"))
    engine_id = db.Column(db.Integer, db.ForeignKey("engines.id"))

    # Basic info
    task_status = db.Column(db.Enum(TaskStatus), default=TaskStatus.PENDING)
    anonymous = db.Column(db.Boolean, default=False)
    trans_choice = db.Column(db.String(50))
    lang = db.Column(db.String(100))

    # Paths
    task_path = db.Column(db.String(500))
    log_path = db.Column(db.String(500))
    download_path = db.Column(db.String(500))
    missingprondict = db.Column(db.String(500))
    final_temp = db.Column(db.String(500))

    # Processing results
    size = db.Column(db.Numeric(10, 1))
    words = db.Column(db.Integer)
    missing_words = db.Column(db.Integer)
    duration = db.Column(db.Integer)
    no_of_files = db.Column(db.Integer, default=1)
    no_of_tiers = db.Column(db.Integer, default=1)
    multitier = db.Column(db.Boolean, default=False)
    pre_error = db.Column(db.Boolean, default=False)
    cancelled = db.Column(db.Boolean, default=False)

    # Download info
    download_title = db.Column(db.String(255))
    download_counts = db.Column(db.Integer, default=0)
    download_date = db.Column(db.String(50))
    deleted = db.Column(db.String(255))

    # Processing metadata
    pid = db.Column(db.Integer)
    aligned = db.Column(DateTime(timezone=True))

    # Relationships
    files = db.relationship(
        "TaskFile", backref="task", lazy=True, cascade="all, delete-orphan"
    )
    file_names = db.relationship(
        "TaskFileName", backref="task", lazy=True, cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Task {self.task_id}>"


class TaskFile(db.Model, TimestampMixin, DatabaseHelperMixin):
    __tablename__ = "task_files"

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("tasks.id"), nullable=False)
    file_type = db.Column(db.Enum(FileType), nullable=False)
    file_path = db.Column(db.String(1000), nullable=False)
    original_filename = db.Column(db.String(255))
    file_key = db.Column(db.String(100))


class TaskFileName(db.Model, TimestampMixin, DatabaseHelperMixin):
    __tablename__ = "task_file_names"

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("tasks.id"), nullable=False)
    file_key = db.Column(db.String(100), nullable=False)
    original_name = db.Column(db.String(255), nullable=False)

    __table_args__ = (
        db.UniqueConstraint("task_id", "file_key", name="unique_task_file_key"),
    )
