import os
import traceback
from dotenv import load_dotenv
from flask_restful import Resource
from flask import current_app, request
from datetime import datetime, timedelta
from app.utils.datetime_helpers import utc_now
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.user import User
from app.models.language import Language
from app.utils.uploads import convert_size
from app.models.task import Task, TaskStatus
from app.utils.helpers import missing_word_html

load_dotenv()
UPLOADS = os.getenv("UPLOADS")


class AlignerDashboardResource(Resource):
    """
    Get aligner dashboard data including user tasks and queue information
    Replaces the legacy /aligner route
    """

    @jwt_required()
    def get(self):
        """
        Get aligner dashboard with user tasks, languages, and queue information
        """
        try:
            current_user_id = int(get_jwt_identity())
            if not current_user_id:
                return {"status": "error", "message": "Authentication required"}, 401

            # Get user and check verification status
            user = User.query.get(current_user_id)
            if not user:
                return {"status": "error", "message": "User not found"}, 404

            if not user.verified:
                return {
                    "status": "error",
                    "message": "Account verification required",
                    "requires_verification": True,
                }, 403

            # Get user tasks
            user_tasks = self._get_user_tasks(current_user_id)

            # Calculate queue information
            queue_info = self._calculate_queue_info()

            # Get languages
            languages_data = self._get_languages_data()

            # Get user preferences
            user_preferences = {
                "trans_default": user.trans_default,
                "dict_default": user.dict_default,
            }

            # Get app configuration
            app_config = {
                "size_limit": convert_size(
                    current_app.user_limits.get("size_limit", 750000) * 1000
                ),
                "user_dict_limit": current_app.user_limits.get(
                    "user_dict_limit", 50000
                ),
                "audio_extensions": current_app.audio_extensions,
            }

            return {
                "status": "success",
                "data": {
                    "user_tasks": user_tasks,
                    "queue_info": queue_info,
                    "languages": languages_data,
                    "user_preferences": user_preferences,
                    "app_config": app_config,
                },
            }

        except Exception as e:
            current_app.logger.error(
                f"Error in AlignerDashboardResource: {traceback.format_exc()}"
            )
            return {
                "status": "error",
                "message": "Failed to load aligner dashboard",
            }, 500

    def _get_user_tasks(self, user_id):
        """Get user's tasks with all necessary data for the dashboard"""
        tasks = (
            Task.query.filter(Task.user_id == user_id, Task.deleted == "")
            .order_by(Task.created_at.desc())
            .all()
        )

        processed_tasks = []

        for task in tasks:
            task_data = {
                "task_id": task.task_id,
                "task_status": task.task_status,
                "download_title": task.download_title or f"Task {task.task_id}",
                "download_date": task.download_date.isoformat()
                if task.download_date
                else None,
                "trans_choice": task.trans_choice,
                "lang": task.lang,
                "size": str(task.size or 0),
                "missing_words": str(task.missing_words or 0),
                "no_of_files": task.no_of_files or 0,
                "words": task.words or 0,
                "cost": float(task.cost or 0),
                "duration": task.duration or 0,
                "created_at": task.created_at.isoformat() if task.created_at else None,
                "updated_at": task.updated_at.isoformat() if task.updated_at else None,
                "aligned_at": task.aligned.isoformat() if task.aligned else None,
                "batch": task.trans_choice in ["exp-a", "comp-ling"]
                if task.trans_choice
                else False,
            }

            # Set download URLs
            if task.task_status in [TaskStatus.UPLOADING, TaskStatus.PRE_ERROR]:
                task_data["textgrid_url"] = None
                task_data["download_url"] = None
            else:
                task_data[
                    "textgrid_url"
                ] = f"/api/v1/tasks/{task.task_id}/download/textgrid"
                if task.task_status == TaskStatus.COMPLETED:
                    task_data[
                        "download_url"
                    ] = f"/api/v1/tasks/{task.task_id}/download/complete"
                else:
                    task_data["download_url"] = None

            # Handle missing words
            if task.missing_words and int(task.missing_words) > 0:
                task_data["has_missing_words"] = True
                task_data[
                    "missing_dict_url"
                ] = f"/api/v1/tasks/{task.task_id}/download/missing_dict"

                # Format missing words as HTML
                try:
                    if task.missingprondict and os.path.exists(task.missingprondict):
                        with open(task.missingprondict, "r") as missing_dict:
                            missing_words = missing_dict.readlines()
                        task_data["missing_dict_html"] = missing_word_html(
                            missing_words
                        )
                        task_data["missing_dict_path"] = os.path.relpath(
                            task.missingprondict
                        )
                except Exception as e:
                    current_app.logger.warning(
                        f"Error reading missing words for task {task.task_id}: {e}"
                    )
                    task_data["missing_dict_html"] = None
            else:
                task_data["has_missing_words"] = False
                task_data["missing_dict_url"] = None

            processed_tasks.append(task_data)

        # Calculate time remaining for running tasks
        self._calculate_task_timing(processed_tasks)

        return processed_tasks

    def _calculate_task_timing(self, user_tasks):
        """Calculate seconds_left for running tasks across the entire app"""
        # Get all aligned tasks (currently running) across all users
        aligned_tasks = (
            Task.query.filter(
                Task.task_status == TaskStatus.ALIGNED, Task.deleted == ""
            )
            .order_by(Task.updated_at)
            .all()
        )

        total_duration = 0
        first_task = True

        for aligned_task in aligned_tasks:
            if aligned_task.aligned:  # Currently being aligned
                time_spent = utc_now() - aligned_task.aligned
                current_app.logger.info(
                    f"Time spent aligning {aligned_task.download_title}: "
                    f"{time_spent.total_seconds()} secs, from total: {aligned_task.duration}"
                )
                seconds_left = max(
                    (
                        timedelta(seconds=aligned_task.duration or 0) - time_spent
                    ).total_seconds(),
                    0,
                )
            else:
                seconds_left = aligned_task.duration or 0

            # Update corresponding task in user_tasks
            for idx, user_task in enumerate(user_tasks):
                if user_task["task_id"] == aligned_task.task_id:
                    user_tasks[idx]["first"] = first_task
                    user_tasks[idx]["seconds_left"] = seconds_left + total_duration
                    first_task = False
                    break

            total_duration += seconds_left

        # Also calculate for upload queue (if you have an uploads table)
        # This would be similar logic for tasks in the upload queue

    def _calculate_queue_info(self):
        """Calculate queue information for the dashboard"""
        # Count tasks in different states
        uploaded_count = Task.query.filter(
            Task.task_status == TaskStatus.UPLOADED, Task.deleted == ""
        ).count()

        aligned_count = Task.query.filter(
            Task.task_status == TaskStatus.ALIGNED, Task.deleted == ""
        ).count()

        completed_today = Task.query.filter(
            Task.task_status == TaskStatus.COMPLETED,
            Task.updated_at
            >= utc_now().replace(hour=0, minute=0, second=0, microsecond=0),
            Task.deleted == "",
        ).count()

        return {
            "uploaded_tasks": uploaded_count,
            "aligned_tasks": aligned_count,
            "completed_today": completed_today,
            "total_queue": uploaded_count + aligned_count,
        }

    def _get_languages_data(self):
        """Get languages data formatted for the frontend"""
        languages = (
            Language.query.filter_by(is_active=True).order_by(Language.priority).all()
        )

        langs = []
        lang_groups = {}

        for language in languages:
            lang_data = {
                "code": language.code,
                "lang": language.display_name,
                "language": language.language_name,
            }
            langs.append(lang_data)

            # Group by language family/type
            if language.language_name not in lang_groups:
                lang_groups[language.language_name] = [language.code]
            else:
                lang_groups[language.language_name].append(language.code)

        return {"languages": langs, "language_groups": lang_groups}


class AlignTaskResource(Resource):
    """
    Start alignment process for a task
    Replaces the legacy /align-task route
    """

    def post(self):
        """
        Start alignment process for a specific task

        JSON body:
            - task_id: ID of the task to align
        """
        try:
            json_data = request.get_json()
            if not json_data or "task_id" not in json_data:
                return {"status": "error", "message": "task_id is required"}, 400

            task_id = json_data["task_id"]

            # Get task from database
            task = Task.query.filter_by(task_id=task_id).first()
            if not task:
                return {"status": "error", "message": "Task not found"}, 404

            # Check if task files still exist
            task_path = (
                os.path.join(UPLOADS, task.task_path) if task.task_path else None
            )

            if not task_path or not os.path.exists(task_path):
                # Mark task as expired
                task.task_status = TaskStatus.EXPIRED
                task.updated_at = utc_now()
                db.session.commit()

                current_app.logger.warning(
                    f"Task {task_id} marked as expired - files not found at {task_path}"
                )

                return {
                    "status": "error",
                    "message": "Task files have expired and need to be re-uploaded",
                    "task_status": TaskStatus.EXPIRED.value,
                }

            # Calculate estimated duration based on task properties
            duration = self._calculate_duration(task)

            # Update task status to aligned and set duration
            task.task_status = TaskStatus.ALIGNED
            task.duration = duration
            task.updated_at = utc_now()
            # Note: aligned field will be set by the background alignment process when it picks up the task

            db.session.commit()

            current_app.logger.info(
                f"Task {task_id} queued for alignment with estimated duration {duration} seconds"
            )

            return {
                "status": "success",
                "message": "Task queued for alignment",
                "data": {
                    "task_id": task_id,
                    "task_status": TaskStatus.ALIGNED.value,
                    "estimated_duration": duration,
                    "queued_at": utc_now().isoformat(),
                },
            }

        except Exception as e:
            current_app.logger.error(
                f"Error in AlignTaskResource: {traceback.format_exc()}"
            )
            return {
                "status": "error",
                "message": "Failed to start alignment process",
            }, 500

    def _calculate_duration(self, task):
        """Calculate estimated alignment duration based on task properties"""
        # Get held_paths count using proper database relationship
        from app.models.task import FileType

        held_paths_count = 0
        for file in task.files:
            if file.file_type == FileType.HELD:
                held_paths_count += 1

        # Default to 1 if no held files found
        if held_paths_count == 0:
            held_paths_count = 1

        # Calculate duration based on logic from the original route
        if held_paths_count > 1:
            # Batch upload - more complex alignment
            duration = max(int(task.size or 0) * 100, 60)
        else:
            # Single file alignment
            duration = max(int(task.size or 0) * 10, 20)

        return duration


# TaskExpirationResource removed - unused route


class AlignmentQueueResource(Resource):
    """
    Get information about the alignment queue status
    """

    def get(self):
        """
        Get current alignment queue status for monitoring
        """
        try:
            # Get queue statistics
            queue_stats = {
                "uploaded_tasks": Task.query.filter(
                    Task.task_status == TaskStatus.UPLOADED, Task.deleted == ""
                ).count(),
                "aligned_tasks": Task.query.filter(
                    Task.task_status == TaskStatus.ALIGNED, Task.deleted == ""
                ).count(),
                "completed_today": Task.query.filter(
                    Task.task_status == TaskStatus.COMPLETED,
                    Task.updated_at
                    >= utc_now().replace(hour=0, minute=0, second=0, microsecond=0),
                    Task.deleted == "",
                ).count(),
                "expired_today": Task.query.filter(
                    Task.task_status == TaskStatus.EXPIRED,
                    Task.updated_at
                    >= utc_now().replace(hour=0, minute=0, second=0, microsecond=0),
                    Task.deleted == "",
                ).count(),
            }

            # Get currently processing task info
            current_task = (
                Task.query.filter(
                    Task.task_status == TaskStatus.ALIGNED,
                    Task.aligned.isnot(None),
                    Task.deleted == "",
                )
                .order_by(Task.aligned)
                .first()
            )

            current_task_info = None
            if current_task:
                time_elapsed = (utc_now() - current_task.aligned).total_seconds()
                time_remaining = max(0, (current_task.duration or 0) - time_elapsed)

                current_task_info = {
                    "task_id": current_task.task_id,
                    "download_title": current_task.download_title,
                    "time_elapsed": time_elapsed,
                    "time_remaining": time_remaining,
                    "progress_percentage": min(
                        100, (time_elapsed / (current_task.duration or 1)) * 100
                    ),
                }

            return {
                "status": "success",
                "data": {
                    "queue_stats": queue_stats,
                    "current_task": current_task_info,
                    "timestamp": utc_now().isoformat(),
                },
            }

        except Exception as e:
            current_app.logger.error(
                f"Error in AlignmentQueueResource: {traceback.format_exc()}"
            )
            return {
                "status": "error",
                "message": "Failed to get queue information",
            }, 500
