from marshmallow import Schema, fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models.engine import Engine


class EngineSchema(SQLAlchemyAutoSchema):
    """Schema for serializing Engine model"""

    class Meta:
        model = Engine
        load_instance = True

    # Nested relationships
    languages = fields.Nested("LanguageSimpleSchema", many=True, dump_only=True)
    tasks = fields.Nested("TaskSchema", many=True, dump_only=True, exclude=("engine",))


class EngineCreateSchema(Schema):
    """Schema for creating new engines"""

    code = fields.Str(required=True, validate=validate.Length(min=1, max=20))
    name = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    documentation_link = fields.Url(validate=validate.Length(max=500))
    is_active = fields.Bool(missing=True)


class EngineUpdateSchema(Schema):
    """Schema for updating existing engines"""

    code = fields.Str(validate=validate.Length(min=1, max=20))
    name = fields.Str(validate=validate.Length(min=1, max=200))
    documentation_link = fields.Url(validate=validate.Length(max=500))
    is_active = fields.Bool()


class EngineSimpleSchema(Schema):
    """Simple schema for engine references"""

    id = fields.Int(dump_only=True)
    code = fields.Str(dump_only=True)
    name = fields.Str(dump_only=True)
    is_active = fields.Bool(dump_only=True)
