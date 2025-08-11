import os
import shutil
import textgrid
import traceback
import subprocess
import charset_normalizer
from datetime import datetime
from app.utils.datetime_helpers import utc_now
from dotenv import load_dotenv
from flask_restful import Resource
from flask import current_app, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.task import Task
from app.models.language import Language
from app.utils.uploads import processTextGridNew

load_dotenv()
UPLOADS = os.getenv("UPLOADS")
ADMIN = os.getenv("ADMIN")
MFA_GENERATE_DICTIONARY = os.getenv("MFA_GENERATE_DICTIONARY")


class LanguageChangeResource(Resource):
    """
    Change the language of an existing task and regenerate missing word pronunciations
    Replaces the legacy /change_lang route
    """

    @jwt_required()
    def post(self):
        """
        Change task language and regenerate missing words

        JSON body:
            - task_id: ID of the task to change language for
            - new_lang: New language code (e.g., 'engGB_MFA1_v010')
        """
        try:
            current_user_id = int(get_jwt_identity())
            if not current_user_id:
                return {"status": "error", "message": "Authentication required"}, 401

            json_data = request.get_json()
            if not json_data:
                return {"status": "error", "message": "JSON body required"}, 400

            task_id = json_data.get("task_id")
            new_lang = json_data.get("new_lang")

            if not task_id or not new_lang:
                return {
                    "status": "error",
                    "message": "task_id and new_lang are required",
                }, 400

            # Get task from database
            task = Task.query.filter_by(task_id=task_id).first()
            if not task:
                return {"status": "error", "message": "Task not found"}, 404

            # Check if user owns this task
            if task.user_id != current_user_id:
                return {"status": "error", "message": "Access denied"}, 403

            # Validate new language exists
            language = Language.query.filter_by(code=new_lang, is_active=True).first()
            if not language:
                return {
                    "status": "error",
                    "message": "Invalid or inactive language code",
                }, 400

            # Check if task has required files
            if not task.task_path:
                return {"status": "error", "message": "Task has no file path"}, 400

            # Get held paths - assuming they're stored as JSON in the database
            held_paths = self._get_held_paths(task)
            if not held_paths:
                return {
                    "status": "error",
                    "message": "No TextGrid files found for this task",
                }, 400

            # Process language change
            result = self._process_language_change(
                task, new_lang, current_user_id, held_paths
            )

            return {
                "status": "success",
                "message": f"Language changed to {language.display_name}",
                "data": {
                    "task_id": task_id,
                    "old_lang": task.lang,
                    "new_lang": new_lang,
                    "missing_words": result["missing_words"],
                    "missing_dict_path": os.path.relpath(result["missing_dict_path"]),
                },
            }

        except Exception as e:
            current_app.logger.error(
                f"Error in LanguageChangeResource: {traceback.format_exc()}"
            )
            return {"status": "error", "message": "Failed to change task language"}, 500

    def _get_held_paths(self, task):
        """Extract held paths from task - adapt based on how they're stored"""
        # Check if task has files relationship
        if hasattr(task, "files") and task.files:
            # Get TextGrid files from task files
            textgrid_paths = []
            for file in task.files:
                if file.file_type.value == "textgrid" or file.file_path.endswith(
                    ".TextGrid"
                ):
                    textgrid_paths.append(file.file_path)
            return textgrid_paths

        # Fallback: check if held_paths is stored as JSON string
        if hasattr(task, "held_paths") and task.held_paths:
            try:
                import json

                held_paths = json.loads(task.held_paths)
                if isinstance(held_paths, list):
                    return held_paths
            except:
                pass

        # Last resort: scan task directory for TextGrid files
        task_dir = os.path.join(UPLOADS, task.task_path) if task.task_path else None
        if task_dir and os.path.exists(task_dir):
            textgrid_files = []
            for root, dirs, files in os.walk(task_dir):
                for file in files:
                    if file.endswith(".TextGrid"):
                        textgrid_files.append(os.path.join(root, file))
            return textgrid_files

        return []

    def _process_language_change(self, task, new_lang, user_id, held_paths):
        """Process the language change for all TextGrid files"""
        total_missing_words = 0
        task_map = task.task_path.split("/")[-1] if task.task_path else task.task_id

        # Create timestamp for the missing pronunciation file
        timestamp = utc_now().strftime("%Y-%m-%d_%H.%M.%S")
        final_path = os.path.join(
            UPLOADS, str(user_id), "dic", "missing", f"suggpron_{timestamp}.txt"
        )

        # Ensure the directory exists
        os.makedirs(os.path.dirname(final_path), exist_ok=True)

        for tg_path in held_paths:
            if not os.path.exists(tg_path):
                current_app.logger.warning(f"TextGrid file not found: {tg_path}")
                continue

            try:
                missing_words_count = self._process_single_textgrid(
                    tg_path, new_lang, user_id, task_map, final_path
                )
                total_missing_words += missing_words_count

            except Exception as e:
                current_app.logger.error(f"Error processing TextGrid {tg_path}: {e}")
                continue

        # Update task in database
        task.lang = new_lang
        task.missing_words = total_missing_words
        task.missingprondict = final_path
        task.updated_at = utc_now()

        # Update language relationship if available
        language = Language.query.filter_by(code=new_lang).first()
        if language:
            task.lang_id = language.id

        db.session.commit()

        current_app.logger.info(
            f"Language change completed for task {task.task_id}: "
            f"{total_missing_words} missing words"
        )

        return {"missing_words": total_missing_words, "missing_dict_path": final_path}

    def _process_single_textgrid(
        self, tg_path, new_lang, user_id, task_map, final_path
    ):
        """Process a single TextGrid file for language change"""
        # Set up paths
        missing_dict_path = os.path.join(
            UPLOADS, str(user_id), "dic", "missing", "missing.dict"
        )
        missing_path = os.path.join(UPLOADS, str(user_id), "dic", "missing")
        missing_path_temp = os.path.join(
            UPLOADS, str(user_id), "dic", "missing", task_map
        )
        missingpron_path = os.path.join(
            UPLOADS, str(user_id), "dic", "missing", task_map, "missingpron.dict"
        )

        try:
            # Detect character encoding
            with open(tg_path, "rb") as f:
                char_encoding = charset_normalizer.detect(f.read())["encoding"]

            if "kr" in char_encoding.lower() or "jp" in char_encoding.lower():
                char_encoding = "utf-8"

            current_app.logger.info(
                f"Character encoding for {tg_path}: {char_encoding}"
            )

            # Open and process TextGrid
            textgrid_object = textgrid.openTextgrid(tg_path, includeEmptyIntervals=True)
            processed = processTextGridNew(
                textgrid_object,
                missing_path,
                missing_dict_path,
                user_id=user_id,
                lang=new_lang,
            )

            missing_words_count = len(processed["missing_words"])

            if missing_words_count > 0:
                # Create temporary directory
                os.makedirs(missing_path_temp, exist_ok=True)

                # Generate pronunciations using MFA
                g2p_model_path = os.path.join(
                    ADMIN, new_lang, f"{new_lang}_g2p_model.zip"
                )

                if os.path.exists(g2p_model_path):
                    current_app.logger.info(
                        f"Generating pronunciations: {MFA_GENERATE_DICTIONARY} "
                        f"{g2p_model_path} {missing_dict_path} {missingpron_path}"
                    )

                    subprocess.run(
                        [
                            MFA_GENERATE_DICTIONARY,
                            g2p_model_path,
                            missing_dict_path,
                            missingpron_path,
                        ],
                        check=True,
                    )

                    # Append generated pronunciations to final file
                    if os.path.exists(missingpron_path):
                        with open(
                            missingpron_path, "r", encoding="utf-8"
                        ) as missing_file:
                            missing_content = missing_file.read()

                        with open(final_path, "a", encoding="utf-8") as final_file:
                            final_file.write(missing_content)

                        current_app.logger.info(
                            f"Appended {missing_words_count} pronunciations to {final_path}"
                        )
                else:
                    current_app.logger.warning(f"G2P model not found: {g2p_model_path}")

                # Cleanup temporary files
                self._cleanup_temp_files(
                    missing_dict_path, missingpron_path, missing_path_temp
                )

            return missing_words_count

        except subprocess.CalledProcessError as e:
            current_app.logger.error(f"MFA G2P generation failed: {e}")
            self._cleanup_temp_files(
                missing_dict_path, missingpron_path, missing_path_temp
            )
            raise

        except Exception as e:
            current_app.logger.error(f"Error processing TextGrid {tg_path}: {e}")
            self._cleanup_temp_files(
                missing_dict_path, missingpron_path, missing_path_temp
            )
            raise

    def _cleanup_temp_files(
        self, missing_dict_path, missingpron_path, missing_path_temp
    ):
        """Clean up temporary files and directories"""
        try:
            # Remove missingpron.dict
            if os.path.exists(missingpron_path):
                os.remove(missingpron_path)

            # Remove missing.dict
            if os.path.exists(missing_dict_path):
                os.remove(missing_dict_path)

            # Remove temporary directory
            if os.path.exists(missing_path_temp):
                shutil.rmtree(missing_path_temp)

        except Exception as e:
            current_app.logger.warning(f"Error during cleanup: {e}")


class TaskLanguageListResource(Resource):
    """
    Get available languages for a specific task
    """

    @jwt_required()
    def get(self, task_id):
        """
        Get list of available languages for language change
        """
        try:
            current_user_id = int(get_jwt_identity())
            if not current_user_id:
                return {"status": "error", "message": "Authentication required"}, 401

            # Get task from database
            task = Task.query.filter_by(task_id=task_id).first()
            if not task:
                return {"status": "error", "message": "Task not found"}, 404

            # Check if user owns this task
            if task.user_id != current_user_id:
                return {"status": "error", "message": "Access denied"}, 403

            # Get all active languages
            languages = (
                Language.query.filter_by(is_active=True)
                .order_by(Language.priority)
                .all()
            )

            languages_data = []
            for language in languages:
                # Check if G2P model exists for this language
                g2p_model_path = os.path.join(
                    ADMIN, language.code, f"{language.code}_g2p_model.zip"
                )
                has_g2p_model = os.path.exists(g2p_model_path)

                languages_data.append(
                    {
                        "code": language.code,
                        "display_name": language.display_name,
                        "language_name": language.language_name,
                        "current": language.code == task.lang,
                        "has_g2p_model": has_g2p_model,
                        "available": has_g2p_model,  # Only available if G2P model exists
                    }
                )

            return {
                "status": "success",
                "data": {
                    "task_id": task_id,
                    "current_language": task.lang,
                    "available_languages": languages_data,
                },
            }

        except Exception as e:
            current_app.logger.error(
                f"Error in TaskLanguageListResource: {traceback.format_exc()}"
            )
            return {
                "status": "error",
                "message": "Failed to get available languages",
            }, 500
