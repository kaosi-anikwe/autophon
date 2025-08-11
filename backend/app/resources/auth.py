from flask import request
from flask_restful import Resource
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
    create_access_token,
    create_refresh_token,
    get_jwt,
)


from app.extensions import db
from app.models.user import User
from app.models.token_blacklist import TokenBlacklist
from app.schemas import UserCreateSchema, UserLoginSchema, UserSchema, UserUpdateSchema
from app.utils.logger import (
    get_logger,
    log_exception,
    log_request_info,
    log_response_info,
)
from app.utils.jwt_helpers import get_current_user_id

logger = get_logger(__name__)


class Register(Resource):
    """Handle user registration"""

    def post(self):
        """Register new user"""
        log_request_info(logger, request)
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

            # Create tokens
            access_token = create_access_token(identity=str(user.id))
            refresh_token = create_refresh_token(identity=str(user.id))

            # Return user data and tokens
            user_schema = UserSchema(exclude=["password_hash"])
            response = {
                "message": "User registered successfully",
                "user": user_schema.dump(user),
                "access_token": access_token,
                "refresh_token": refresh_token,
            }
            logger.info(f"User registered successfully: {user.email} (ID: {user.id})")
            log_response_info(logger, response, 201)
            return response, 201

        except ValidationError as e:
            logger.warning(f"Registration validation error: {e.messages}")
            response = {"message": "Validation error", "errors": e.messages}
            log_response_info(logger, response, 400)
            return response, 400
        except IntegrityError as e:
            db.session.rollback()
            logger.warning(f"Registration integrity error: {str(e)}")
            response = {"message": "User with this email already exists"}
            log_response_info(logger, response, 409)
            return response, 409
        except Exception as e:
            log_exception(logger, "Registration failed")
            response = {"message": f"Registration failed: {str(e)}"}
            log_response_info(logger, response, 500)
            return response, 500


class Login(Resource):
    """Handle user login"""

    def post(self):
        """Authenticate user and return tokens"""
        log_request_info(logger, request)
        try:
            schema = UserLoginSchema()
            data = schema.load(request.get_json())

            # Find user by email
            user = User.query.filter_by(email=data["email"]).first()

            # Check if user exists and password is correct
            if not user or not check_password_hash(
                user.password_hash, data["password"]
            ):
                logger.warning(
                    f"Failed login attempt for email: {data.get('email', 'unknown')}"
                )
                response = {"message": "Invalid email or password"}
                log_response_info(logger, response, 401)
                return response, 401

            # Check if user is deleted
            if user.deleted:
                logger.warning(f"Login attempt for deactivated account: {user.email}")
                response = {"message": "Account has been deactivated"}
                log_response_info(logger, response, 401)
                return response, 401

            # Create tokens
            access_token = create_access_token(identity=str(user.id))
            refresh_token = create_refresh_token(identity=str(user.id))

            # Return user data and tokens
            user_schema = UserSchema(exclude=["password_hash"])
            response = {
                "message": "Login successful",
                "user": user_schema.dump(user),
                "access_token": access_token,
                "refresh_token": refresh_token,
            }
            logger.info(f"User logged in successfully: {user.email} (ID: {user.id})")
            log_response_info(logger, response, 200)
            return response, 200

        except ValidationError as e:
            logger.warning(f"Login validation error: {e.messages}")
            response = {"message": "Validation error", "errors": e.messages}
            log_response_info(logger, response, 400)
            return response, 400
        except Exception as e:
            log_exception(logger, "Login failed")
            response = {"message": f"Login failed: {str(e)}"}
            log_response_info(logger, response, 500)
            return response, 500


class Logout(Resource):
    """Handle user logout"""

    @jwt_required()
    def post(self):
        """Logout user (blacklist current token)"""
        try:
            from app.utils.datetime_helpers import utc_from_timestamp

            current_user_id = get_current_user_id()
            token = get_jwt()
            jti = token["jti"]
            token_type = token.get("type", "access")
            expires_timestamp = token["exp"]
            expires = utc_from_timestamp(expires_timestamp)

            # Add current token to blacklist
            TokenBlacklist.add_token_to_blacklist(
                jti=jti,
                token_type=token_type,
                user_id=current_user_id,
                expires=expires,
                reason="logout",
            )

            logger.info(f"User logged out successfully: {current_user_id}")
            return {"message": "Successfully logged out"}, 200

        except Exception as e:
            log_exception(logger, "Logout failed")
            response = {"message": f"Logout failed: {str(e)}"}
            log_response_info(logger, response, 500)
            return response, 500


class RefreshToken(Resource):
    """Handle token refresh"""

    @jwt_required(refresh=True)
    def post(self):
        """Refresh access token"""
        try:
            current_user_id = get_current_user_id()

            # Check if user still exists and is not deleted
            user = User.query.filter_by(id=current_user_id, deleted=None).first()
            if not user:
                return {"message": "User not found or account deactivated"}, 404

            # Create new access token
            access_token = create_access_token(identity=str(current_user_id))

            return {"access_token": access_token}, 200

        except Exception as e:
            return {"message": f"Token refresh failed: {str(e)}"}, 500


class ChangePassword(Resource):
    """Handle password changes"""

    @jwt_required()
    def put(self):
        """Change user password"""
        try:
            current_user_id = get_current_user_id()
            user = User.query.filter_by(id=current_user_id, deleted=None).first()

            if not user:
                return {"message": "User not found"}, 404

            data = request.get_json()
            current_password = data.get("current_password")
            new_password = data.get("new_password")

            if not current_password or not new_password:
                return {
                    "message": "current_password and new_password are required"
                }, 400

            # Validate current password
            if not check_password_hash(user.password_hash, current_password):
                return {"message": "Current password is incorrect"}, 401

            # Validate new password length
            if len(new_password) < 8:
                return {
                    "message": "New password must be at least 8 characters long"
                }, 400

            # Update password
            user.password_hash = generate_password_hash(new_password)

            # Revoke all existing tokens for security
            user.revoke_all_tokens(reason="password_change")
            user.update()

            return {
                "message": "Password changed successfully. All sessions have been logged out for security.",
                "tokens_revoked": True,
            }, 200

        except Exception as e:
            return {"message": f"Password change failed: {str(e)}"}, 500


class ResetPasswordRequest(Resource):
    """Handle password reset requests"""

    def post(self):
        """Request password reset"""
        try:
            data = request.get_json()
            email = data.get("email")

            if not email:
                return {"message": "Email is required"}, 400

            user = User.query.filter_by(email=email, deleted=None).first()

            # Always return success to prevent email enumeration
            # In production, you would send a reset email here
            return {
                "message": "If an account with this email exists, a password reset link has been sent"
            }, 200

        except Exception as e:
            return {"message": f"Password reset request failed: {str(e)}"}, 500


class VerifyToken(Resource):
    """Verify if token is valid"""

    @jwt_required()
    def get(self):
        """Verify token and return user info"""
        try:
            current_user_id = get_current_user_id()
            user = User.query.filter_by(id=current_user_id, deleted=None).first()

            if not user:
                return {"message": "User not found or account deactivated"}, 404

            user_schema = UserSchema(exclude=["password_hash"])
            return {"valid": True, "user": user_schema.dump(user)}, 200

        except Exception as e:
            return {"message": f"Token verification failed: {str(e)}"}, 500


class LogoutAllDevices(Resource):
    """Handle logout from all devices"""

    @jwt_required()
    def post(self):
        """Logout user from all devices (revoke all tokens)"""
        try:
            current_user_id = get_current_user_id()
            user = User.query.filter_by(id=current_user_id, deleted=None).first()

            if not user:
                return {"message": "User not found"}, 404

            # Revoke all tokens for this user
            revoked_at = user.revoke_all_tokens(reason="logout_all_devices")

            return {
                "message": "Successfully logged out from all devices",
                "revoked_at": revoked_at.isoformat(),
            }, 200

        except Exception as e:
            return {"message": f"Logout from all devices failed: {str(e)}"}, 500


class TokenCleanup(Resource):
    """Handle token cleanup operations (admin only)"""

    @jwt_required()
    def post(self):
        """Clean up expired tokens from blacklist"""
        try:
            current_user_id = get_current_user_id()
            current_user = User.query.get(current_user_id)

            if not current_user or not current_user.admin:
                return {"message": "Admin access required"}, 403

            # Clean up expired tokens
            cleaned_count = TokenBlacklist.cleanup_expired_tokens()

            return {
                "message": f"Cleaned up {cleaned_count} expired tokens",
                "cleaned_count": cleaned_count,
            }, 200

        except Exception as e:
            return {"message": f"Token cleanup failed: {str(e)}"}, 500


class RevokeUserTokens(Resource):
    """Admin endpoint to revoke all tokens for a specific user"""

    @jwt_required()
    def post(self):
        """Revoke all tokens for a specific user (admin only)"""
        try:
            current_user_id = get_current_user_id()
            current_user = User.query.get(current_user_id)

            if not current_user or not current_user.admin:
                return {"message": "Admin access required"}, 403

            data = request.get_json()
            target_user_id = data.get("user_id")
            reason = data.get("reason", "admin_revoke")

            if not target_user_id:
                return {"message": "user_id is required"}, 400

            # Revoke all tokens for the target user
            result = TokenBlacklist.revoke_all_user_tokens(target_user_id, reason)

            if not result:
                return {"message": "User not found"}, 404

            return result, 200

        except Exception as e:
            return {"message": f"Token revocation failed: {str(e)}"}, 500
