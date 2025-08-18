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
    """Handle operations on user collection (admin only)"""

    @jwt_required()
    def get(self):
        """Get list of users (admin only)"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            if not current_user or not current_user.admin:
                return {"message": "Admin access required"}, 403

            users = User.query.filter_by(deleted=None).all()
            schema = UserPublicSchema(many=True)
            return {"users": schema.dump(users), "count": len(users)}, 200
        except Exception as e:
            log_exception(logger, "Error retrieving users")
            return {"message": f"Error retrieving users: {str(e)}"}, 500

    @jwt_required()
    def post(self):
        """Create new user (admin only)"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            if not current_user or not current_user.admin:
                return {"message": "Admin access required"}, 403

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
    """Handle operations on individual users (admin only)"""

    @jwt_required()
    def get(self, user_id):
        """Get user by ID (admin only)"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            if not current_user or not current_user.admin:
                return {"message": "Admin access required"}, 403

            user = User.query.filter_by(id=user_id, deleted=None).first()
            if not user:
                return {"message": "User not found"}, 404

            schema = UserSchema(exclude=["password_hash"])
            return {"user": schema.dump(user)}, 200

        except Exception as e:
            log_exception(logger, "Error retrieving user")
            return {"message": f"Error retrieving user: {str(e)}"}, 500

    @jwt_required()
    def put(self, user_id):
        """Update user (admin only)"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            if not current_user or not current_user.admin:
                return {"message": "Admin access required"}, 403

            user = User.query.filter_by(id=user_id, deleted=None).first()
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
        """Delete (soft delete) user (admin only)"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            if not current_user or not current_user.admin:
                return {"message": "Admin access required"}, 403

            user = User.query.filter_by(id=user_id, deleted=None).first()
            if not user:
                return {"message": "User not found"}, 404

            # Soft delete
            from app.utils.datetime_helpers import utc_now

            user.deleted = utc_now().isoformat()
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
            current_user_id = int(get_jwt_identity())
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
            current_user_id = int(get_jwt_identity())
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

    @jwt_required()
    def delete(self):
        """Delete current user account"""
        try:
            current_user_id = int(get_jwt_identity())
            user = User.query.filter_by(id=current_user_id, deleted=None).first()

            if not user:
                return {"message": "User not found"}, 404

            # Import the delete_user_account function from utils.helpers
            from app.utils.helpers import delete_user_account

            # Delete the user account using the helper function
            success = delete_user_account(current_user_id)

            if not success:
                return {"message": "Failed to delete account"}, 500

            # Clear HTTP-only cookies after successful deletion
            from flask import jsonify
            from flask_jwt_extended import unset_jwt_cookies

            response = jsonify({"message": "Account deleted successfully"})
            unset_jwt_cookies(response)

            logger.info(
                f"User account deleted successfully: {user.email} (ID: {current_user_id})"
            )
            return response

        except Exception as e:
            log_exception(logger, "Error deleting account")
            return {"message": f"Error deleting account: {str(e)}"}, 500


class UserTasksResource(Resource):
    """Handle user's tasks (admin only)"""

    @jwt_required()
    def get(self, user_id):
        """Get user's tasks (admin only)"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            if not current_user or not current_user.admin:
                return {"message": "Admin access required"}, 403

            user = User.query.filter_by(id=user_id, deleted=None).first()
            if not user:
                return {"message": "User not found"}, 404

            from app.schemas import TaskSimpleSchema

            schema = TaskSimpleSchema(many=True)

            return {"tasks": schema.dump(user.tasks), "count": len(user.tasks)}, 200

        except Exception as e:
            log_exception(logger, "Error retrieving user tasks")
            return {"message": f"Error retrieving user tasks: {str(e)}"}, 500
