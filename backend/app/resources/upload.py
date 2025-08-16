import os
import uuid
import shutil
from datetime import datetime
from app.utils.datetime_helpers import utc_now
from flask_restful import Resource
from flask import request, session, current_app, make_response
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.models.user import User
from app.schemas.task import TaskSchema
from app.utils.logger import get_logger, log_exception
from app.models.task import Task, TaskStatus, TaskFile, FileType
from app.utils.uploads import (
    isAudioFile,
    transcription_mode,
    extract_upload_zip,
)

logger = get_logger(__name__)

UPLOADS = os.getenv("UPLOADS")


class FileUploadResource(Resource):
    """Handle file uploads for forced alignment processing"""

    def post(self):
        """Upload files for forced alignment"""
        try:
            # Check if files are provided
            if "files[]" not in request.files:
                return {"success": False, "message": "No files provided"}, 400

            upload_files = request.files.getlist("files[]")
            trans_choice = request.form.get("trans_choice")

            if not trans_choice:
                return {
                    "success": False,
                    "message": "Transcription choice is required",
                }, 400

            # Validate transcription choice
            valid_choices = ["var-ling", "comp-ling", "exp-b", "exp-a"]
            if trans_choice not in valid_choices:
                return {
                    "success": False,
                    "message": f"Invalid transcription choice. Must be one of: {valid_choices}",
                }, 400

            # Determine user authentication status
            anonymous = True
            user_id = None
            current_user_obj = None
            user_uuid = None

            try:
                # Try to verify JWT token without requiring it
                verify_jwt_in_request(optional=True)
                jwt_user_id = int(get_jwt_identity())
                if jwt_user_id:
                    current_user_obj = User.query.get(jwt_user_id)
                    if current_user_obj:
                        user_id = jwt_user_id
                        anonymous = False
                        logger.info(f"Authenticated user: {current_user_obj.email}")
            except Exception as e:
                # No valid JWT token, proceed as anonymous
                pass

            # Handle anonymous users
            if anonymous:
                current_day = utc_now().strftime("%y%m%d")
                user_uuid = request.cookies.get("user_id")

                if user_uuid:
                    # Initialize session if needed
                    if not session.get(user_uuid):
                        session[user_uuid] = {"uploads": {current_day: 0}}

                    if not session[user_uuid]["uploads"].get(current_day):
                        session[user_uuid]["uploads"][current_day] = 0

                    # Check daily limit for anonymous users (10 tasks per day)
                    daily_limit = current_app.user_limits.get("a_upload_limit", 10)
                    if session[user_uuid]["uploads"][current_day] >= int(daily_limit):
                        return {
                            "success": False,
                            "message": "You have reached your daily limit. Sign up to increase limits.",
                        }, 429
                else:
                    # Generate new anonymous user ID
                    user_uuid = uuid.uuid4().hex[:6]
                    session[user_uuid] = {"uploads": {current_day: 0}}

                logger.info(f"Anonymous user UUID: {user_uuid}")
            else:
                # Update authenticated user's default transcription choice if not anonymous
                # Note: assuming there's a trans_default field - check if it exists
                try:
                    if hasattr(current_user_obj, "trans_default"):
                        current_user_obj.trans_default = trans_choice
                        current_user_obj.update()
                except Exception as e:
                    logger.warning(f"Could not update user trans_default: {e}")

            logger.info(
                f"User ID: {user_id if not anonymous else user_uuid}, Anonymous: {anonymous}"
            )

            # Extract and process files
            try:
                files = []
                logger.info(f"Processing {len(upload_files)} uploaded files")

                for upload_file in upload_files:
                    filename = upload_file.filename.split("/")[-1]
                    if filename.endswith(".zip"):
                        # Extract ZIP files based on transcription type
                        extracted = extract_upload_zip(
                            upload_file,
                            maintain_structure=(trans_choice in ["exp-a", "comp-ling"]),
                        )
                        files.extend(extracted)
                    else:
                        files.append(upload_file)

                logger.info(f"Total files after extraction: {len(files)}")

                # Save files to temporary folder
                working_user_id = (
                    user_uuid if anonymous else User.query.get(user_id).uuid
                )
                temp_path = os.path.join(UPLOADS, working_user_id, "temp")

                if os.path.exists(temp_path):
                    shutil.rmtree(temp_path)
                os.makedirs(temp_path, exist_ok=True)

                user_files = []
                for user_file in files:
                    file_path = os.path.join(temp_path, user_file.filename)
                    os.makedirs(os.path.dirname(file_path), exist_ok=True)
                    user_file.stream.seek(0)
                    user_file.save(file_path)
                    user_files.append(file_path)

                # Process files based on transcription mode
                processed_files, log_file, final_temp = transcription_mode(
                    user_files,
                    trans_choice,
                    original_dir=temp_path,
                    user_id=working_user_id,
                )

                # Group files by name (same basename, different extensions) - optimized
                file_groups_dict = {}
                for file_path in processed_files:
                    base_name = os.path.splitext(file_path)[0]
                    if base_name not in file_groups_dict:
                        file_groups_dict[base_name] = []
                    file_groups_dict[base_name].append(file_path)

                grouped_files = list(file_groups_dict.values())

                logger.info(f"Created {len(grouped_files)} file groups")

                # Create tasks based on transcription type
                created_tasks = []
                trans_modes = {
                    "var-ling": "Var Ling",
                    "comp-ling": "Comp Ling",
                    "exp-b": "Exp Ling B",
                    "exp-a": "Exp Ling A",
                }

                current_time = utc_now()
                download_date = current_time.strftime("%Y/%m/%d - %H:%M:%S")

                # Helper function to create task files
                def create_task_files(task, file_groups, key_prefix="file"):
                    """Create TaskFile records for a given task"""
                    for i, group in enumerate(
                        file_groups
                        if isinstance(file_groups[0], list)
                        else [file_groups]
                    ):
                        for j, file_path in enumerate(group):
                            file_type = (
                                FileType.AUDIO
                                if isAudioFile(file_path)
                                else FileType.TEXTGRID
                            )
                            task_file = TaskFile(
                                task_id=task.id,
                                file_type=file_type,
                                file_path=file_path,
                                original_filename=os.path.basename(file_path),
                            )
                            task_file.insert()

                # Apply anonymous user limits before task creation
                if anonymous:
                    current_tasks = session[user_uuid]["uploads"][current_day]
                    daily_limit = current_app.user_limits.get("a_upload_limit", 10)

                    if trans_choice in ["exp-a", "comp-ling"]:
                        # Batch mode: count as 1 task
                        if current_tasks >= int(daily_limit):
                            return {
                                "success": False,
                                "message": "You have reached your daily limit. Sign up to increase limits.",
                            }, 429
                    else:
                        # Individual mode: limit by remaining tasks
                        max_new_tasks = max(int(daily_limit) - current_tasks, 0)
                        grouped_files = grouped_files[:max_new_tasks]
                        if not grouped_files:
                            return {
                                "success": False,
                                "message": "You have reached your daily limit. Sign up to increase limits.",
                            }, 429

                if trans_choice in ["exp-a", "comp-ling"]:
                    # Create single batch task
                    task_id = current_time.strftime("%Y-%m-%d_%H.%M.%S.%f")
                    task_path = os.path.join(working_user_id, "upl", task_id)
                    download_title = f"{trans_modes[trans_choice]} Batch {current_time.strftime('%y%m%d %H:%M')}"
                    duration = len(grouped_files) * 2

                    task = Task(
                        task_id=task_id,
                        user_id=user_id if not anonymous else None,
                        user_uuid=working_user_id,
                        anonymous=anonymous,
                        task_path=task_path,
                        final_temp=final_temp,
                        trans_choice=trans_choice,
                        log_path=log_file,
                        download_title=download_title,
                        download_date=download_date,
                        task_status=TaskStatus.UPLOADING,
                        duration=duration,
                        no_of_files=len(grouped_files),
                    )
                    task.insert()

                    # Convet log path to relpath
                    task.log_path = os.path.relpath(log_file)

                    created_tasks.append(task)

                    # Store file information
                    create_task_files(task, grouped_files, "group")

                    if anonymous:
                        session[user_uuid]["uploads"][current_day] += 1

                else:
                    # Create individual tasks for each file group
                    for group in grouped_files:
                        task_id = utc_now().strftime("%Y-%m-%d_%H.%M.%S.%f")
                        task_path = os.path.join(working_user_id, "upl", task_id)
                        download_title = os.path.splitext(os.path.basename(group[0]))[0]

                        task = Task(
                            task_id=task_id,
                            user_id=user_id if not anonymous else None,
                            user_uuid=working_user_id,
                            anonymous=anonymous,
                            task_path=task_path,
                            final_temp=final_temp,
                            trans_choice=trans_choice,
                            log_path=log_file,
                            download_title=download_title,
                            download_date=download_date,
                            task_status=TaskStatus.UPLOADING,
                            duration=10,
                            no_of_files=len(group),
                        )
                        task.insert()

                        # Convet log path to relpath
                        task.log_path = os.path.relpath(log_file)

                        created_tasks.append(task)

                        # Store file information
                        create_task_files(task, group)

                        if anonymous:
                            session[user_uuid]["uploads"][current_day] += 1

                # Prepare response
                schema = TaskSchema(many=True)
                response_data = {
                    "success": True,
                    "message": f"Successfully uploaded {len(grouped_files)} file group(s)",
                    "tasks": schema.dump(created_tasks),
                    "task_count": len(created_tasks),
                }

                # Set cookie for anonymous users if needed
                if anonymous and not request.cookies.get("user_id"):
                    response = make_response(response_data)
                    response.set_cookie(
                        "user_id", user_uuid, max_age=315360000
                    )  # 10 years
                    return response

                return response_data, 201

            except OSError as e:
                if "File name too long" in str(e):
                    return {
                        "success": False,
                        "message": "File name is too long. Please rename to 50 characters or less.",
                    }, 400
                else:
                    log_exception(logger, f"OS Error during upload: {str(e)}")
                    return {"success": False, "message": str(e)}, 400

        except Exception as e:
            log_exception(logger, "Error during file upload")
            return {"success": False, "message": f"Upload failed: {str(e)}"}, 500
