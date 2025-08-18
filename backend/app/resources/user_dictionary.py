import os
import json
import yaml
import traceback
import subprocess
import charset_normalizer
from dotenv import load_dotenv
from flask_restful import Resource
from flask import current_app, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.user import User
from app.models.language import Language
from app.utils.helpers import missing_word_html
from app.utils.uploads import check_phones, formatUserDict

load_dotenv()
ADMIN = os.getenv("ADMIN")
UPLOADS = os.getenv("UPLOADS")


class UserDictionaryUploadResource(Resource):
    """
    Handle user dictionary uploads with phone validation and language support
    """

    @jwt_required()
    def post(self):
        """
        Upload user-made dictionary

        Form data:
            - dict: Dictionary file (.dict or .txt)
            - lang: Language code (e.g., 'engGB_MFA1_v010')
            - opType: Operation type ('replace' or 'append')
        """
        try:
            # Get current user
            current_user_id = int(get_jwt_identity())
            if not current_user_id:
                return {"status": "error", "message": "Authentication required"}, 401

            # Validate file upload
            if "dict" not in request.files:
                return {"status": "error", "message": "No file provided"}, 400

            file = request.files["dict"]
            if not file or file.filename == "":
                return {"status": "error", "message": "No file selected"}, 400

            # Validate form data
            lang = request.form.get("lang")
            op_type = request.form.get("opType", "replace")

            if not lang:
                return {"status": "error", "message": "Language must be specified"}, 400

            # Validate file extension
            if not (file.filename.endswith(".dict") or file.filename.endswith(".txt")):
                return {
                    "status": "error",
                    "message": "File must be a .dict or .txt file",
                }, 400

            # Read file content and detect encoding
            file_content = file.read()
            encoding_info = charset_normalizer.detect(file_content)
            current_app.logger.info(f"Uploaded file encoding: {encoding_info}")

            # Handle empty file case
            if len(file_content) == 0:
                return self._handle_empty_dict(current_user_id, lang)

            # Validate language and get phones
            try:
                if yaml is None:
                    return {
                        "status": "error",
                        "message": "YAML support not available",
                    }, 500

                meta_path = os.path.join(ADMIN, lang, f"{lang}_meta.yaml")
                if not os.path.exists(meta_path):
                    return {
                        "status": "error",
                        "message": f"Language {lang} not found",
                    }, 400

                with open(meta_path, "r") as f:
                    meta = yaml.load(f, Loader=yaml.FullLoader)
                    phones = meta["phones"]
            except Exception as e:
                current_app.logger.error(
                    f"Error loading language meta: {traceback.format_exc()}"
                )
                return {
                    "status": "error",
                    "message": "Invalid language configuration",
                }, 500

            # Validate phones in dictionary
            try:
                file_text = file_content.decode("utf-8")
                phone_check = check_phones(file_text, phones)
                if not phone_check["valid"]:
                    return {
                        "status": "error",
                        "message": f'Invalid phones: {list(phone_check["invalid_phones"])}',
                    }, 400
            except Exception as e:
                current_app.logger.error(
                    f"Phone validation error: {traceback.format_exc()}"
                )
                return {
                    "status": "error",
                    "message": "Error validating dictionary phones",
                }, 500

            # Check dictionary size limit
            character_count = len(file_content.splitlines())
            if character_count > current_app.user_limits.get("user_dict_limit", 50000):
                return {
                    "status": "error",
                    "message": f'Dictionary must have less than {current_app.user_limits.get("user_dict_limit", 50000)} characters',
                }, 400

            # Save dictionary
            result = self._save_dictionary(
                current_user_id, lang, file, file_content, op_type
            )

            if result["success"]:
                # Update user's default dictionary
                user = User.query.get(current_user_id)
                if user:
                    user.dict_default = lang
                    db.session.commit()

                return {
                    "status": "success",
                    "message": "Dictionary uploaded successfully",
                    "data": {
                        "dict_default": lang,
                        "word_count": character_count,
                        "operation": op_type,
                    },
                }
            else:
                return {"status": "error", "message": result["message"]}, 500

        except Exception as e:
            current_app.logger.error(
                f"Error in UserDictionaryUploadResource: {traceback.format_exc()}"
            )
            return {"status": "error", "message": "Error uploading dictionary"}, 500

    def _handle_empty_dict(self, user_id, lang):
        """Handle empty dictionary upload"""
        try:
            # Create user dictionary directory
            uuid = User.query.get(int(user_id)).uuid
            dict_dir = os.path.join(UPLOADS, uuid, "dic")
            os.makedirs(dict_dir, exist_ok=True)

            # Create empty files
            dict_path = os.path.join(dict_dir, f"{lang}.dict")
            json_path = os.path.join(dict_dir, f"{lang}.json")

            with open(dict_path, "w") as f:
                f.write("")

            with open(json_path, "w") as f:
                f.write("")

            # Update user default
            user = User.query.get(user_id)
            if user:
                user.dict_default = lang
                db.session.commit()

            return {
                "status": "success",
                "message": "Empty dictionary uploaded successfully",
                "data": {"dict_default": lang, "word_count": 0, "operation": "replace"},
            }

        except Exception as e:
            current_app.logger.error(
                f"Error handling empty dict: {traceback.format_exc()}"
            )
            return {
                "status": "error",
                "message": "Error creating empty dictionary",
            }, 500

    def _save_dictionary(self, user_id, lang, file, file_content, op_type):
        """Save dictionary file and create JSON index"""
        try:
            # Create user dictionary directory
            uuid = User.query.get(int(user_id)).uuid
            dict_dir = os.path.join(UPLOADS, uuid, "dic")
            os.makedirs(dict_dir, exist_ok=True)

            dict_path = os.path.join(dict_dir, f"{lang}.dict")

            # Handle replace vs append
            if op_type == "replace":
                current_app.logger.info(f"Replacing {lang}.dict")
                # Delete old dictionary if it exists
                if os.path.exists(dict_path):
                    os.remove(dict_path)
                    current_app.logger.info("Old user dict deleted")

                # Save new file
                with open(dict_path, "wb") as user_dict:
                    file.seek(0)
                    user_dict.write(file.read())
            else:
                # Append mode
                with open(dict_path, "ab") as f:
                    if os.path.exists(dict_path) and os.path.getsize(dict_path) > 0:
                        f.write(b"\n")
                    f.write(file_content)

            # Format and sort the dictionary
            formatUserDict(dict_path)

            # Sort and remove duplicates
            subprocess.run(
                f'/usr/bin/sort -u "{dict_path}" -o "{dict_path}"',
                shell=True,
                check=True,
            )

            # Create JSON index for fast lookups
            self._create_json_index(dict_path)

            return {"success": True, "message": "Dictionary saved successfully"}

        except Exception as e:
            current_app.logger.error(
                f"Error saving dictionary: {traceback.format_exc()}"
            )
            return {"success": False, "message": f"Error saving dictionary: {str(e)}"}

    def _create_json_index(self, dict_path):
        """Create JSON index for fast word lookups"""
        json_path = dict_path.replace(".dict", ".json")
        word_index = {}

        try:
            with open(dict_path, encoding="utf-8") as f:
                for line in f:
                    words = line.split()
                    if words and len(words) > 0:
                        # Store word in lowercase without non-breaking spaces
                        word = words[0].lower().replace("\u00a0", "")
                        word_index[word] = True

            with open(json_path, mode="w", encoding="utf-8") as f:
                json.dump(word_index, f, indent=4, ensure_ascii=False)

        except Exception as e:
            current_app.logger.error(
                f"Error creating JSON index: {traceback.format_exc()}"
            )
            raise


class UserDictionaryResource(Resource):
    """
    Retrieve user dictionary content with HTML formatting
    """

    @jwt_required()
    def post(self):
        """
        Get user dictionary content formatted as HTML

        Form data:
            - lang: Language code to retrieve dictionary for
        """
        try:
            current_user_id = int(get_jwt_identity())
            if not current_user_id:
                return {"status": "error", "message": "Authentication required"}, 401

            data = request.get_json()
            lang = data.get("lang")
            if not lang:
                return {"status": "error", "message": "Language must be specified"}, 400

            # Get language phones for validation info
            try:
                if yaml is None:
                    return {
                        "status": "error",
                        "message": "YAML support not available",
                    }, 500

                meta_path = os.path.join(ADMIN, lang, f"{lang}_meta.yaml")
                if not os.path.exists(meta_path):
                    return {
                        "status": "error",
                        "message": f"Language {lang} not found",
                    }, 400

                with open(meta_path, "r") as f:
                    meta = yaml.load(f, Loader=yaml.FullLoader)
                    phones = meta["phones"]
            except Exception as e:
                current_app.logger.error(
                    f"Error loading language meta: {traceback.format_exc()}"
                )
                return {
                    "status": "error",
                    "message": "Invalid language configuration",
                }, 500

            # Check if user dictionary exists
            user = User.query.get(int(current_user_id))
            dict_dir = os.path.join(UPLOADS, user.uuid, "dic")
            dict_path = os.path.join(dict_dir, f"{lang}.dict")

            if not os.path.exists(dict_dir) or not os.path.exists(dict_path):
                return {
                    "status": "success",
                    "message": "No user-made dictionary found for this language",
                    "data": {
                        "content": "",
                        "phones": phones,
                        "word_count": 0,
                        "language": lang,
                    },
                }

            # Read and format dictionary content
            try:
                with open(dict_path, "r", encoding="utf-8") as f:
                    content = f.readlines()

                # Format content as HTML
                html_content = missing_word_html(content)

                return {
                    "status": "success",
                    "message": "Dictionary retrieved successfully",
                    "data": {
                        "content": html_content,
                        "phones": phones,
                        "word_count": len([x for x in content if x.strip()]),
                        "language": lang,
                    },
                }

            except Exception as e:
                current_app.logger.error(
                    f"Error reading dictionary: {traceback.format_exc()}"
                )
                return {
                    "status": "error",
                    "message": "Error reading dictionary file",
                }, 500

        except Exception as e:
            current_app.logger.error(
                f"Error in UserDictionaryResource: {traceback.format_exc()}"
            )
            return {"status": "error", "message": "Error retrieving dictionary"}, 500


class UserDictionaryListResource(Resource):
    """
    List available user dictionaries and get basic info
    """

    @jwt_required()
    def get(self):
        """
        Get list of user's uploaded dictionaries
        """
        try:
            current_user_id = int(get_jwt_identity())
            if not current_user_id:
                return {"status": "error", "message": "Authentication required"}, 401

            dict_dir = os.path.join(UPLOADS, str(current_user_id), "dic")

            if not os.path.exists(dict_dir):
                return {
                    "status": "success",
                    "data": {"dictionaries": [], "total_count": 0},
                }

            # Scan for dictionary files
            dictionaries = []

            for filename in os.listdir(dict_dir):
                if filename.endswith(".dict"):
                    lang_code = filename.replace(".dict", "")
                    dict_path = os.path.join(dict_dir, filename)
                    json_path = os.path.join(dict_dir, f"{lang_code}.json")

                    try:
                        # Get file stats
                        file_stats = os.stat(dict_path)
                        word_count = 0

                        # Count words
                        with open(dict_path, "r", encoding="utf-8") as f:
                            word_count = len([line for line in f if line.strip()])

                        # Get language name
                        language_name = self._get_language_name(lang_code)

                        dictionary_info = {
                            "language_code": lang_code,
                            "language_name": language_name,
                            "word_count": word_count,
                            "file_size": file_stats.st_size,
                            "last_modified": file_stats.st_mtime,
                            "has_json_index": os.path.exists(json_path),
                        }

                        dictionaries.append(dictionary_info)

                    except Exception as e:
                        current_app.logger.error(
                            f"Error processing dictionary {filename}: {str(e)}"
                        )
                        continue

            # Sort by last modified (newest first)
            dictionaries.sort(key=lambda x: x["last_modified"], reverse=True)

            return {
                "status": "success",
                "data": {
                    "dictionaries": dictionaries,
                    "total_count": len(dictionaries),
                },
            }

        except Exception as e:
            current_app.logger.error(
                f"Error in UserDictionaryListResource: {traceback.format_exc()}"
            )
            return {
                "status": "error",
                "message": "Error retrieving dictionary list",
            }, 500

    def _get_language_name(self, lang_code):
        """Get human-readable language name from code"""
        try:
            language = Language.query.filter_by(code=lang_code, is_active=True).first()
            if language:
                return language.display_name
            return lang_code  # Fallback to code if name not found
        except:
            return lang_code


class UserDictionaryDeleteResource(Resource):
    """
    Delete user dictionary
    """

    @jwt_required()
    def delete(self, lang_code):
        """
        Delete a user's dictionary for a specific language

        Args:
            lang_code: Language code of dictionary to delete
        """
        try:
            current_user_id = int(get_jwt_identity())
            if not current_user_id:
                return {"status": "error", "message": "Authentication required"}, 401

            dict_dir = os.path.join(UPLOADS, str(current_user_id), "dic")
            dict_path = os.path.join(dict_dir, f"{lang_code}.dict")
            json_path = os.path.join(dict_dir, f"{lang_code}.json")

            if not os.path.exists(dict_path):
                return {"status": "error", "message": "Dictionary not found"}, 404

            # Delete dictionary files
            try:
                os.remove(dict_path)
                if os.path.exists(json_path):
                    os.remove(json_path)

                # If this was the user's default dictionary, clear it
                user = User.query.get(current_user_id)
                if user and user.dict_default == lang_code:
                    user.dict_default = None
                    db.session.commit()

                return {
                    "status": "success",
                    "message": "Dictionary deleted successfully",
                }

            except Exception as e:
                current_app.logger.error(
                    f"Error deleting dictionary: {traceback.format_exc()}"
                )
                return {
                    "status": "error",
                    "message": "Error deleting dictionary files",
                }, 500

        except Exception as e:
            current_app.logger.error(
                f"Error in UserDictionaryDeleteResource: {traceback.format_exc()}"
            )
            return {"status": "error", "message": "Error deleting dictionary"}, 500
