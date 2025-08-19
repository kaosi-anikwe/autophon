import os
from flask import request
from datetime import datetime
from flask_restful import Resource
from sqlalchemy import func, extract
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request

from app.extensions import db
from app.models.user import User
from app.models.language import Language
from app.utils.datetime_helpers import utc_now
from app.utils.logger import get_logger, log_exception
from app.models.task import Task, TaskFile, TaskFileName

logger = get_logger(__name__)
from app.schemas import (
    TaskSchema,
    TaskCreateSchema,
    TaskUpdateSchema,
    TaskSimpleSchema,
    TaskFileSchema,
    TaskFileNameSchema,
    TaskFileCreateSchema,
    TaskFileNameCreateSchema,
    TaskStatus,
)


class TaskListResource(Resource):
    """Handle operations on task collection"""

    def get(self):
        """Get list of tasks with optional filtering"""
        try:
            current_user = None
            user_uuid = None
            try:
                # Try to verify JWT token without requiring it
                verify_jwt_in_request(optional=True)
                current_user_id = int(get_jwt_identity())
                current_user = User.query.get(current_user_id)

            except Exception as e:
                # No valid JWT, proceed as anonymous
                pass

            if not current_user:
                user_uuid = request.cookies.get("user_id")

            if not current_user and not user_uuid:
                return {
                    "success": False,
                    "message": "Auth required via cookies: JWT or user_uuid.",
                }, 400

            # Get query parameters
            status = request.args.get("status")
            language_id = request.args.get("language_id")
            engine_id = request.args.get("engine_id")
            limit = request.args.get("limit", type=int)

            query = Task.query

            # Non-admin users can only see their own tasks
            if current_user and not current_user.admin:
                query = query.filter_by(user_id=current_user_id, deleted=None)
            elif user_uuid:  # Anonymous users
                query = query.filter_by(user_uuid=user_uuid, deleted=None)
            elif current_user:
                query = query.filter_by(user_id=current_user.id, deleted=None)

            # Apply filters
            if status:
                try:
                    task_status = TaskStatus(status)
                    query = query.filter_by(task_status=task_status)
                except ValueError:
                    return {"message": f"Invalid task status: {status}"}, 400

            if language_id:
                query = query.filter_by(lang_id=language_id)

            if engine_id:
                query = query.filter_by(engine_id=engine_id)

            # Order by creation date (newest first)
            query = query.order_by(Task.created_at.desc())

            # Apply limit
            if limit:
                query = query.limit(limit)

            tasks = query.all()

            schema = TaskSchema(many=True)
            task_data = schema.dump(tasks)
            
            # Add cite information for anonymous users
            if user_uuid and not current_user:
                admin_path = os.getenv("ADMIN")
                if admin_path:
                    for task in task_data:
                        # Extract language code from the task's lang field
                        lang_code = task.get("lang", "").replace("(suggested)", "").strip()
                        if lang_code:
                            cite_file_path = os.path.join(admin_path, lang_code, f"{lang_code}_cite.txt")
                            try:
                                if os.path.exists(cite_file_path):
                                    with open(cite_file_path, "r", encoding="utf-8") as f:
                                        # Splice lines [4:] and join with newlines
                                        task["cite"] = "\n".join(
                        [line for line in f.readlines()[4:] if line != "\n"]
                    )

                                else:
                                    task["cite"] = ""
                            except (IOError, UnicodeDecodeError) as e:
                                logger.warning(f"Failed to read cite file for {lang_code}: {e}")
                                task["cite"] = ""
                        else:
                            task["cite"] = ""

            return {"tasks": task_data, "count": len(task_data)}, 200

        except Exception as e:
            log_exception(logger, "Error retrieving tasks")
            return {"message": f"Error retrieving tasks: {str(e)}"}, 500

    @jwt_required()
    def post(self):
        """Create new task"""
        try:
            current_user_id = int(get_jwt_identity())

            schema = TaskCreateSchema()
            data = schema.load(request.get_json())

            # Set user_id to current user if not provided or user is not admin
            current_user = User.query.get(current_user_id)
            if not current_user.admin or "user_id" not in data:
                data["user_id"] = current_user_id

            # Check if task_id already exists
            if Task.query.filter_by(task_id=data["task_id"]).first():
                return {"message": "Task with this ID already exists"}, 409

            # Create task
            task = Task(**data)
            task.insert()

            response_schema = TaskSchema()
            return {
                "message": "Task created successfully",
                "task": response_schema.dump(task),
            }, 201

        except ValidationError as e:
            return {"message": "Validation error", "errors": e.messages}, 400
        except IntegrityError:
            db.session.rollback()
            return {"message": "Task with this ID already exists"}, 409
        except Exception as e:
            log_exception(logger, "Error creating task")
            return {"message": f"Error creating task: {str(e)}"}, 500


class TaskResource(Resource):
    """Handle operations on individual tasks"""

    @jwt_required()
    def get(self, task_id):
        """Get task by ID"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            task = Task.query.filter_by(task_id=task_id).first()
            if not task:
                return {"message": "Task not found"}, 404

            # Users can only view their own tasks or admin can view any
            if not current_user.admin and task.user_id != current_user_id:
                return {"message": "Permission denied"}, 403

            schema = TaskSchema()
            return {"task": schema.dump(task)}, 200

        except Exception as e:
            return {"message": f"Error retrieving task: {str(e)}"}, 500

    @jwt_required()
    def put(self, task_id):
        """Update task"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            task = Task.query.filter_by(task_id=task_id).first()
            if not task:
                return {"message": "Task not found"}, 404

            # Users can only update their own tasks or admin can update any
            if not current_user.admin and task.user_id != current_user_id:
                return {"message": "Permission denied"}, 403

            schema = TaskUpdateSchema()
            data = schema.load(request.get_json())

            # Update task fields
            for key, value in data.items():
                setattr(task, key, value)

            task.update()

            response_schema = TaskSchema()
            return {
                "message": "Task updated successfully",
                "task": response_schema.dump(task),
            }, 200

        except ValidationError as e:
            return {"message": "Validation error", "errors": e.messages}, 400
        except Exception as e:
            return {"message": f"Error updating task: {str(e)}"}, 500

    @jwt_required()
    def delete(self, task_id):
        """Delete task"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            task = Task.query.filter_by(task_id=task_id).first()
            if not task:
                return {"message": "Task not found"}, 404

            # Users can only delete their own tasks or admin can delete any
            if not current_user.admin and task.user_id != current_user_id:
                return {"message": "Permission denied"}, 403

            task.delete()

            return {"message": "Task deleted successfully"}, 200

        except Exception as e:
            return {"message": f"Error deleting task: {str(e)}"}, 500


# TaskStatusResource removed - unused (functionality replaced by UploadStatusResource)


class TaskFilesResource(Resource):
    """Handle task files"""

    @jwt_required()
    def get(self, task_id):
        """Get files for a task"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            task = Task.query.filter_by(task_id=task_id).first()
            if not task:
                return {"message": "Task not found"}, 404

            # Users can only view their own task files or admin can view any
            if not current_user.admin and task.user_id != current_user_id:
                return {"message": "Permission denied"}, 403

            schema = TaskFileSchema(many=True)
            return {"files": schema.dump(task.files), "count": len(task.files)}, 200

        except Exception as e:
            return {"message": f"Error retrieving task files: {str(e)}"}, 500

    @jwt_required()
    def post(self, task_id):
        """Add file to task"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            task = Task.query.filter_by(task_id=task_id).first()
            if not task:
                return {"message": "Task not found"}, 404

            # Users can only add files to their own tasks or admin can add to any
            if not current_user.admin and task.user_id != current_user_id:
                return {"message": "Permission denied"}, 403

            schema = TaskFileCreateSchema()
            data = schema.load(request.get_json())
            data["task_id"] = task.id  # Use internal task ID

            # Create task file
            task_file = TaskFile(**data)
            task_file.insert()

            response_schema = TaskFileSchema()
            return {
                "message": "File added to task successfully",
                "file": response_schema.dump(task_file),
            }, 201

        except ValidationError as e:
            return {"message": "Validation error", "errors": e.messages}, 400
        except Exception as e:
            return {"message": f"Error adding file to task: {str(e)}"}, 500


class TaskFileNamesResource(Resource):
    """Handle task file names"""

    @jwt_required()
    def get(self, task_id):
        """Get file names for a task"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            task = Task.query.filter_by(task_id=task_id).first()
            if not task:
                return {"message": "Task not found"}, 404

            # Users can only view their own task file names or admin can view any
            if not current_user.admin and task.user_id != current_user_id:
                return {"message": "Permission denied"}, 403

            schema = TaskFileNameSchema(many=True)
            return {
                "file_names": schema.dump(task.file_names),
                "count": len(task.file_names),
            }, 200

        except Exception as e:
            return {"message": f"Error retrieving task file names: {str(e)}"}, 500

    @jwt_required()
    def post(self, task_id):
        """Add file name to task"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            task = Task.query.filter_by(task_id=task_id).first()
            if not task:
                return {"message": "Task not found"}, 404

            # Users can only add file names to their own tasks or admin can add to any
            if not current_user.admin and task.user_id != current_user_id:
                return {"message": "Permission denied"}, 403

            schema = TaskFileNameCreateSchema()
            data = schema.load(request.get_json())
            data["task_id"] = task.id  # Use internal task ID

            # Create task file name
            task_file_name = TaskFileName(**data)
            task_file_name.insert()

            response_schema = TaskFileNameSchema()
            return {
                "message": "File name added to task successfully",
                "file_name": response_schema.dump(task_file_name),
            }, 201

        except ValidationError as e:
            return {"message": "Validation error", "errors": e.messages}, 400
        except IntegrityError:
            db.session.rollback()
            return {"message": "File key already exists for this task"}, 409
        except Exception as e:
            return {"message": f"Error adding file name to task: {str(e)}"}, 500


class TaskCancelResource(Resource):
    """Handle task cancellation"""

    @jwt_required()
    def put(self, task_id):
        """Cancel a task"""
        try:
            import os

            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            task = Task.query.filter_by(task_id=task_id).first()
            if not task:
                return {"message": "Task not found"}, 404

            # Users can only cancel their own tasks or admin can cancel any
            if not current_user.admin and task.user_id != current_user_id:
                return {"message": "Permission denied"}, 403

            if task.pid:
                # Task is currently being processed - kill the process
                try:
                    logger.info(f"Stopping align process with PID: {task.pid}")
                    os.kill(task.pid, 15)  # send SIGTERM
                except (ProcessLookupError, OSError) as e:
                    # Process might already be dead
                    logger.warning(f"Could not kill process {task.pid}: {e}")
            
            # Reset task to uploaded status for realignment at a later time
            task.aligned = None
            task.task_status = TaskStatus.UPLOADED
            task.cancelled = False
            task.pid = None  # Clear PID as process is no longer running

            task.update()

            schema = TaskSchema()
            return {
                "message": "Task cancelled successfully",
                "task": schema.dump(task),
            }, 200

        except Exception as e:
            log_exception(logger, "Error cancelling task")
            return {"message": f"Error cancelling task: {str(e)}"}, 500


class TaskBulkDeleteResource(Resource):
    """Handle bulk deletion of tasks"""

    def post(self):
        """Delete multiple tasks"""
        try:
            current_user = None
            user_uuid = None
            try:
                # Try to verify JWT token without requiring it
                verify_jwt_in_request(optional=True)
                current_user_id = int(get_jwt_identity())
                current_user = User.query.get(current_user_id)
                user_uuid = current_user.uuid
            except Exception as e:
                # No valid JWT, proceed as anonymous
                pass

            if not current_user:
                user_uuid = request.cookies.get("user_id")

            data = request.get_json()
            task_ids = data.get("task_ids", [])

            if not current_user and not user_uuid:
                return {"message": "Auth required via cookies: JWT or user_uuid."}

            if not task_ids:
                return {"message": "task_ids list is required"}, 400

            if not isinstance(task_ids, list):
                return {"message": "task_ids must be a list"}, 400

            if len(task_ids) > 100:  # Limit bulk operations
                return {"message": "Cannot delete more than 100 tasks at once"}, 400

            # Get all tasks to be deleted
            tasks = Task.query.filter(Task.task_id.in_(task_ids)).all()

            if not tasks:
                return {"message": "No tasks found with provided IDs"}, 404

            # Check permissions for each task
            deleted_tasks = []
            permission_denied = []
            not_found = []

            # Create a set of found task IDs for quick lookup
            found_task_ids = {task.task_id for task in tasks}

            # Check for tasks that weren't found
            for task_id in task_ids:
                if task_id not in found_task_ids:
                    not_found.append(task_id)

            # Process each task
            for task in tasks:
                # Check if user has permission to delete this task
                if current_user:
                    if not current_user.admin and task.user_uuid != user_uuid:
                        permission_denied.append(task.task_id)
                elif task.user_uuid != user_uuid:
                    permission_denied.append(task.task_id)
                else:
                    try:
                        task.deleted = utc_now()
                        task.update()
                        deleted_tasks.append(task.task_id)
                    except Exception as e:
                        # If individual deletion fails, continue with others
                        print(f"Failed to delete task {task.task_id}: {str(e)}")

            # Prepare response
            response = {
                "message": f"Bulk delete completed",
                "deleted": deleted_tasks,
                "deleted_count": len(deleted_tasks),
            }

            if permission_denied:
                response["permission_denied"] = permission_denied
                response["permission_denied_count"] = len(permission_denied)

            if not_found:
                response["not_found"] = not_found
                response["not_found_count"] = len(not_found)

            # Determine appropriate status code
            if deleted_tasks and not permission_denied and not not_found:
                status_code = 200  # All tasks deleted successfully
            elif deleted_tasks:
                status_code = 207  # Partial success (multi-status)
            else:
                status_code = 400  # No tasks were deleted

            return response, status_code

        except Exception as e:
            log_exception(logger, "Error during bulk delete")
            return {"message": f"Error during bulk delete: {str(e)}"}, 500


class TaskHistoryResource(Resource):
    """Handle user task history with filtering and aggregation"""

    @jwt_required()
    def get(self):
        """Get user's task history with optional date filtering"""
        try:
            current_user_id = int(get_jwt_identity())

            # Get query parameters
            year = request.args.get("year", type=int)
            month = request.args.get("month")

            if not year or not month:
                return {"message": "Year and month parameters are required"}, 400

            try:
                # Parse month and year into date filter
                filter_date = datetime.strptime(f"{month}, {year}", "%b, %Y")
                year_num = filter_date.year
                month_num = filter_date.month
            except ValueError:
                return {
                    "message": "Invalid month format. Use format like 'Jan, 2024'"
                }, 400

            # Query tasks for the specified month/year using SQLAlchemy
            query = Task.query.filter_by(user_id=current_user_id)

            # Filter by month/year using SQL date functions for better performance
            query = query.filter(
                extract("year", Task.created_at) == year_num,
                extract("month", Task.created_at) == month_num,
            )

            # Order by creation date (newest first)
            tasks = query.order_by(Task.created_at.desc()).all()

            # Calculate aggregated statistics using SQL for better performance
            totals_query = query.with_entities(
                func.count(Task.id).label("task_count"),
                func.sum(Task.no_of_files).label("file_count"),
                func.sum(Task.size).label("total_size"),
                func.sum(Task.words).label("total_words"),
            ).first()

            # Language count aggregation
            lang_counts = (
                db.session.query(
                    Language.display_name, func.count(Task.id).label("count")
                )
                .join(Task, Task.lang_id == Language.id)
                .filter(
                    Task.user_id == current_user_id,
                    extract("year", Task.created_at) == year_num,
                    extract("month", Task.created_at) == month_num,
                )
                .group_by(Language.display_name)
                .all()
            )

            # Format results
            schema = TaskSchema(many=True)
            task_data = schema.dump(tasks)

            # Calculate totals
            totals = {
                "task_count": totals_query.task_count or 0,
                "file_count": int(totals_query.file_count or 0),
                "total_size": float(totals_query.total_size or 0),
                "total_words": totals_query.total_words or 0,
                "language_counts": {
                    lang_name: count for lang_name, count in lang_counts
                },
            }

            return {
                "success": True,
                "results": task_data,
                "totals": totals,
                "period": f"{month} {year}",
                "count": len(tasks),
            }, 200

        except Exception as e:
            log_exception(logger, "Error retrieving task history")
            return {"message": f"Error retrieving task history: {str(e)}"}, 500


class TaskMonthlyReportResource(Resource):
    """Handle monthly PDF report generation for users"""

    @jwt_required()
    def get(self):
        """Generate and download monthly usage report as PDF"""
        try:
            from flask import send_file
            from app.utils.helpers import get_monthly_download
            from app.utils.uploads import convert_size
            import os

            current_user_id = int(get_jwt_identity())

            # Get query parameters
            year = request.args.get("year")
            month = request.args.get("month")

            if not year or not month:
                return {"message": "Year and month parameters are required"}, 400

            try:
                # Parse month and year into date filter
                filter_date = datetime.strptime(f"{month}, {year}", "%b, %Y")
                filter_date_str = filter_date.strftime("%Y/%m")
            except ValueError:
                return {
                    "message": "Invalid month format. Use format like 'Jan, 2024'"
                }, 400

            # Query tasks for the specified month/year with download_date filter
            query = Task.query.filter_by(user_id=current_user_id)

            # Filter by download_date containing the year/month pattern
            query = query.filter(Task.download_date.contains(filter_date_str))

            # Order by creation date (newest first)
            tasks = query.order_by(Task.created_at.desc()).all()

            if not tasks:
                return {"message": f"No tasks found for {month} {year}"}, 404

            # Format task data for the PDF generator
            task_list = []
            file_count = 0
            total_size = 0
            total_words = 0
            lang_count = {}

            for task in tasks:
                # Map language code to display name
                lang_display = (
                    task.language.display_name
                    if task.language
                    else task.lang or "Unknown"
                )
                lang_display = lang_display.replace("(suggested)", "").strip()

                task_data = {
                    "download_date": task.download_date
                    or task.created_at.strftime("%Y/%m/%d"),
                    "no_of_files": task.no_of_files or 0,
                    "size": convert_size(int(task.size or 0)),
                    "lang": lang_display,
                    "words": task.words or 0,
                    "task_status": task.task_status.value
                    if task.task_status
                    else "unknown",
                }
                task_list.append(task_data)

                # Aggregate totals
                file_count += int(task.no_of_files or 0)
                total_size += float(task.size or 0)
                total_words += int(task.words or 0)

                # Count languages
                if lang_display:
                    lang_count[lang_display] = lang_count.get(lang_display, 0) + 1

            # Prepare totals for PDF generation
            totals = {
                "file_count": file_count,
                "total_size": convert_size(int(total_size)),
                "total_words": total_words,
                "lang_count": lang_count,
            }

            # Generate PDF using the helper function
            output_filename = get_monthly_download(
                user_id=User.query.get(current_user_id).uuid,
                date=f"{month} {year}",
                task_list=task_list,
                totals=totals,
            )

            # Clean up xlsx file and return PDF
            try:
                os.remove(f"{output_filename}.xlsx")
            except FileNotFoundError:
                pass  # xlsx file might already be deleted

            pdf_path = f"{output_filename}.pdf"
            if not os.path.exists(pdf_path):
                return {"message": "Failed to generate PDF report"}, 500

            return send_file(
                pdf_path,
                as_attachment=True,
                download_name=f"Autophon_{month}_{year}.pdf",
            )

        except Exception as e:
            log_exception(logger, "Error generating monthly report")
            return {"message": f"Error generating monthly report: {str(e)}"}, 500
