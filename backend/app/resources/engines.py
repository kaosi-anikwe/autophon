from flask import request
from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.engine import Engine
from app.models.user import User
from app.schemas import (
    EngineSchema,
    EngineCreateSchema,
    EngineUpdateSchema,
    EngineSimpleSchema,
)


class EngineListResource(Resource):
    """Handle operations on engine collection"""

    def get(self):
        """Get list of engines with optional filtering"""
        try:
            # Get query parameters
            active_only = request.args.get("active", "true").lower() == "true"

            query = Engine.query

            # Apply filters
            if active_only:
                query = query.filter_by(is_active=True)

            engines = query.order_by(Engine.name).all()

            schema = EngineSimpleSchema(many=True)
            return {"engines": schema.dump(engines), "count": len(engines)}, 200

        except Exception as e:
            return {"message": f"Error retrieving engines: {str(e)}"}, 500

    @jwt_required()
    def post(self):
        """Create new engine (admin only)"""
        try:
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)

            if not current_user.admin:
                return {"message": "Admin access required"}, 403

            schema = EngineCreateSchema()
            data = schema.load(request.get_json())

            # Check if engine code already exists
            if Engine.query.filter_by(code=data["code"]).first():
                return {"message": "Engine with this code already exists"}, 409

            # Create engine
            engine = Engine(**data)
            engine.insert()

            response_schema = EngineSchema()
            return {
                "message": "Engine created successfully",
                "engine": response_schema.dump(engine),
            }, 201

        except ValidationError as e:
            return {"message": "Validation error", "errors": e.messages}, 400
        except IntegrityError:
            db.session.rollback()
            return {"message": "Engine with this code already exists"}, 409
        except Exception as e:
            return {"message": f"Error creating engine: {str(e)}"}, 500


class EngineResource(Resource):
    """Handle operations on individual engines"""

    def get(self, engine_id):
        """Get engine by ID"""
        try:
            engine = Engine.query.filter_by(id=engine_id).first()
            if not engine:
                return {"message": "Engine not found"}, 404

            schema = EngineSchema()
            return {"engine": schema.dump(engine)}, 200

        except Exception as e:
            return {"message": f"Error retrieving engine: {str(e)}"}, 500

    @jwt_required()
    def put(self, engine_id):
        """Update engine (admin only)"""
        try:
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)

            if not current_user.admin:
                return {"message": "Admin access required"}, 403

            engine = Engine.query.filter_by(id=engine_id).first()
            if not engine:
                return {"message": "Engine not found"}, 404

            schema = EngineUpdateSchema()
            data = schema.load(request.get_json())

            # Check if code is being changed and conflicts with existing
            if "code" in data and data["code"] != engine.code:
                if Engine.query.filter_by(code=data["code"]).first():
                    return {"message": "Engine with this code already exists"}, 409

            # Update engine fields
            for key, value in data.items():
                setattr(engine, key, value)

            engine.update()

            response_schema = EngineSchema()
            return {
                "message": "Engine updated successfully",
                "engine": response_schema.dump(engine),
            }, 200

        except ValidationError as e:
            return {"message": "Validation error", "errors": e.messages}, 400
        except IntegrityError:
            db.session.rollback()
            return {"message": "Engine with this code already exists"}, 409
        except Exception as e:
            return {"message": f"Error updating engine: {str(e)}"}, 500

    @jwt_required()
    def delete(self, engine_id):
        """Delete engine (admin only)"""
        try:
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)

            if not current_user.admin:
                return {"message": "Admin access required"}, 403

            engine = Engine.query.filter_by(id=engine_id).first()
            if not engine:
                return {"message": "Engine not found"}, 404

            # Check if engine is used in tasks
            if engine.tasks:
                return {"message": "Cannot delete engine that is used in tasks"}, 409

            engine.delete()

            return {"message": "Engine deleted successfully"}, 200

        except Exception as e:
            return {"message": f"Error deleting engine: {str(e)}"}, 500


class EngineByCodeResource(Resource):
    """Handle operations on engines by code"""

    def get(self, code):
        """Get engine by code"""
        try:
            engine = Engine.query.filter_by(code=code, is_active=True).first()
            if not engine:
                return {"message": "Engine not found"}, 404

            schema = EngineSchema()
            return {"engine": schema.dump(engine)}, 200

        except Exception as e:
            return {"message": f"Error retrieving engine: {str(e)}"}, 500


class EngineLanguagesResource(Resource):
    """Handle engine-language relationships"""

    def get(self, engine_id):
        """Get languages for an engine"""
        try:
            engine = Engine.query.filter_by(id=engine_id).first()
            if not engine:
                return {"message": "Engine not found"}, 404

            from app.schemas import LanguageSimpleSchema

            schema = LanguageSimpleSchema(many=True)

            return {
                "languages": schema.dump(engine.languages),
                "count": len(engine.languages),
            }, 200

        except Exception as e:
            return {"message": f"Error retrieving engine languages: {str(e)}"}, 500

    @jwt_required()
    def post(self, engine_id):
        """Add language to engine (admin only)"""
        try:
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)

            if not current_user.admin:
                return {"message": "Admin access required"}, 403

            engine = Engine.query.filter_by(id=engine_id).first()
            if not engine:
                return {"message": "Engine not found"}, 404

            data = request.get_json()
            language_id = data.get("language_id")

            if not language_id:
                return {"message": "language_id is required"}, 400

            from app.models.language import Language

            language = Language.query.filter_by(id=language_id).first()
            if not language:
                return {"message": "Language not found"}, 404

            # Check if relationship already exists
            if language in engine.languages:
                return {"message": "Language already associated with this engine"}, 409

            engine.languages.append(language)
            engine.update()

            return {"message": "Language added to engine successfully"}, 200

        except Exception as e:
            return {"message": f"Error adding language to engine: {str(e)}"}, 500
