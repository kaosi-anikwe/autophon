from flask import request
from flask_restful import Resource
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.user import User
from app.models.language import Language, LanguageType
from app.utils.logger import get_logger, log_exception

logger = get_logger(__name__)
from app.schemas import (
    LanguageSchema,
    LanguageCreateSchema,
    LanguageUpdateSchema,
    LanguageSimpleSchema,
    LanguageHomepageSchema,
)


class LanguageListResource(Resource):
    """Handle operations on language collection (admin only)"""

    @jwt_required()
    def get(self):
        """Get list of languages with optional filtering (admin only)"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            if not current_user or not current_user.admin:
                return {"message": "Admin access required"}, 403

            # Get query parameters
            language_type = request.args.get("type")
            homepage_only = request.args.get("homepage", "false").lower() == "true"
            active_only = request.args.get("active", "true").lower() == "true"

            query = Language.query

            # Apply filters
            if active_only:
                query = query.filter_by(is_active=True)

            if language_type:
                try:
                    lang_type_enum = LanguageType(language_type)
                    query = query.filter_by(type=lang_type_enum)
                except ValueError:
                    return {"message": f"Invalid language type: {language_type}"}, 400

            if homepage_only:
                query = query.filter_by(homepage=True)

            # Order by priority
            languages = query.order_by(Language.priority).all()

            # Use appropriate schema
            if homepage_only:
                schema = LanguageHomepageSchema(many=True)
            else:
                schema = LanguageSimpleSchema(many=True)

            return {"languages": schema.dump(languages), "count": len(languages)}, 200

        except Exception as e:
            log_exception(logger, "Error retrieving languages")
            return {"message": f"Error retrieving languages: {str(e)}"}, 500

    @jwt_required()
    def post(self):
        """Create new language (admin only)"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            if not current_user.admin:
                return {"message": "Admin access required"}, 403

            schema = LanguageCreateSchema()
            data = schema.load(request.get_json())

            # Check if language code already exists
            if Language.query.filter_by(code=data["code"]).first():
                return {"message": "Language with this code already exists"}, 409

            # Create language
            language = Language(**data)
            language.insert()

            response_schema = LanguageSchema()
            return {
                "message": "Language created successfully",
                "language": response_schema.dump(language),
            }, 201

        except ValidationError as e:
            return {"message": "Validation error", "errors": e.messages}, 400
        except IntegrityError:
            db.session.rollback()
            return {"message": "Language with this code already exists"}, 409
        except Exception as e:
            log_exception(logger, "Error creating language")
            return {"message": f"Error creating language: {str(e)}"}, 500


class LanguageResource(Resource):
    """Handle operations on individual languages (admin only)"""

    @jwt_required()
    def get(self, language_id):
        """Get language by ID (admin only)"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            if not current_user or not current_user.admin:
                return {"message": "Admin access required"}, 403

            language = Language.query.filter_by(id=language_id).first()
            if not language:
                return {"message": "Language not found"}, 404

            schema = LanguageSchema()
            return {"language": schema.dump(language)}, 200

        except Exception as e:
            return {"message": f"Error retrieving language: {str(e)}"}, 500

    @jwt_required()
    def put(self, language_id):
        """Update language (admin only)"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            if not current_user.admin:
                return {"message": "Admin access required"}, 403

            language = Language.query.filter_by(id=language_id).first()
            if not language:
                return {"message": "Language not found"}, 404

            schema = LanguageUpdateSchema()
            data = schema.load(request.get_json())

            # Check if code is being changed and conflicts with existing
            if "code" in data and data["code"] != language.code:
                if Language.query.filter_by(code=data["code"]).first():
                    return {"message": "Language with this code already exists"}, 409

            # Update language fields
            for key, value in data.items():
                setattr(language, key, value)

            language.update()

            response_schema = LanguageSchema()
            return {
                "message": "Language updated successfully",
                "language": response_schema.dump(language),
            }, 200

        except ValidationError as e:
            return {"message": "Validation error", "errors": e.messages}, 400
        except IntegrityError:
            db.session.rollback()
            return {"message": "Language with this code already exists"}, 409
        except Exception as e:
            return {"message": f"Error updating language: {str(e)}"}, 500

    @jwt_required()
    def delete(self, language_id):
        """Delete language (admin only)"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            if not current_user.admin:
                return {"message": "Admin access required"}, 403

            language = Language.query.filter_by(id=language_id).first()
            if not language:
                return {"message": "Language not found"}, 404

            # Check if language is used in tasks
            if language.tasks:
                return {"message": "Cannot delete language that is used in tasks"}, 409

            language.delete()

            return {"message": "Language deleted successfully"}, 200

        except Exception as e:
            log_exception(logger, "Error deleting language")
            return {"message": f"Error deleting language: {str(e)}"}, 500


class LanguageByCodeResource(Resource):
    """Handle operations on languages by code (admin only)"""

    @jwt_required()
    def get(self, code):
        """Get language by code (admin only)"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            if not current_user or not current_user.admin:
                return {"message": "Admin access required"}, 403

            language = Language.query.filter_by(code=code, is_active=True).first()
            if not language:
                return {"message": "Language not found"}, 404

            schema = LanguageSchema()
            return {"language": schema.dump(language)}, 200

        except Exception as e:
            return {"message": f"Error retrieving language: {str(e)}"}, 500


class LanguageEnginesResource(Resource):
    """Handle language-engine relationships (admin only)"""

    @jwt_required()
    def get(self, language_id):
        """Get engines for a language (admin only)"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            if not current_user or not current_user.admin:
                return {"message": "Admin access required"}, 403

            language = Language.query.filter_by(id=language_id).first()
            if not language:
                return {"message": "Language not found"}, 404

            from app.schemas import EngineSimpleSchema

            schema = EngineSimpleSchema(many=True)

            return {
                "engines": schema.dump(language.engines),
                "count": len(language.engines),
            }, 200

        except Exception as e:
            return {"message": f"Error retrieving language engines: {str(e)}"}, 500

    @jwt_required()
    def post(self, language_id):
        """Add engine to language (admin only)"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            if not current_user.admin:
                return {"message": "Admin access required"}, 403

            language = Language.query.filter_by(id=language_id).first()
            if not language:
                return {"message": "Language not found"}, 404

            data = request.get_json()
            engine_id = data.get("engine_id")

            if not engine_id:
                return {"message": "engine_id is required"}, 400

            from app.models.engine import Engine

            engine = Engine.query.filter_by(id=engine_id).first()
            if not engine:
                return {"message": "Engine not found"}, 404

            # Check if relationship already exists
            if engine in language.engines:
                return {"message": "Engine already associated with this language"}, 409

            language.engines.append(engine)
            language.update()

            return {"message": "Engine added to language successfully"}, 200

        except Exception as e:
            return {"message": f"Error adding engine to language: {str(e)}"}, 500


class PublicLanguageListResource(Resource):
    """Public endpoint for homepage languages (no authentication required)"""

    def get(self):
        """Get list of homepage languages for public display"""
        try:
            # Get query parameters
            language_type = request.args.get("type")
            homepage_only = request.args.get("homepage", "true").lower() == "true"

            if homepage_only:
                # Get homepage languages using the model method
                languages = Language.get_homepage_languages()
            else:
                # Get all active languages, optionally filtered by type
                query = Language.query.filter_by(is_active=True)

                if language_type:
                    try:
                        lang_type_enum = LanguageType(language_type)
                        query = query.filter_by(type=lang_type_enum)
                    except ValueError:
                        return {
                            "message": f"Invalid language type: {language_type}"
                        }, 400

                languages = query.order_by(Language.priority).all()

            # Use homepage schema for consistent public display
            schema = LanguageHomepageSchema(many=True)

            # Group languages by type for better frontend organization
            grouped_languages = {"nordic": [], "other": []}
            for lang in languages:
                lang_data = schema.dump(lang)
                if lang.type.value in grouped_languages:
                    grouped_languages[lang.type.value].append(lang_data)
                else:
                    grouped_languages["other"].append(lang_data)

            return {
                "languages": schema.dump(languages),
                "grouped_languages": grouped_languages,
                "count": len(languages),
            }, 200

        except Exception as e:
            log_exception(logger, "Error retrieving public languages")
            return {"message": f"Error retrieving languages: {str(e)}"}, 500
