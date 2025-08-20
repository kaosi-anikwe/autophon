from marshmallow import Schema, fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models.language import Language, LanguageType


class LanguageSchema(SQLAlchemyAutoSchema):
    """Schema for serializing Language model"""

    class Meta:
        model = Language
        load_instance = True

    # Enum field
    type = fields.Enum(LanguageType, by_value=True)

    # Nested relationships
    engines = fields.Nested(
        "EngineSchema", many=True, dump_only=True, exclude=("languages",)
    )
    alternatives = fields.Nested(
        "LanguageSchema",
        many=True,
        dump_only=True,
        exclude=("alternatives", "engines", "tasks"),
    )
    tasks = fields.Nested(
        "TaskSchema", many=True, dump_only=True, exclude=("language",)
    )


class LanguageCreateSchema(Schema):
    """Schema for creating new languages"""

    code = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    display_name = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    language_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    type = fields.Enum(LanguageType, by_value=True, required=True)
    alphabet = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    priority = fields.Int(validate=validate.Range(min=0), load_default=99)
    homepage = fields.Bool(load_default=False)
    is_active = fields.Bool(load_default=True)


class LanguageUpdateSchema(Schema):
    """Schema for updating existing languages"""

    code = fields.Str(validate=validate.Length(min=1, max=50))
    display_name = fields.Str(validate=validate.Length(min=1, max=200))
    language_name = fields.Str(validate=validate.Length(min=1, max=100))
    type = fields.Enum(LanguageType, by_value=True)
    alphabet = fields.Str(validate=validate.Length(min=1, max=100))
    priority = fields.Int(validate=validate.Range(min=0))
    homepage = fields.Bool()
    is_active = fields.Bool()
    alternatives = fields.List(fields.Str(), load_default=[])


class LanguageSimpleSchema(Schema):
    """Simple schema for language references"""

    id = fields.Int(dump_only=True)
    code = fields.Str(dump_only=True)
    display_name = fields.Str(dump_only=True)
    language_name = fields.Str(dump_only=True)
    type = fields.Enum(LanguageType, by_value=True, dump_only=True)
    is_active = fields.Bool(dump_only=True)


class LanguageHomepageSchema(Schema):
    """Schema for homepage language display"""

    id = fields.Int(dump_only=True)
    code = fields.Str(dump_only=True)
    display_name = fields.Str(dump_only=True)
    language_name = fields.Str(dump_only=True)
    alphabet = fields.Str(dump_only=True)
    priority = fields.Int(dump_only=True)


class LanguageCreateWithFilesSchema(Schema):
    """Schema for creating languages with file uploads"""

    code = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    display_name = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    language_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    type = fields.Enum(LanguageType, by_value=True, required=True)
    alphabet = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    priority = fields.Int(validate=validate.Range(min=0), load_default=99)
    homepage = fields.Bool(load_default=False)
    is_active = fields.Bool(load_default=True)
    alternatives = fields.List(fields.Str(), load_default=[])


class LanguageUpdateWithFilesSchema(Schema):
    """Schema for updating languages with optional file uploads"""

    code = fields.Str(validate=validate.Length(min=1, max=50))
    display_name = fields.Str(validate=validate.Length(min=1, max=200))
    language_name = fields.Str(validate=validate.Length(min=1, max=100))
    type = fields.Enum(LanguageType, by_value=True)
    alphabet = fields.Str(validate=validate.Length(min=1, max=100))
    priority = fields.Int(validate=validate.Range(min=0))
    homepage = fields.Bool()
    is_active = fields.Bool()
    alternatives = fields.List(fields.Str())


class LanguageFileInfoSchema(Schema):
    """Schema for language file information"""

    file_type = fields.Str(dump_only=True)
    exists = fields.Bool(dump_only=True)
    size = fields.Int(dump_only=True, allow_none=True)
    modified = fields.Str(dump_only=True, allow_none=True)
    path = fields.Str(dump_only=True)


class LanguageDetailSchema(LanguageSchema):
    """Extended schema with file information"""

    file_info = fields.Dict(dump_only=True)
    missing_files = fields.List(fields.Str(), dump_only=True)
    is_complete = fields.Bool(dump_only=True)


class AdminLanguageSchema(Schema):
    """Schema for admin language list with complete information"""

    id = fields.Int(dump_only=True)
    code = fields.Str(dump_only=True)
    display_name = fields.Str(dump_only=True)
    language_name = fields.Str(dump_only=True)
    type = fields.Enum(LanguageType, by_value=True, dump_only=True)
    alphabet = fields.Str(dump_only=True)
    priority = fields.Int(dump_only=True)
    homepage = fields.Bool(dump_only=True)
    is_active = fields.Bool(dump_only=True)
    created_at = fields.DateTime(format="iso", dump_only=True)
    updated_at = fields.DateTime(format="iso", dump_only=True)
    file_info = fields.Dict(dump_only=True)
    missing_files = fields.List(fields.Str(), dump_only=True)
    is_complete = fields.Bool(dump_only=True)
    alternatives = fields.List(fields.Str(), dump_only=True)
