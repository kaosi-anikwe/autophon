from flask import request
from flask_restful import Resource
from marshmallow import ValidationError
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.models.dictionary import UserDictionary
from app.models.user import User
from app.schemas import (
    DictionarySchema,
    DictionaryCreateSchema,
    DictionaryUpdateSchema,
    DictionarySimpleSchema,
)


class DictionaryListResource(Resource):
    """Handle operations on dictionary collection"""

    @jwt_required()
    def get(self):
        """Get list of dictionaries"""
        try:
            current_user_id = get_jwt_identity()
            current_user = User.query.get(int(current_user_id))

            # Get query parameters
            user_id = request.args.get("user_id")
            language = request.args.get("language")

            query = UserDictionary.query

            # Non-admin users can only see their own dictionaries
            if not current_user.admin:
                query = query.filter_by(user_id=current_user_id)
            elif user_id:
                query = query.filter_by(user_id=user_id)

            # Filter by language if specified
            if language:
                query = query.filter_by(lang=language)

            # Order by creation date (newest first)
            dictionaries = query.order_by(UserDictionary.created_at.desc()).all()

            schema = DictionarySimpleSchema(many=True)
            return {
                "dictionaries": schema.dump(dictionaries),
                "count": len(dictionaries),
            }, 200

        except Exception as e:
            return {"message": f"Error retrieving dictionaries: {str(e)}"}, 500

    @jwt_required()
    def post(self):
        """Create new dictionary"""
        try:
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)

            schema = DictionaryCreateSchema()
            data = schema.load(request.get_json())

            # Set user_id to current user if not provided or user is not admin
            if not current_user.admin or "user_id" not in data:
                data["user_id"] = current_user_id

            # Check if user already has a dictionary for this language
            existing = UserDictionary.query.filter_by(
                user_id=data["user_id"], lang=data["lang"]
            ).first()

            if existing:
                return {"message": "Dictionary for this language already exists"}, 409

            # Create dictionary
            dictionary = UserDictionary(**data)
            dictionary.insert()

            # Save to file
            dictionary.save_to_file()

            response_schema = DictionarySchema()
            return {
                "message": "Dictionary created successfully",
                "dictionary": response_schema.dump(dictionary),
            }, 201

        except ValidationError as e:
            return {"message": "Validation error", "errors": e.messages}, 400
        except Exception as e:
            return {"message": f"Error creating dictionary: {str(e)}"}, 500


class DictionaryResource(Resource):
    """Handle operations on individual dictionaries"""

    @jwt_required()
    def get(self, dict_id):
        """Get dictionary by ID"""
        try:
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)

            dictionary = UserDictionary.query.filter_by(id=dict_id).first()
            if not dictionary:
                return {"message": "Dictionary not found"}, 404

            # Users can only view their own dictionaries or admin can view any
            if not current_user.admin and dictionary.user_id != current_user_id:
                return {"message": "Permission denied"}, 403

            schema = DictionarySchema()
            return {"dictionary": schema.dump(dictionary)}, 200

        except Exception as e:
            return {"message": f"Error retrieving dictionary: {str(e)}"}, 500

    @jwt_required()
    def put(self, dict_id):
        """Update dictionary"""
        try:
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)

            dictionary = UserDictionary.query.filter_by(id=dict_id).first()
            if not dictionary:
                return {"message": "Dictionary not found"}, 404

            # Users can only update their own dictionaries or admin can update any
            if not current_user.admin and dictionary.user_id != current_user_id:
                return {"message": "Permission denied"}, 403

            schema = DictionaryUpdateSchema()
            data = schema.load(request.get_json())

            # Check if language is being changed and conflicts with existing
            if "lang" in data and data["lang"] != dictionary.lang:
                existing = UserDictionary.query.filter_by(
                    user_id=dictionary.user_id, lang=data["lang"]
                ).first()
                if existing:
                    return {
                        "message": "Dictionary for this language already exists"
                    }, 409

            # Update dictionary fields
            for key, value in data.items():
                setattr(dictionary, key, value)

            dictionary.update()

            # Save to file if content was updated
            if "dictionary_content" in data:
                dictionary.save_to_file()

            response_schema = DictionarySchema()
            return {
                "message": "Dictionary updated successfully",
                "dictionary": response_schema.dump(dictionary),
            }, 200

        except ValidationError as e:
            return {"message": "Validation error", "errors": e.messages}, 400
        except Exception as e:
            return {"message": f"Error updating dictionary: {str(e)}"}, 500

    @jwt_required()
    def delete(self, dict_id):
        """Delete dictionary"""
        try:
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)

            dictionary = UserDictionary.query.filter_by(id=dict_id).first()
            if not dictionary:
                return {"message": "Dictionary not found"}, 404

            # Users can only delete their own dictionaries or admin can delete any
            if not current_user.admin and dictionary.user_id != current_user_id:
                return {"message": "Permission denied"}, 403

            # Remove file if it exists
            if dictionary.file_path:
                import os

                try:
                    os.remove(dictionary.file_path)
                except OSError:
                    pass  # File might not exist

            dictionary.delete()

            return {"message": "Dictionary deleted successfully"}, 200

        except Exception as e:
            return {"message": f"Error deleting dictionary: {str(e)}"}, 500


class UserDictionariesResource(Resource):
    """Handle user's dictionaries"""

    @jwt_required()
    def get(self, user_id):
        """Get user's dictionaries"""
        try:
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)

            # Users can only view their own dictionaries or admin can view any
            if not current_user.admin and str(current_user_id) != str(user_id):
                return {"message": "Permission denied"}, 403

            user = User.query.filter_by(id=user_id).first()
            if not user:
                return {"message": "User not found"}, 404

            dictionaries = UserDictionary.get_user_dictionaries(user_id)

            schema = DictionarySimpleSchema(many=True)
            return {
                "dictionaries": schema.dump(dictionaries),
                "count": len(dictionaries),
            }, 200

        except Exception as e:
            return {"message": f"Error retrieving user dictionaries: {str(e)}"}, 500


class DictionaryByLanguageResource(Resource):
    """Handle dictionaries by language"""

    @jwt_required()
    def get(self, language):
        """Get user's dictionary for specific language"""
        try:
            current_user_id = get_jwt_identity()

            dictionary = UserDictionary.query.filter_by(
                user_id=current_user_id, lang=language
            ).first()

            if not dictionary:
                return {"message": "Dictionary not found for this language"}, 404

            schema = DictionarySchema()
            return {"dictionary": schema.dump(dictionary)}, 200

        except Exception as e:
            return {"message": f"Error retrieving dictionary: {str(e)}"}, 500

    @jwt_required()
    def post(self, language):
        """Create dictionary for specific language"""
        try:
            current_user_id = get_jwt_identity()

            # Check if dictionary already exists
            existing = UserDictionary.query.filter_by(
                user_id=current_user_id, lang=language
            ).first()

            if existing:
                return {"message": "Dictionary for this language already exists"}, 409

            data = request.get_json()
            data["user_id"] = current_user_id
            data["lang"] = language

            schema = DictionaryCreateSchema()
            validated_data = schema.load(data)

            # Create dictionary
            dictionary = UserDictionary(**validated_data)
            dictionary.insert()

            # Save to file
            dictionary.save_to_file()

            response_schema = DictionarySchema()
            return {
                "message": "Dictionary created successfully",
                "dictionary": response_schema.dump(dictionary),
            }, 201

        except ValidationError as e:
            return {"message": "Validation error", "errors": e.messages}, 400
        except Exception as e:
            return {"message": f"Error creating dictionary: {str(e)}"}, 500
