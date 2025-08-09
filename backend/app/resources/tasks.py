from flask import request
from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.task import Task, TaskFile, TaskFileName
from app.models.user import User
from app.utils.logger import get_logger, log_exception

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

    @jwt_required()
    def get(self):
        """Get list of tasks with optional filtering"""
        try:
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)

            # Get query parameters
            status = request.args.get("status")
            user_id = request.args.get("user_id")
            language_id = request.args.get("language_id")
            engine_id = request.args.get("engine_id")
            limit = request.args.get("limit", type=int)

            query = Task.query

            # Non-admin users can only see their own tasks
            if not current_user.admin:
                query = query.filter_by(user_id=current_user_id)
            elif user_id:
                query = query.filter_by(user_id=user_id)

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

            schema = TaskSimpleSchema(many=True)
            return {"tasks": schema.dump(tasks), "count": len(tasks)}, 200

        except Exception as e:
            log_exception(logger, "Error retrieving tasks")
            return {"message": f"Error retrieving tasks: {str(e)}"}, 500

    @jwt_required()
    def post(self):
        """Create new task"""
        try:
            current_user_id = get_jwt_identity()

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
            current_user_id = get_jwt_identity()
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
            current_user_id = get_jwt_identity()
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
            current_user_id = get_jwt_identity()
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


class TaskStatusResource(Resource):
    """Handle task status updates"""

    @jwt_required()
    def put(self, task_id):
        """Update task status"""
        try:
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)

            task = Task.query.filter_by(task_id=task_id).first()
            if not task:
                return {"message": "Task not found"}, 404

            # Users can only update their own tasks or admin can update any
            if not current_user.admin and task.user_id != current_user_id:
                return {"message": "Permission denied"}, 403

            data = request.get_json()
            status = data.get("status")

            if not status:
                return {"message": "status is required"}, 400

            try:
                task_status = TaskStatus(status)
                task.task_status = task_status
                task.update()

                return {"message": f"Task status updated to {status}"}, 200

            except ValueError:
                return {"message": f"Invalid task status: {status}"}, 400

        except Exception as e:
            return {"message": f"Error updating task status: {str(e)}"}, 500


class TaskFilesResource(Resource):
    """Handle task files"""

    @jwt_required()
    def get(self, task_id):
        """Get files for a task"""
        try:
            current_user_id = get_jwt_identity()
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
            current_user_id = get_jwt_identity()
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
            current_user_id = get_jwt_identity()
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
            current_user_id = get_jwt_identity()
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


class TaskBulkDeleteResource(Resource):
    """Handle bulk deletion of tasks"""

    @jwt_required()
    def delete(self):
        """Delete multiple tasks"""
        try:
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)

            data = request.get_json()
            task_ids = data.get("task_ids", [])

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
                if not current_user.admin and task.user_id != current_user_id:
                    permission_denied.append(task.task_id)
                else:
                    try:
                        task.delete()
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
