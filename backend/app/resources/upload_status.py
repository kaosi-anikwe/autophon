import os
import tempfile
import traceback
from zipfile import ZipFile
from flask_restful import Resource
from flask import current_app, request, send_file
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.models.task import Task, TaskStatus, FileType
from app.utils.helpers import missing_word_html
from app.utils.logger import get_logger

logger = get_logger(__name__)


class UploadStatusResource(Resource):
    """
    Enhanced upload status monitoring endpoint replacing the SSE implementation
    Provides polling-based status updates for task upload and processing
    """

    def get(self, task_id=None):
        """
        Get upload/processing status for tasks

        Args:
            task_id: Optional specific task ID

        Query params:
            - status_filter: comma-separated statuses (uploading,uploaded,aligned,completed,pre-error)
            - limit: max number of tasks to return (default: 50)
        """
        try:
            # Get user identification (supports both authenticated and anonymous users)
            user_id = self._get_user_id()
            if not user_id:
                return {
                    "status": "error",
                    "message": "User identification required",
                }, 400

            # Build base query
            query = Task.query.filter(
                Task.user_id == user_id,
                Task.deleted.is_(None),  # Only non-deleted tasks
            )

            # Add task_id filter if specified
            if task_id:
                query = query.filter(Task.task_id == task_id)

            # Add status filter if specified
            status_filter = request.args.get("status_filter")
            if status_filter:
                statuses = [TaskStatus(s.strip()) for s in status_filter.split(",")]
                query = query.filter(Task.task_status.in_(statuses))

            # Apply limit
            limit = min(int(request.args.get("limit", 50)), 100)  # Max 100 tasks
            tasks = query.order_by(Task.created_at.desc()).limit(limit).all()

            # Process tasks for response
            processed_tasks = []
            for task in tasks:
                processed_task = self._process_task_data(task)
                processed_tasks.append(processed_task)

            # Return single task or list
            if task_id:
                if processed_tasks:
                    return {"status": "success", "data": processed_tasks[0]}
                else:
                    return {"status": "error", "message": "Task not found"}, 404

            return {
                "status": "success",
                "data": {"tasks": processed_tasks, "total_count": len(processed_tasks)},
            }

        except Exception as e:
            current_app.logger.error(
                f"Error in UploadStatusResource: {traceback.format_exc()}"
            )
            return {
                "status": "error",
                "message": "Failed to retrieve upload status",
            }, 500

    def _get_user_id(self):
        """Get user ID from JWT or query parameter (for anonymous users)"""
        try:
            # Try JWT first (authenticated users)
            verify_jwt_in_request(optional=True)
            current_user_id = int(get_jwt_identity())
            if current_user_id:
                return current_user_id
        except:
            pass

        # Fallback to query param (anonymous users)
        return request.args.get("user_id")

    def _process_task_data(self, task):
        """Process Task model data for API response"""
        # Convert to dictionary
        task_data = {
            "task_id": task.task_id,
            "user_id": task.user_id,
            "task_status": task.task_status.value,
            "download_title": task.download_title or f"Task {task.task_id}",
            "download_date": task.download_date if task.download_date else None,
            "trans_choice": task.trans_choice,
            "lang": task.lang,
            "size": str(task.size or 0),
            "missing_words": str(task.missing_words or 0),
            "no_of_files": task.no_of_files or 0,
            "words": task.words or 0,
            "duration": task.duration or 0,
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "updated_at": task.updated_at.isoformat() if task.updated_at else None,
        }

        # Determine if this is a batch task
        task_data["batch"] = (
            task.trans_choice in ["exp-a", "comp-ling"] if task.trans_choice else False
        )

        # Generate download URLs based on task status
        if task.task_status in [TaskStatus.UPLOADING, TaskStatus.FAILED]:
            task_data["textgrid_url"] = None
            task_data["download_url"] = None
        else:
            # TextGrid download URL (incomplete/uploaded tasks)
            task_data[
                "textgrid_url"
            ] = f"/api/v1/tasks/{task.task_id}/download/textgrid"

            # Complete download URL (completed tasks)
            if task.task_status == TaskStatus.COMPLETED:
                task_data[
                    "download_url"
                ] = f"/api/v1/tasks/{task.task_id}/download/complete"
            else:
                task_data["download_url"] = None

        # Process missing words if present
        if task.missing_words and int(task.missing_words) > 0:
            task_data["has_missing_words"] = True
            task_data[
                "missing_dict_url"
            ] = f"/api/v1/tasks/{task.task_id}/download/missing_dict"
            task_data[
                "missing_words_html_url"
            ] = f"/api/v1/tasks/{task.task_id}/missing-words"
        else:
            task_data["has_missing_words"] = False
            task_data["missing_dict_url"] = None
            task_data["missing_words_html_url"] = None

        return task_data


class TaskDownloadResource(Resource):
    """
    Enhanced download endpoint for different task-related downloads
    Handles TextGrid files, complete task ZIPs, and missing word dictionaries
    """

    def get(self, task_id, download_type):
        """
        Download task-related files

        Args:
            task_id: Task identifier
            download_type: Type of download ('textgrid', 'complete', 'missing_dict')
        """
        try:
            # Get user identification
            user_id = self._get_user_id()
            if not user_id:
                return {
                    "status": "error",
                    "message": "User identification required",
                }, 400

            # Get task from database
            task = Task.query.filter(
                Task.task_id == task_id, Task.user_id == user_id, Task.deleted.is_(None)
            ).first()

            if not task:
                return {"status": "error", "message": "Task not found"}, 404

            # Handle different download types
            if download_type == "textgrid":
                return self._download_textgrid(task)
            elif download_type == "complete":
                return self._download_complete(task)
            elif download_type == "missing_dict":
                return self._download_missing_dict(task)
            else:
                return {"status": "error", "message": "Invalid download type"}, 400

        except Exception as e:
            current_app.logger.error(
                f"Error in TaskDownloadResource: {traceback.format_exc()}"
            )
            return {"status": "error", "message": "Failed to download file"}, 500

    def _get_user_id(self):
        """Get user ID from JWT or query parameter"""
        try:
            verify_jwt_in_request(optional=True)
            current_user_id = int(get_jwt_identity())
            if current_user_id:
                return current_user_id
        except:
            pass

        return request.args.get("user_id")

    def _download_textgrid(self, task):
        """Download TextGrid files for incomplete/uploaded tasks"""
        # Parse held_paths from task (assuming it's stored as JSON or similar)
        held_paths = self._get_held_paths(task)

        if not held_paths:
            return {"status": "error", "message": "No TextGrid files available"}, 404

        if len(held_paths) == 1:
            # Single TextGrid file
            file_path = held_paths[0]
            if not os.path.exists(file_path):
                return {"status": "error", "message": "File not found"}, 404

            # Get original filename from task metadata
            original_name = self._get_original_filename(task, file_path)

            return send_file(file_path, as_attachment=True, download_name=original_name)
        else:
            # Multiple TextGrid files - create ZIP
            return self._create_textgrid_zip(task, held_paths)

    def _download_complete(self, task):
        """Download complete task ZIP file"""
        if task.task_status != TaskStatus.COMPLETED:
            return {"status": "error", "message": "Task not completed yet"}, 400

        zip_path = task.download_path
        if not zip_path or not os.path.exists(zip_path):
            return {"status": "error", "message": "Download file not found"}, 404

        return send_file(
            zip_path, as_attachment=True, download_name=f"{task.task_id}.zip"
        )

    def _download_missing_dict(self, task):
        """Download missing pronunciation dictionary"""
        missing_dict_path = task.missingprondict
        if not missing_dict_path or not os.path.exists(missing_dict_path):
            return {
                "status": "error",
                "message": "Missing dictionary file not found",
            }, 404

        return send_file(
            missing_dict_path,
            as_attachment=True,
            download_name=f"missing_words_{task.task_id}.dict",
        )

    def _get_held_paths(self, task):
        """Extract held paths from task files using proper database relationship"""
        held_paths = []
        
        # Get HELD type files from TaskFile relationship
        for file in task.files:
            if file.file_type == FileType.HELD:
                held_paths.append(file.file_path)
        
        return held_paths

    def _get_original_filename(self, task, file_path):
        """Get original filename from task file names using proper database relationship"""
        # Extract file key from path
        file_key = os.path.splitext(os.path.basename(file_path))[0]
        
        # Look up original name in TaskFileName relationship
        for file_name in task.file_names:
            if file_name.file_key == file_key:
                return file_name.original_name
        
        # Fallback: check if the task file has original_filename
        for task_file in task.files:
            if task_file.file_path == file_path and task_file.original_filename:
                return task_file.original_filename
        
        # Final fallback
        return f"{file_key}.TextGrid"

    def _create_textgrid_zip(self, task, held_paths):
        """Create a temporary ZIP file with multiple TextGrid files"""
        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as temp_zip:
            temp_zip_path = temp_zip.name

            with ZipFile(temp_zip_path, "w") as zip_file:
                for i, path in enumerate(held_paths):
                    if not os.path.exists(path):
                        continue

                    original_name = self._get_original_filename(task, path)
                    if not original_name:
                        original_name = f"upload_{i}.TextGrid"

                    zip_file.write(path, arcname=original_name)

            return send_file(
                temp_zip_path,
                as_attachment=True,
                download_name=f"{task.task_id}_textgrids.zip",
            )


class TaskMissingWordsResource(Resource):
    """Get formatted missing words HTML for display in frontend"""

    def get(self, task_id):
        """Get formatted missing words for a task"""
        try:
            # Get user identification
            user_id = self._get_user_id()
            if not user_id:
                return {
                    "status": "error",
                    "message": "User identification required",
                }, 400

            # Get task
            task = Task.query.filter(
                Task.task_id == task_id, Task.user_id == user_id, Task.deleted.is_(None)
            ).first()

            if not task:
                return {"status": "error", "message": "Task not found"}, 404

            if not task.missing_words or int(task.missing_words) == 0:
                return {
                    "status": "success",
                    "data": {
                        "has_missing_words": False,
                        "html_content": None,
                        "missing_words_count": 0,
                    },
                }

            # Read and format missing words
            missing_dict_path = task.missingprondict
            if not missing_dict_path or not os.path.exists(missing_dict_path):
                return {
                    "status": "error",
                    "message": "Missing words file not found",
                }, 404

            with open(missing_dict_path, "r") as missing_dict:
                missing_words = missing_dict.readlines()

            # Format as HTML (you'll need to implement this function)
            html_content = missing_word_html(missing_words)

            return {
                "status": "success",
                "data": {
                    "has_missing_words": True,
                    "html_content": html_content,
                    "missing_words_count": len(missing_words),
                    "dict_path": os.path.relpath(missing_dict_path)
                    if missing_dict_path
                    else None,
                },
            }

        except Exception as e:
            current_app.logger.error(
                f"Error in TaskMissingWordsResource: {traceback.format_exc()}"
            )
            return {
                "status": "error",
                "message": "Failed to retrieve missing words",
            }, 500

    def _get_user_id(self):
        """Get user ID from JWT or query parameter"""
        try:
            verify_jwt_in_request(optional=True)
            current_user_id = int(get_jwt_identity())
            if current_user_id:
                return current_user_id
        except:
            pass

        return request.args.get("user_id")


class StaticDownloadResource(Resource):
    """Handle static file downloads like PDF user guides"""

    def get(self, file_type, filename):
        """
        Download static files

        Args:
            file_type: Type of static file ('guides', 'docs', etc.)
            filename: Name of the file to download
        """
        try:
            if file_type == "guides":
                return self._download_user_guide(filename)
            elif file_type == "profile":
                return self._user_image(filename)
            else:
                return {"status": "error", "message": "Invalid file type"}, 400

        except Exception as e:
            current_app.logger.error(
                f"Error in StaticDownloadResource: {traceback.format_exc()}"
            )
            return {"status": "error", "message": "Failed to download file"}, 500

    def _download_user_guide(self, filename):
        """Download user guide PDFs"""
        # Construct file path - adjust based on your static files structure
        static_path = os.path.join(
            os.getenv("ADMIN"), os.path.splitext(filename)[0], filename
        )
        logger.info(f"GUIDE PATH: {static_path}")

        if not os.path.exists(static_path):
            return {"status": "error", "message": "File not found"}, 404

        # Generate display name
        file_code = os.path.splitext(filename)[0]
        display_name = f"User guide {file_code}.pdf"

        return send_file(
            static_path,
            as_attachment=True,
            download_name=display_name,
            mimetype="application/pdf",
        )

    def _user_image(self, uuid):
        """Return user profile image"""

        image_path = os.path.join(os.getenv("UPLOADS"), uuid, "profile.png")
        if not os.path.exists(image_path):
            from app.models.user import User

            User.profile_image()

        return send_file(image_path, download_name=f"{uuid}.png", mimetype="image/png")
