from enum import Enum
from decimal import Decimal
from marshmallow import Schema, fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models.task import Task, TaskFile, TaskFileName


class TaskStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class FileType(Enum):
    AUDIO = "audio"
    TEXTGRID = "textgrid"
    HELD = "held"
    OUTPUT = "output"


class TaskFileSchema(SQLAlchemyAutoSchema):
    """Schema for TaskFile model"""

    class Meta:
        model = TaskFile
        load_instance = True

    file_type = fields.Enum(FileType, by_value=True)


class TaskFileNameSchema(SQLAlchemyAutoSchema):
    """Schema for TaskFileName model"""

    class Meta:
        model = TaskFileName
        load_instance = True


class TaskSchema(SQLAlchemyAutoSchema):
    """Schema for serializing Task model"""

    class Meta:
        model = Task
        load_instance = True

    # Enum field
    task_status = fields.Enum(TaskStatus, by_value=True)

    # Decimal field
    size = fields.Decimal(as_string=True)

    # Nested relationships
    owner = fields.Nested("UserPublicSchema", dump_only=True)
    language = fields.Nested("LanguageSimpleSchema", dump_only=True)
    engine = fields.Nested("EngineSimpleSchema", dump_only=True)
    files = fields.Nested(TaskFileSchema, many=True, dump_only=True)
    file_names = fields.Nested(TaskFileNameSchema, many=True, dump_only=True)


class TaskCreateSchema(Schema):
    """Schema for creating new tasks"""

    task_id = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    user_id = fields.Int(required=True)
    lang_id = fields.Int()
    engine_id = fields.Int()
    anonymous = fields.Bool(missing=False)
    trans_choice = fields.Str(validate=validate.Length(max=50))
    lang = fields.Str(validate=validate.Length(max=100))
    multitier = fields.Bool(missing=False)
    no_of_files = fields.Int(validate=validate.Range(min=1), missing=1)
    no_of_tiers = fields.Int(validate=validate.Range(min=1), missing=1)


class TaskUpdateSchema(Schema):
    """Schema for updating existing tasks"""

    task_status = fields.Enum(TaskStatus, by_value=True)
    anonymous = fields.Bool()
    trans_choice = fields.Str(validate=validate.Length(max=50))
    task_path = fields.Str(validate=validate.Length(max=500))
    log_path = fields.Str(validate=validate.Length(max=500))
    download_path = fields.Str(validate=validate.Length(max=500))
    missingprondict = fields.Str(validate=validate.Length(max=500))
    size = fields.Decimal()
    words = fields.Int(validate=validate.Range(min=0))
    missing_words = fields.Int(validate=validate.Range(min=0))
    duration = fields.Int(validate=validate.Range(min=0))
    download_title = fields.Str(validate=validate.Length(max=255))
    download_counts = fields.Int(validate=validate.Range(min=0))
    download_date = fields.Str(validate=validate.Length(max=50))
    pre_error = fields.Bool()
    cancelled = fields.Bool()
    pid = fields.Int()
    aligned = fields.DateTime()


class TaskSimpleSchema(Schema):
    """Simple schema for task references"""

    id = fields.Int(dump_only=True)
    task_id = fields.Str(dump_only=True)
    task_status = fields.Enum(TaskStatus, by_value=True, dump_only=True)
    anonymous = fields.Bool(dump_only=True)
    size = fields.Decimal(as_string=True, dump_only=True)
    words = fields.Int(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


class TaskFileCreateSchema(Schema):
    """Schema for creating task files"""

    task_id = fields.Int(required=True)
    file_type = fields.Enum(FileType, by_value=True, required=True)
    file_path = fields.Str(required=True, validate=validate.Length(min=1, max=1000))
    original_filename = fields.Str(validate=validate.Length(max=255))
    file_key = fields.Str(validate=validate.Length(max=100))


class TaskFileNameCreateSchema(Schema):
    """Schema for creating task file names"""

    task_id = fields.Int(required=True)
    file_key = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    original_name = fields.Str(required=True, validate=validate.Length(min=1, max=255))
