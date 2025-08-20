import os
from flask import request
from flask_restful import Resource
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename

from app.extensions import db

# User model imported via AdminRequiredMixin
from app.models.language import Language, LanguageType
from app.utils.logger import get_logger, log_exception
from app.utils.language_files import LanguageFileManager
from app.resources.admin import AdminRequiredMixin

logger = get_logger(__name__)
from app.schemas import (
    LanguageSchema,
    LanguageCreateSchema,
    LanguageUpdateSchema,
    LanguageSimpleSchema,
    LanguageHomepageSchema,
    LanguageCreateWithFilesSchema,
    LanguageUpdateWithFilesSchema,
    LanguageDetailSchema,
    AdminLanguageSchema,
)


class AdminLanguageListResource(Resource, AdminRequiredMixin):
    """Handle operations on language collection (Admin only)"""

    @jwt_required()
    def get(self):
        """Get list of languages with optional filtering (Admin only)"""
        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

        try:
            # Get query parameters
            language_type = request.args.get("type")
            homepage_only = request.args.get("homepage", "false").lower() == "true"
            active_only = request.args.get("active", "false").lower() == "true"

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

            # Prepare data with calculated fields for admin view
            languages_data = []
            for language in languages:
                # Convert to dict using base schema
                lang_dict = AdminLanguageSchema().dump(language)

                # Add calculated fields
                lang_dict["file_info"] = language.get_file_info()
                lang_dict["missing_files"] = language.get_missing_files()
                lang_dict["is_complete"] = language.get_is_complete()
                lang_dict["alternatives"] = language.get_alternatives_as_strings()

                languages_data.append(lang_dict)

            return {"languages": languages_data, "count": len(languages_data)}, 200

        except Exception as e:
            log_exception(logger, "Error retrieving languages")
            return {"message": f"Error retrieving languages: {str(e)}"}, 500

    @jwt_required()
    def post(self):
        """Create new language with file uploads (admin only)"""
        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

        try:
            # Handle both JSON and form data
            if request.is_json:
                schema = LanguageCreateSchema()
                data = schema.load(request.get_json())
                files_dict = {}
            else:
                # Form data with file uploads
                schema = LanguageCreateWithFilesSchema()
                form_data = request.form.to_dict()

                # Handle alternatives as list
                if "alternatives" in form_data:
                    form_data["alternatives"] = request.form.getlist("alternatives")

                data = schema.load(form_data)

                # Extract file uploads
                files_dict = {}
                required_files = [
                    "cite",
                    "cleanup",
                    "complex2simple",
                    "g2p_model",
                    "ipa",
                    "meta",
                    "simple_dict",
                    "normal_dict",
                    "dict_json",
                    "guide_pdf",
                    "model_zip",
                ]

                for file_type in required_files:
                    if file_type in request.files:
                        uploaded_file = request.files[file_type]
                        if uploaded_file and uploaded_file.filename:
                            files_dict[file_type] = uploaded_file

                # Check if all required files are provided
                missing_files = [f for f in required_files if f not in files_dict]
                if missing_files:
                    return {
                        "message": "All language files are required for creation",
                        "missing_files": missing_files,
                    }, 400

            # Check if language code already exists
            if Language.query.filter_by(code=data["code"]).first():
                return {"message": "Language with this code already exists"}, 409

            # Create language
            language = Language(
                **{k: v for k, v in data.items() if k != "alternatives"}
            )
            language.insert()

            # Handle file uploads if provided
            if files_dict:
                file_manager = LanguageFileManager(language)
                file_results = file_manager.save_multiple_files(files_dict)

                # Check if any file uploads failed
                failed_files = [f for f, success in file_results.items() if not success]
                if failed_files:
                    # Rollback language creation if file uploads failed
                    db.session.delete(language)
                    db.session.commit()
                    return {
                        "message": "Language creation failed due to file upload errors",
                        "failed_files": failed_files,
                    }, 400

                # Update language file status
                language.update_file_status()
                language.update()

            # Handle alternatives
            if "alternatives" in data and data["alternatives"]:
                for alt_code in data["alternatives"]:
                    alt_language = Language.query.filter_by(code=alt_code).first()
                    if alt_language:
                        language.alternatives.append(alt_language)
                language.update()

            response_schema = LanguageDetailSchema()
            language_data = response_schema.dump(language)

            # Add file information
            if files_dict:
                file_manager = LanguageFileManager(language)
                language_data["file_info"] = file_manager.get_file_info()
                language_data["missing_files"] = file_manager.get_missing_files()
                language_data["is_complete"] = file_manager.is_complete()

            return {
                "message": "Language created successfully",
                "language": language_data,
                "files_uploaded": len(files_dict) if files_dict else 0,
            }, 201

        except ValidationError as e:
            return {"message": "Validation error", "errors": e.messages}, 400
        except IntegrityError:
            db.session.rollback()
            return {"message": "Language with this code already exists"}, 409
        except Exception as e:
            log_exception(logger, "Error creating language")
            return {"message": f"Error creating language: {str(e)}"}, 500


class LanguageResource(Resource, AdminRequiredMixin):
    """Handle operations on individual languages (admin only)"""

    @jwt_required()
    def get(self, language_id):
        """Get language by ID with file information (admin only)"""
        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

        try:
            language = Language.query.filter_by(id=language_id).first()
            if not language:
                return {"message": "Language not found"}, 404

            # Update file status before returning
            language.update_file_status()
            language.update()

            schema = LanguageDetailSchema()
            language_data = schema.dump(language)

            # Add detailed file information
            file_manager = LanguageFileManager(language)
            language_data["file_info"] = file_manager.get_file_info()
            language_data["missing_files"] = file_manager.get_missing_files()
            language_data["is_complete"] = file_manager.is_complete()

            return {"language": language_data}, 200

        except Exception as e:
            log_exception(logger, "Error retrieving language")
            return {"message": f"Error retrieving language: {str(e)}"}, 500

    @jwt_required()
    def put(self, language_id):
        """Update language with optional file uploads (admin only)"""
        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

        try:
            language = Language.query.filter_by(id=language_id).first()
            if not language:
                return {"message": "Language not found"}, 404

            files_uploaded = []

            # Handle both JSON and form data
            if request.is_json:
                schema = LanguageUpdateSchema()
                data = schema.load(request.get_json())
                files_dict = {}
            else:
                # Form data with optional file uploads
                schema = LanguageUpdateWithFilesSchema()
                form_data = request.form.to_dict()

                # Handle alternatives as list
                if "alternatives" in form_data:
                    form_data["alternatives"] = request.form.getlist("alternatives")

                data = schema.load(form_data)

                # Extract file uploads
                files_dict = {}
                available_files = [
                    "cite",
                    "cleanup",
                    "complex2simple",
                    "g2p_model",
                    "ipa",
                    "meta",
                    "simple_dict",
                    "normal_dict",
                    "dict_json",
                    "guide_pdf",
                    "model_zip",
                ]

                for file_type in available_files:
                    if file_type in request.files:
                        uploaded_file = request.files[file_type]
                        if uploaded_file and uploaded_file.filename:
                            files_dict[file_type] = uploaded_file

            # Check if code is being changed and conflicts with existing
            if "code" in data and data["code"] != language.code:
                if Language.query.filter_by(code=data["code"]).first():
                    return {"message": "Language with this code already exists"}, 409

            # Handle file uploads if provided
            if files_dict:
                file_manager = LanguageFileManager(language)

                # Validate file types
                invalid_files = []
                for file_type, uploaded_file in files_dict.items():
                    if not file_manager.validate_file_type(uploaded_file, file_type):
                        invalid_files.append(file_type)

                if invalid_files:
                    return {
                        "message": "Invalid file types detected",
                        "invalid_files": invalid_files,
                    }, 400

                file_results = file_manager.save_multiple_files(files_dict)

                # Check if any file uploads failed
                failed_files = [f for f, success in file_results.items() if not success]
                if failed_files:
                    return {
                        "message": "Some file uploads failed",
                        "failed_files": failed_files,
                    }, 400

                files_uploaded = list(files_dict.keys())

                # Update language file status
                language.update_file_status()

            # Update language fields (exclude alternatives for now)
            update_fields = {k: v for k, v in data.items() if k != "alternatives"}
            for key, value in update_fields.items():
                setattr(language, key, value)

            # Handle alternatives
            if "alternatives" in data:
                # Clear existing alternatives
                language.alternatives = []

                # Add new alternatives
                for alt_code in data["alternatives"]:
                    alt_language = Language.query.filter_by(code=alt_code).first()
                    if alt_language:
                        language.alternatives.append(alt_language)

            language.update()

            response_schema = LanguageDetailSchema()
            language_data = response_schema.dump(language)

            # Add file information
            file_manager = LanguageFileManager(language)
            language_data["file_info"] = file_manager.get_file_info()
            language_data["missing_files"] = file_manager.get_missing_files()
            language_data["is_complete"] = file_manager.is_complete()

            return {
                "message": "Language updated successfully",
                "language": language_data,
                "files_uploaded": files_uploaded,
            }, 200

        except ValidationError as e:
            return {"message": "Validation error", "errors": e.messages}, 400
        except IntegrityError:
            db.session.rollback()
            return {"message": "Language with this code already exists"}, 409
        except Exception as e:
            log_exception(logger, "Error updating language")
            return {"message": f"Error updating language: {str(e)}"}, 500

    @jwt_required()
    def delete(self, language_id):
        """Delete language and optionally its files (admin only)"""
        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

        try:
            language = Language.query.filter_by(id=language_id).first()
            if not language:
                return {"message": "Language not found"}, 404

            # Check if language is used in tasks
            if language.tasks:
                return {"message": "Cannot delete language that is used in tasks"}, 409

            # Get query parameter for file deletion
            delete_files = request.args.get("delete_files", "false").lower() == "true"

            files_deleted = []
            if delete_files:
                file_manager = LanguageFileManager(language)
                available_files = [
                    "cite",
                    "cleanup",
                    "complex2simple",
                    "g2p_model",
                    "ipa",
                    "meta",
                    "simple_dict",
                    "normal_dict",
                    "dict_json",
                    "guide_pdf",
                    "model_zip",
                ]

                for file_type in available_files:
                    if file_manager.delete_file(file_type, create_backup=True):
                        files_deleted.append(file_type)

                # Also clean up backup directory if empty
                try:
                    backup_dir = file_manager.backup_dir
                    if os.path.exists(backup_dir) and not os.listdir(backup_dir):
                        os.rmdir(backup_dir)

                    language_dir = file_manager.language_dir
                    if os.path.exists(language_dir) and not os.listdir(language_dir):
                        os.rmdir(language_dir)
                except Exception as e:
                    logger.warning(f"Could not clean up directories: {e}")

            language.delete()

            response = {"message": "Language deleted successfully"}
            if delete_files:
                response["files_deleted"] = files_deleted
                response["files_deleted_count"] = len(files_deleted)

            return response, 200

        except Exception as e:
            log_exception(logger, "Error deleting language")
            return {"message": f"Error deleting language: {str(e)}"}, 500


class LanguageByCodeResource(Resource, AdminRequiredMixin):
    """Handle operations on languages by code (admin only)"""

    @jwt_required()
    def get(self, code):
        """Get language by code (admin only)"""
        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

        try:
            language = Language.query.filter_by(code=code, is_active=True).first()
            if not language:
                return {"message": "Language not found"}, 404

            schema = LanguageSchema()
            return {"language": schema.dump(language)}, 200

        except Exception as e:
            return {"message": f"Error retrieving language: {str(e)}"}, 500


class LanguageEnginesResource(Resource, AdminRequiredMixin):
    """Handle language-engine relationships (admin only)"""

    @jwt_required()
    def get(self, language_code):
        """Get engines for a language (admin only)"""
        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

        try:
            language = Language.query.filter_by(code=language_code).first()
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
        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

        try:
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


class LanguageFileResource(Resource, AdminRequiredMixin):
    """Handle individual language file operations (admin only)"""

    @jwt_required()
    def post(self, language_id, file_type):
        """Upload or replace a specific language file (admin only)"""
        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

        try:
            language = Language.query.filter_by(id=language_id).first()
            if not language:
                return {"message": "Language not found"}, 404

            available_files = [
                "cite",
                "cleanup",
                "complex2simple",
                "g2p_model",
                "ipa",
                "meta",
                "simple_dict",
                "normal_dict",
                "dict_json",
                "guide_pdf",
                "model_zip",
            ]

            if file_type not in available_files:
                return {"message": f"Invalid file type: {file_type}"}, 400

            if file_type not in request.files:
                return {"message": f"No {file_type} file provided"}, 400

            uploaded_file = request.files[file_type]
            if not uploaded_file or not uploaded_file.filename:
                return {"message": f"No {file_type} file provided"}, 400

            file_manager = LanguageFileManager(language)

            # Validate file type
            if not file_manager.validate_file_type(uploaded_file, file_type):
                return {"message": f"Invalid file type for {file_type}"}, 400

            # Save file (creates backup if file exists)
            success = file_manager.save_file(file_type, uploaded_file)
            if not success:
                return {"message": f"Failed to save {file_type} file"}, 500

            # Update language file status
            language.update_file_status()
            language.update()

            return {
                "message": f"{file_type} file uploaded successfully",
                "file_type": file_type,
                "filename": secure_filename(uploaded_file.filename),
            }, 200

        except Exception as e:
            log_exception(logger, f"Error uploading {file_type} file")
            return {"message": f"Error uploading {file_type} file: {str(e)}"}, 500

    @jwt_required()
    def delete(self, language_id, file_type):
        """Delete a specific language file (admin only)"""
        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

        try:
            language = Language.query.filter_by(id=language_id).first()
            if not language:
                return {"message": "Language not found"}, 404

            available_files = [
                "cite",
                "cleanup",
                "complex2simple",
                "g2p_model",
                "ipa",
                "meta",
                "simple_dict",
                "normal_dict",
                "dict_json",
                "guide_pdf",
                "model_zip",
            ]

            if file_type not in available_files:
                return {"message": f"Invalid file type: {file_type}"}, 400

            file_manager = LanguageFileManager(language)

            # Check if file exists
            if not file_manager.language.check_file_exists(file_type):
                return {"message": f"{file_type} file does not exist"}, 404

            # Delete file (creates backup)
            create_backup = request.args.get("backup", "true").lower() == "true"
            success = file_manager.delete_file(file_type, create_backup=create_backup)

            if not success:
                return {"message": f"Failed to delete {file_type} file"}, 500

            # Update language file status
            language.update_file_status()
            language.update()

            response = {
                "message": f"{file_type} file deleted successfully",
                "file_type": file_type,
            }

            if create_backup:
                response["backup_created"] = True

            return response, 200

        except Exception as e:
            log_exception(logger, f"Error deleting {file_type} file")
            return {"message": f"Error deleting {file_type} file: {str(e)}"}, 500

    @jwt_required()
    def get(self, language_id, file_type):
        """Get information about a specific language file (admin only)"""
        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

        try:
            language = Language.query.filter_by(id=language_id).first()
            if not language:
                return {"message": "Language not found"}, 404

            available_files = [
                "cite",
                "cleanup",
                "complex2simple",
                "g2p_model",
                "ipa",
                "meta",
                "simple_dict",
                "normal_dict",
                "dict_json",
                "guide_pdf",
                "model_zip",
            ]

            if file_type not in available_files:
                return {"message": f"Invalid file type: {file_type}"}, 400

            file_manager = LanguageFileManager(language)
            file_info = file_manager.get_file_info()

            if file_type not in file_info:
                return {"message": f"File type {file_type} not found"}, 404

            return {"file_type": file_type, "file_info": file_info[file_type]}, 200

        except Exception as e:
            log_exception(logger, f"Error getting {file_type} file info")
            return {"message": f"Error getting {file_type} file info: {str(e)}"}, 500


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
            single_schema = LanguageHomepageSchema()

            # Group languages by type for better frontend organization
            grouped_languages = {"nordic": [], "other": []}
            for lang in languages:
                lang_data = single_schema.dump(lang)
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


class LanguageListResource(Resource):
    """Handle operations on language collection"""

    def get(self):
        """Get list of languages with optional filtering"""
        try:
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
