from marshmallow import Schema, fields, validate, ValidationError, validates
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models.dictionary import UserDictionary


class DictionarySchema(SQLAlchemyAutoSchema):
    """Schema for serializing UserDictionary model"""

    class Meta:
        model = UserDictionary
        load_instance = True

    # Nested relationships
    owner = fields.Nested("UserPublicSchema", dump_only=True)


class DictionaryCreateSchema(Schema):
    """Schema for creating new dictionaries"""

    user_id = fields.Int(required=True)
    lang = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    dictionary_content = fields.Str(required=True, validate=validate.Length(min=1))

    @validates("dictionary_content")
    def validate_content_size(self, value):
        if len(value) > 50000:
            raise ValidationError("Dictionary content cannot exceed 50,000 characters")


class DictionaryUpdateSchema(Schema):
    """Schema for updating existing dictionaries"""

    lang = fields.Str(validate=validate.Length(min=1, max=200))
    dictionary_content = fields.Str(validate=validate.Length(min=1))

    @validates("dictionary_content")
    def validate_content_size(self, value):
        if value and len(value) > 50000:
            raise ValidationError("Dictionary content cannot exceed 50,000 characters")


class DictionarySimpleSchema(Schema):
    """Simple schema for dictionary references"""

    id = fields.Int(dump_only=True)
    lang = fields.Str(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
