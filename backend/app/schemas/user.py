from marshmallow import Schema, fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models.user import User


class UserSchema(SQLAlchemyAutoSchema):
    """Schema for serializing User model"""

    class Meta:
        model = User
        load_instance = True
        exclude = ("password_hash",)

    # Override sensitive fields
    password_hash = fields.Str(load_only=True)

    # Computed fields
    display_name = fields.Method("get_display_name", dump_only=True)
    profile_image = fields.Method("get_profile_image", dump_only=True)

    # Nested relationships (optional)
    tasks = fields.Nested("TaskSchema", many=True, dump_only=True, exclude=("owner",))
    dictionaries = fields.Nested(
        "DictionarySchema", many=True, dump_only=True, exclude=("owner",)
    )

    def get_display_name(self, obj):
        return obj.display_name()

    def get_profile_image(self, obj):
        return obj.profile_image()


class UserCreateSchema(Schema):
    """Schema for creating new users"""

    title = fields.Str(validate=validate.Length(max=10))
    first_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    last_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    email = fields.Email(required=True, validate=validate.Length(max=120))
    password = fields.Str(
        required=True, validate=validate.Length(min=8), load_only=True
    )
    org = fields.Str(validate=validate.Length(max=500))
    industry = fields.Str(validate=validate.Length(max=255))


class UserUpdateSchema(Schema):
    """Schema for updating existing users"""

    title = fields.Str(validate=validate.Length(max=10))
    first_name = fields.Str(validate=validate.Length(min=1, max=100))
    last_name = fields.Str(validate=validate.Length(min=1, max=100))
    email = fields.Email(validate=validate.Length(max=120))
    org = fields.Str(validate=validate.Length(max=500))
    industry = fields.Str(validate=validate.Length(max=255))
    verified = fields.Bool()
    edited = fields.Bool()


class UserLoginSchema(Schema):
    """Schema for user login"""

    email = fields.Email(required=True)
    password = fields.Str(required=True, load_only=True)
    admin = fields.Bool(load_default=False)


class UserPublicSchema(Schema):
    """Schema for public user information (minimal exposure)"""

    id = fields.Int(dump_only=True)
    display_name = fields.Method("get_display_name", dump_only=True)
    profile_image = fields.Method("get_profile_image", dump_only=True)
    verified = fields.Bool(dump_only=True)

    def get_display_name(self, obj):
        return obj.display_name()

    def get_profile_image(self, obj):
        return obj.profile_image()
