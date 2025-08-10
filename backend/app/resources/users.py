from flask import request
from flask_restful import Resource
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError
from werkzeug.security import generate_password_hash
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.user import User
from app.utils.logger import get_logger, log_exception
from app.schemas import UserSchema, UserCreateSchema, UserUpdateSchema, UserPublicSchema

logger = get_logger(__name__)


class UserListResource(Resource):
    """Handle operations on user collection"""

    def get(self):
        """Get list of users (admin only)"""
        try:
            users = User.query.filter_by(deleted=None).all()
            schema = UserPublicSchema(many=True)
            return {"users": schema.dump(users), "count": len(users)}, 200
        except Exception as e:
            log_exception(logger, "Error retrieving users")
            return {"message": f"Error retrieving users: {str(e)}"}, 500

    def post(self):
        """Create new user"""
        try:
            schema = UserCreateSchema()
            data = schema.load(request.get_json())

            # Check if user already exists
            if User.query.filter_by(email=data["email"]).first():
                return {"message": "User with this email already exists"}, 409

            # Hash password
            password_hash = generate_password_hash(data.pop("password"))

            # Create user
            user = User(**data, password_hash=password_hash)
            user.insert()

            # Return user data
            schema = UserSchema(exclude=["password_hash"])
            return {
                "message": "User created successfully",
                "user": schema.dump(user),
            }, 201

        except ValidationError as e:
            return {"message": "Validation error", "errors": e.messages}, 400
        except IntegrityError:
            db.session.rollback()
            return {"message": "User with this email already exists"}, 409
        except Exception as e:
            log_exception(logger, "Error creating user")
            return {"message": f"Error creating user: {str(e)}"}, 500


class UserResource(Resource):
    """Handle operations on individual users"""

    @jwt_required()
    def get(self, user_id):
        """Get user by ID"""
        try:
            current_user_id = get_jwt_identity()

            user = User.query.filter_by(id=user_id, deleted=None).first()
            if not user:
                return {"message": "User not found"}, 404

            # Users can only view their own profile or admin can view any
            current_user = User.query.get(current_user_id)
            if not current_user.admin and str(current_user_id) != str(user_id):
                schema = UserPublicSchema()
            else:
                schema = UserSchema(exclude=["password_hash"])

            return {"user": schema.dump(user)}, 200

        except Exception as e:
            log_exception(logger, "Error retrieving user")
            return {"message": f"Error retrieving user: {str(e)}"}, 500

    @jwt_required()
    def put(self, user_id):
        """Update user"""
        try:
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)

            user = User.query.filter_by(id=user_id, deleted=None).first()
            if not user:
                return {"message": "User not found"}, 404

            # Users can only update their own profile or admin can update any
            if not current_user.admin and str(current_user_id) != str(user_id):
                return {"message": "Permission denied"}, 403

            schema = UserUpdateSchema()
            data = schema.load(request.get_json())

            # Update user fields
            for key, value in data.items():
                setattr(user, key, value)

            user.update()

            response_schema = UserSchema(exclude=["password_hash"])
            return {
                "message": "User updated successfully",
                "user": response_schema.dump(user),
            }, 200

        except ValidationError as e:
            return {"message": "Validation error", "errors": e.messages}, 400
        except Exception as e:
            log_exception(logger, "Error updating user")
            return {"message": f"Error updating user: {str(e)}"}, 500

    @jwt_required()
    def delete(self, user_id):
        """Delete (soft delete) user"""
        try:
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)

            user = User.query.filter_by(id=user_id, deleted=None).first()
            if not user:
                return {"message": "User not found"}, 404

            # Users can only delete their own account or admin can delete any
            if not current_user.admin and str(current_user_id) != str(user_id):
                return {"message": "Permission denied"}, 403

            # Soft delete
            from datetime import datetime

            user.deleted = datetime.now().isoformat()
            user.update()

            return {"message": "User deleted successfully"}, 200

        except Exception as e:
            log_exception(logger, "Error deleting user")
            return {"message": f"Error deleting user: {str(e)}"}, 500


class UserProfileResource(Resource):
    """Handle current user profile operations"""

    @jwt_required()
    def get(self):
        """Get current user profile"""
        try:
            current_user_id = get_jwt_identity()
            user = User.query.filter_by(id=current_user_id, deleted=None).first()

            if not user:
                return {"message": "User not found"}, 404

            schema = UserSchema(exclude=["password_hash"])
            return {"user": schema.dump(user)}, 200

        except Exception as e:
            log_exception(logger, "Error retrieving profile")
            return {"message": f"Error retrieving profile: {str(e)}"}, 500

    @jwt_required()
    def put(self):
        """Update current user profile"""
        try:
            current_user_id = get_jwt_identity()
            user = User.query.filter_by(id=current_user_id, deleted=None).first()

            if not user:
                return {"message": "User not found"}, 404

            schema = UserUpdateSchema()
            data = schema.load(request.get_json())

            # Update user fields
            for key, value in data.items():
                setattr(user, key, value)

            user.update()

            response_schema = UserSchema(exclude=["password_hash"])
            return {
                "message": "Profile updated successfully",
                "user": response_schema.dump(user),
            }, 200

        except ValidationError as e:
            return {"message": "Validation error", "errors": e.messages}, 400
        except Exception as e:
            log_exception(logger, "Error updating profile")
            return {"message": f"Error updating profile: {str(e)}"}, 500


class UserTasksResource(Resource):
    """Handle user's tasks"""

    @jwt_required()
    def get(self, user_id):
        """Get user's tasks"""
        try:
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)

            # Users can only view their own tasks or admin can view any
            if not current_user.admin and str(current_user_id) != str(user_id):
                return {"message": "Permission denied"}, 403

            user = User.query.filter_by(id=user_id, deleted=None).first()
            if not user:
                return {"message": "User not found"}, 404

            from app.schemas import TaskSimpleSchema

            schema = TaskSimpleSchema(many=True)

            return {"tasks": schema.dump(user.tasks), "count": len(user.tasks)}, 200

        except Exception as e:
            log_exception(logger, "Error retrieving user tasks")
            return {"message": f"Error retrieving user tasks: {str(e)}"}, 500
