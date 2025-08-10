import os
import shutil
import traceback
from datetime import datetime
from dotenv import load_dotenv
from flask_restful import Resource
from flask import current_app, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.task import Task, TaskStatus, FileType
from app.utils.uploads import isAudioFile, fileOps

load_dotenv()
UPLOADS = os.getenv("UPLOADS")


class TaskReuploadResource(Resource):
    """
    Reupload audio files for tasks with backed up transcription files
    Replaces the legacy /reupload route
    """

    @jwt_required()
    def post(self, task_id):
        """
        Reupload audio file for a specific task

        Form Data:
            - audio_file: The new audio file to upload
        """
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return {"status": "error", "message": "Authentication required"}, 401

            # Get task from database
            task = Task.query.filter_by(task_id=task_id).first()
            if not task:
                return {"status": "error", "message": "Task not found"}, 404

            # Check if user owns this task
            if task.user_id != current_user_id:
                return {"status": "error", "message": "Access denied"}, 403

            # Check if file is provided
            if "audio_file" not in request.files:
                return {"status": "error", "message": "No audio file provided"}, 400

            audio_file = request.files["audio_file"]
            if audio_file.filename == "":
                return {"status": "error", "message": "No audio file selected"}, 400

            # Validate file name matches expected format
            validation_result = self._validate_file_name(task, audio_file)
            if validation_result["error"]:
                return {"status": "error", "message": validation_result["message"]}, 400

            # Check for backed up transcription files
            held_paths = self._get_held_paths(task)
            if not held_paths:
                # Mark task as disabled if no transcription files
                task.task_status = TaskStatus.FAILED
                task.updated_at = datetime.now()
                db.session.commit()

                return {
                    "status": "error",
                    "message": "No transcription files found for reupload",
                    "error_type": "no_transcription_files",
                }, 400

            # Process the reupload
            result = self._process_reupload(task, audio_file, held_paths)

            return {
                "status": "success",
                "message": "Audio file reuploaded successfully",
                "data": {
                    "task_id": task_id,
                    "task_status": TaskStatus.UPLOADED.value,
                    "uploaded_file": result["uploaded_file"],
                    "restored_files": result["restored_files"],
                },
            }

        except Exception as e:
            current_app.logger.error(
                f"Error in TaskReuploadResource: {traceback.format_exc()}"
            )
            return {"status": "error", "message": "Failed to reupload audio file"}, 500

    def _validate_file_name(self, task, audio_file):
        """Validate that the uploaded file name matches the expected format"""
        uploaded_filename = os.path.splitext(audio_file.filename)[0]

        # Get expected file names from task
        expected_names = self._get_expected_file_names(task)

        if not expected_names:
            return {
                "error": True,
                "message": "No expected file names found for this task",
            }

        # Check if uploaded filename matches any expected name
        for expected_name in expected_names:
            if (
                uploaded_filename
                == os.path.splitext(os.path.basename(expected_name))[0]
            ):
                return {"error": False, "expected_name": expected_name}

        # If no match found, return error with expected names
        expected_names_str = ", ".join(
            [os.path.splitext(os.path.basename(name))[0] for name in expected_names]
        )

        return {
            "error": True,
            "message": f"File name mismatch. Expected one of: {expected_names_str}, but got: {uploaded_filename}",
        }

    def _get_expected_file_names(self, task):
        """Get expected file names from the task"""
        expected_names = []

        # Check if task has file_names relationship
        if hasattr(task, "file_names") and task.file_names:
            for file_name in task.file_names:
                expected_names.append(file_name.original_name)

        # Fallback: use download_title
        if not expected_names and task.download_title:
            expected_names.append(task.download_title)

        # Last resort: extract from task_path
        if not expected_names and task.task_path:
            task_dir = os.path.join(UPLOADS, task.task_path)
            if os.path.exists(task_dir):
                for root, dirs, files in os.walk(task_dir):
                    for file in files:
                        if isAudioFile(file):
                            expected_names.append(file)
                            break

        return expected_names

    def _get_held_paths(self, task):
        """Get backed up transcription file paths"""
        held_paths = []

        # Check if task has files relationship for held/backup files
        if hasattr(task, "files") and task.files:
            for file in task.files:
                if file.file_type == FileType.HELD:
                    held_paths.append(file.file_path)

        # Fallback: check if held_paths is stored as JSON string
        if not held_paths and hasattr(task, "held_paths") and task.held_paths:
            try:
                import json

                stored_paths = json.loads(task.held_paths)
                if isinstance(stored_paths, list):
                    # Verify paths exist
                    for path in stored_paths:
                        if os.path.exists(path):
                            held_paths.append(path)
            except:
                pass

        # Last resort: look for held files in standard location
        if not held_paths:
            held_dir = os.path.join(UPLOADS, "held", task.task_id)
            if os.path.exists(held_dir):
                for root, dirs, files in os.walk(held_dir):
                    for file in files:
                        if file.endswith(".TextGrid"):
                            held_paths.append(os.path.join(root, file))

        return held_paths

    def _process_reupload(self, task, audio_file, held_paths):
        """Process the reupload operation"""
        # Recreate task directory
        task_dir = os.path.join(UPLOADS, task.task_path) if task.task_path else None
        if not task_dir:
            # Generate new task path if missing
            task_dir = os.path.join(UPLOADS, str(task.user_id), "tasks", task.task_id)
            task.task_path = os.path.relpath(task_dir, UPLOADS)

        os.makedirs(task_dir, exist_ok=True)

        # Determine file paths
        file_paths = self._determine_file_paths(task, audio_file, task_dir)
        audio_path = file_paths["audio_path"]
        textgrid_path = file_paths["textgrid_path"]

        restored_files = []

        # Restore TextGrid files from held paths
        for held_file in held_paths:
            if os.path.exists(held_file):
                if not os.path.exists(textgrid_path):
                    os.makedirs(os.path.dirname(textgrid_path), exist_ok=True)
                    shutil.copy2(held_file, textgrid_path)
                    restored_files.append(
                        {
                            "type": "textgrid",
                            "source": held_file,
                            "destination": textgrid_path,
                        }
                    )
                    current_app.logger.info(
                        f"Restored TextGrid: {held_file} -> {textgrid_path}"
                    )

        # Save the uploaded audio file
        audio_file.save(audio_path)
        current_app.logger.info(f"Saved audio file: {audio_path}")

        # Process audio file (convert, optimize, etc.)
        try:
            processed_path = fileOps(audio_path, task.lang)
            if processed_path != audio_path:
                audio_path = processed_path
                current_app.logger.info(f"Audio file processed: {audio_path}")
        except Exception as e:
            current_app.logger.warning(f"Audio processing failed: {e}")
            # Continue even if processing fails

        # Update task status
        task.task_status = TaskStatus.UPLOADED
        task.updated_at = datetime.now()

        # Update file records if using file relationships
        self._update_file_records(task, audio_path, textgrid_path)

        db.session.commit()

        current_app.logger.info(f"Reupload completed for task {task.task_id}")

        return {"uploaded_file": audio_path, "restored_files": restored_files}

    def _determine_file_paths(self, task, audio_file, task_dir):
        """Determine where to save the audio and TextGrid files"""
        # Get file extension from uploaded file
        file_extension = os.path.splitext(audio_file.filename)[1]
        base_filename = os.path.splitext(audio_file.filename)[0]

        # Create paths
        audio_path = os.path.join(task_dir, f"{base_filename}{file_extension}")
        textgrid_path = os.path.join(task_dir, f"{base_filename}.TextGrid")

        return {"audio_path": audio_path, "textgrid_path": textgrid_path}

    def _update_file_records(self, task, audio_path, textgrid_path):
        """Update file records in the database"""
        try:
            # Remove existing file records for this task
            if hasattr(task, "files"):
                for file_record in task.files:
                    if file_record.file_type in [FileType.AUDIO, FileType.TEXTGRID]:
                        db.session.delete(file_record)

            # Add new file records
            from app.models.task import TaskFile

            # Add audio file record
            audio_file_record = TaskFile(
                task_id=task.id,
                file_type=FileType.AUDIO,
                file_path=audio_path,
                original_filename=os.path.basename(audio_path),
            )
            db.session.add(audio_file_record)

            # Add TextGrid file record if it exists
            if os.path.exists(textgrid_path):
                textgrid_file_record = TaskFile(
                    task_id=task.id,
                    file_type=FileType.TEXTGRID,
                    file_path=textgrid_path,
                    original_filename=os.path.basename(textgrid_path),
                )
                db.session.add(textgrid_file_record)

        except Exception as e:
            current_app.logger.warning(f"Could not update file records: {e}")
            # Continue even if file record update fails


class TaskReuploadInfoResource(Resource):
    """
    Get information about what files can be reuploaded for a task
    """

    @jwt_required()
    def get(self, task_id):
        """
        Get reupload information for a specific task
        """
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return {"status": "error", "message": "Authentication required"}, 401

            # Get task from database
            task = Task.query.filter_by(task_id=task_id).first()
            if not task:
                return {"status": "error", "message": "Task not found"}, 404

            # Check if user owns this task
            if task.user_id != current_user_id:
                return {"status": "error", "message": "Access denied"}, 403

            # Get held paths and expected file names
            held_paths = self._get_held_paths(task)
            expected_names = self._get_expected_file_names(task)

            # Check audio extensions
            audio_extensions = getattr(current_app, "audio_extensions", [])

            # Determine if reupload is possible
            can_reupload = len(held_paths) > 0 and len(expected_names) > 0

            reupload_info = {
                "can_reupload": can_reupload,
                "task_id": task_id,
                "task_status": task.task_status.value,
                "expected_filenames": [
                    os.path.splitext(os.path.basename(name))[0]
                    for name in expected_names
                ],
                "supported_extensions": audio_extensions,
                "backed_up_files": [
                    {
                        "path": path,
                        "filename": os.path.basename(path),
                        "exists": os.path.exists(path),
                    }
                    for path in held_paths
                ],
                "requirements": [
                    "Audio filename must match one of the expected filenames",
                    "Audio file must have a supported extension",
                    "Transcription files must be backed up and available",
                ],
            }

            if not can_reupload:
                reasons = []
                if not held_paths:
                    reasons.append("No backed up transcription files found")
                if not expected_names:
                    reasons.append("No expected file names available")

                reupload_info["cannot_reupload_reasons"] = reasons

            return {"status": "success", "data": reupload_info}

        except Exception as e:
            current_app.logger.error(
                f"Error in TaskReuploadInfoResource: {traceback.format_exc()}"
            )
            return {
                "status": "error",
                "message": "Failed to get reupload information",
            }, 500

    def _get_held_paths(self, task):
        """Get backed up transcription file paths - same as in TaskReuploadResource"""
        held_paths = []

        # Check if task has files relationship for held/backup files
        if hasattr(task, "files") and task.files:
            for file in task.files:
                if file.file_type == FileType.HELD:
                    held_paths.append(file.file_path)

        # Fallback: check if held_paths is stored as JSON string
        if not held_paths and hasattr(task, "held_paths") and task.held_paths:
            try:
                import json

                stored_paths = json.loads(task.held_paths)
                if isinstance(stored_paths, list):
                    # Verify paths exist
                    for path in stored_paths:
                        if os.path.exists(path):
                            held_paths.append(path)
            except:
                pass

        # Last resort: look for held files in standard location
        if not held_paths:
            held_dir = os.path.join(UPLOADS, "held", task.task_id)
            if os.path.exists(held_dir):
                for root, dirs, files in os.walk(held_dir):
                    for file in files:
                        if file.endswith(".TextGrid"):
                            held_paths.append(os.path.join(root, file))

        return held_paths

    def _get_expected_file_names(self, task):
        """Get expected file names - same as in TaskReuploadResource"""
        expected_names = []

        # Check if task has file_names relationship
        if hasattr(task, "file_names") and task.file_names:
            for file_name in task.file_names:
                expected_names.append(file_name.original_name)

        # Fallback: use download_title
        if not expected_names and task.download_title:
            expected_names.append(task.download_title)

        # Last resort: extract from task_path
        if not expected_names and task.task_path:
            task_dir = os.path.join(UPLOADS, task.task_path)
            if os.path.exists(task_dir):
                for root, dirs, files in os.walk(task_dir):
                    for file in files:
                        if isAudioFile(file):
                            expected_names.append(file)
                            break

        return expected_names
