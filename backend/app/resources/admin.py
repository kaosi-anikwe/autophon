import os
import zipfile
from datetime import datetime, timedelta, timezone
from sqlalchemy import func, and_

from flask_restful import Resource
from flask import request, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.models.user import User
from app.models.task import Task, TaskStatus
from app.utils.logger import (
    get_logger,
    log_exception,
    log_request_info,
    log_response_info,
)
from app.utils.helpers import delete_user_account, populate_users
from app.utils.datetime_helpers import utc_now

logger = get_logger(__name__)


class AdminRequiredMixin:
    """Mixin to check admin access for all admin resources"""

    def check_admin_access(self):
        """Check if current user is admin"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            if not current_user or not current_user.admin:
                return {"message": "Admin access required"}, 403

            return None
        except Exception as e:
            return {"message": f"Authentication error: {str(e)}"}, 500


class BlockedEmailsResource(Resource, AdminRequiredMixin):
    """RESTful resource for managing blocked emails"""

    @jwt_required()
    def get(self):
        """Get list of blocked emails"""
        log_request_info(logger, request)

        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

        try:
            blocked_emails_file = os.path.join(
                os.getenv("ADMIN", ""), "blocked_emails.txt"
            )

            emails = []
            if os.path.exists(blocked_emails_file):
                with open(blocked_emails_file, "r") as email_file:
                    emails = [
                        line.strip() for line in email_file.readlines() if line.strip()
                    ]
                    emails = emails[::-1]  # Reverse for newest first

            response = {"emails": emails, "count": len(emails)}
            log_response_info(logger, response, 200)
            return response, 200

        except Exception as e:
            log_exception(logger, "Failed to get blocked emails")
            response = {"message": f"Failed to get blocked emails: {str(e)}"}
            log_response_info(logger, response, 500)
            return response, 500

    @jwt_required()
    def post(self):
        """Add or remove email from blocked list"""
        log_request_info(logger, request)

        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

        try:
            data = request.get_json()
            if not data:
                return {"message": "Request body is required"}, 400

            email = str(data.get("email", "")).strip()
            action = data.get("action", "add")  # "add" or "remove"

            if not email:
                return {"message": "Email is required"}, 400

            blocked_emails_file = os.path.join(
                os.getenv("ADMIN", ""), "blocked_emails.txt"
            )

            # Ensure directory exists
            os.makedirs(os.path.dirname(blocked_emails_file), exist_ok=True)

            # Read existing emails
            existing_emails = []
            if os.path.exists(blocked_emails_file):
                with open(blocked_emails_file, "r") as email_file:
                    existing_emails = [
                        line.strip() for line in email_file.readlines() if line.strip()
                    ]

            if action == "add":
                # Find and logout the user immediately
                user_to_block: User = User.query.filter_by(
                    email=email, deleted=None
                ).first()
                user_logged_out = False

                if user_to_block:
                    user_to_block.revoke_all_tokens(reason="email_blocked_by_admin")
                    user_logged_out = True
                    logger.info(f"User {email} tokens revoked - email blocked by admin")

                # Add email if not already blocked
                if email not in existing_emails:
                    existing_emails.insert(0, email)  # Add to beginning

                    with open(blocked_emails_file, "w") as email_file:
                        for blocked_email in existing_emails:
                            email_file.write(blocked_email + "\n")

                    response = {
                        "message": f"Email {email} added to blocked list",
                        "user_logged_out": user_logged_out,
                        "added": True,
                    }
                else:
                    response = {
                        "message": f"Email {email} was already blocked",
                        "user_logged_out": user_logged_out,
                        "added": False,
                    }

                log_response_info(logger, response, 200)
                return response, 200

            elif action == "remove":
                # Remove email from blocked list
                if email in existing_emails:
                    existing_emails.remove(email)

                    with open(blocked_emails_file, "w") as email_file:
                        for blocked_email in existing_emails:
                            email_file.write(blocked_email + "\n")

                    response = {
                        "message": f"Email {email} removed from blocked list",
                        "removed": True,
                    }
                else:
                    response = {
                        "message": f"Email {email} was not in blocked list",
                        "removed": False,
                    }

                log_response_info(logger, response, 200)
                return response, 200

            else:
                return {"message": "Invalid action. Use 'add' or 'remove'"}, 400

        except Exception as e:
            log_exception(logger, "Failed to manage blocked emails")
            response = {"message": f"Failed to manage blocked emails: {str(e)}"}
            log_response_info(logger, response, 500)
            return response, 500


class SiteStatusResource(Resource):
    """RESTful resource for managing site active status"""

    def check_admin_access(self):
        """Check if current user is admin"""
        try:
            current_user_id = int(get_jwt_identity())
            current_user = User.query.get(current_user_id)

            if not current_user or not current_user.admin:
                return {"message": "Admin access required"}, 403

            return None
        except Exception as e:
            return {"message": f"Authentication error: {str(e)}"}, 500

    def get(self):
        """Get current site status"""
        log_request_info(logger, request)

        try:
            switch_file = os.path.join(os.getenv("ADMIN", ""), "switch.txt")

            # Default values
            status_data = {
                "active": True,
                "start_date": "",
                "end_date": "",
                "inactive_message": "",
            }

            if os.path.exists(switch_file):
                with open(switch_file, "r") as file:
                    lines = [line.strip() for line in file.readlines()]

                if len(lines) >= 4:
                    status_data = {
                        "active": lines[0] == "on",
                        "start_date": lines[1],
                        "end_date": lines[2],
                        "inactive_message": "\n".join(lines[3:]),
                    }

            log_response_info(logger, status_data, 200)
            return status_data, 200

        except Exception as e:
            log_exception(logger, "Failed to get site status")
            response = {"message": f"Failed to get site status: {str(e)}"}
            log_response_info(logger, response, 500)
            return response, 500

    @jwt_required()
    def put(self):
        """Update site status"""
        log_request_info(logger, request)

        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

        try:
            data = request.get_json()
            if not data:
                return {"message": "Request body is required"}, 400

            # Get current status to compare
            switch_file = os.path.join(os.getenv("ADMIN", ""), "switch.txt")
            previous_active = True  # Default assumption

            try:
                if os.path.exists(switch_file):
                    with open(switch_file, "r") as file:
                        previous_status = file.readlines()
                        if previous_status:
                            previous_active = previous_status[0].strip() == "on"
            except (FileNotFoundError, IndexError):
                pass

            # Ensure directory exists
            os.makedirs(os.path.dirname(switch_file), exist_ok=True)

            # Write new status
            active = data.get("active", True)
            start_date = data.get("start_date", "")
            end_date = data.get("end_date", "")
            inactive_message = data.get("inactive_message", "")

            with open(switch_file, "w") as file:
                file.write("on\n" if active else "off\n")
                file.write(start_date + "\n")
                file.write(end_date + "\n")
                file.write(inactive_message + "\n")

            # Update app global state
            current_app.site_active = active

            response_data = {
                "message": "Site status updated successfully",
                "active": active,
                "users_logged_out": 0,
            }

            # If site is being deactivated (active=False) and was previously active,
            # logout all non-admin users
            if previous_active and not active:
                try:
                    # Get all non-admin users
                    active_users = User.query.filter(
                        User.admin == False, User.deleted.is_(None)
                    ).all()

                    logged_out_count = 0
                    for user in active_users:
                        user.revoke_all_tokens(reason="site_deactivated")
                        logged_out_count += 1

                    logger.info(
                        f"Site deactivated - {logged_out_count} users logged out"
                    )
                    response_data["users_logged_out"] = logged_out_count
                    response_data[
                        "message"
                    ] = f"Site deactivated successfully. {logged_out_count} users logged out."

                except Exception as user_logout_error:
                    logger.warning(
                        f"Error logging out users during site deactivation: {str(user_logout_error)}"
                    )

            log_response_info(logger, response_data, 200)
            return response_data, 200

        except Exception as e:
            log_exception(logger, "Failed to update site status")
            response = {"message": f"Failed to update site status: {str(e)}"}
            log_response_info(logger, response, 500)
            return response, 500


class AdminUsersResource(Resource, AdminRequiredMixin):
    """RESTful resource for admin user management"""

    @jwt_required()
    def get(self):
        """Fetch all users"""
        log_request_info(logger, request)

        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

        try:
            users = User.query.all()

            if users:
                from app.schemas import UserSchema

                user_schema = UserSchema(many=True, exclude=["password_hash"])
                response = {"users": user_schema.dump(users)}
            else:
                response = {"users": []}

            log_response_info(logger, response, 200)
            return response, 200

        except Exception as e:
            log_exception(logger, "Failed to get users")
            response = {"message": f"Failed to get usesr: {str(e)}"}
            log_response_info(logger, response, 500)
            return response, 500


class AdminDownloadsResource(Resource, AdminRequiredMixin):
    """RESTful resource for admin downloads"""

    @jwt_required()
    def post(self):
        """Generate and download user spreadsheet based on date limit"""
        log_request_info(logger, request)

        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

        try:
            data = request.get_json()
            if not data:
                return {"message": "Request body is required"}, 400

            user_limit_str = data.get("user_limit")
            include_deleted = data.get("include_deleted", False)

            if not user_limit_str:
                return {"message": "user_limit is required (YYYY-MM-DD format)"}, 400

            try:
                limit = datetime.strptime(user_limit_str, "%Y-%m-%d").replace(
                    hour=23, minute=59, second=59
                )
            except ValueError:
                return {"message": "user_limit must be in YYYY-MM-DD format"}, 400

            generated_file = populate_users(
                limit, include_deleted
            )  # mongo is None for new implementation

            if not generated_file or not os.path.exists(generated_file):
                return {"message": "Failed to generate user report"}, 500

            try:
                return send_file(
                    generated_file,
                    mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    as_attachment=True,
                    download_name=f"users_{user_limit_str}.xlsx",
                )
            finally:
                # Clean up temporary file
                if os.path.exists(generated_file):
                    os.remove(generated_file)

        except Exception as e:
            log_exception(logger, "Failed to generate user download")
            response = {"message": f"Failed to generate user download: {str(e)}"}
            log_response_info(logger, response, 500)
            return response, 500


class AdminHistoryResource(Resource, AdminRequiredMixin):
    """RESTful resource for admin history downloads"""

    @jwt_required()
    def get(self):
        """Get list of available history spreadsheets"""
        log_request_info(logger, request)

        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

        try:
            admin_updates = os.getenv("ADMIN", "")
            folder_path = os.path.join(admin_updates, "history")

            spreadsheets = []

            if os.path.exists(folder_path):
                excel_files = [
                    os.path.join(folder_path, filename)
                    for filename in os.listdir(folder_path)
                    if os.path.isfile(os.path.join(folder_path, filename))
                    and filename.endswith((".xlsx", ".xls"))
                ]
                excel_files.sort(key=lambda file: os.path.getmtime(file))

                for excel_file in excel_files:
                    try:
                        filename = os.path.basename(excel_file)
                        # Try to parse date from filename
                        date_str = filename.replace("history_", "").replace(".xlsx", "")
                        date_obj = datetime.strptime(date_str, "%y%m%d")
                        formatted_date = date_obj.strftime("%B %-d, %Y")
                    except (ValueError, AttributeError):
                        formatted_date = filename

                    spreadsheets.append(
                        {
                            "date": formatted_date,
                            "filename": filename,
                            "size": os.path.getsize(excel_file),
                        }
                    )

            # Add option for zip download
            if spreadsheets:
                spreadsheets.append(
                    {"date": "All files (ZIP)", "filename": "history.zip", "size": None}
                )

            response = {
                "spreadsheets": spreadsheets,
                "count": len(spreadsheets)
                - (1 if spreadsheets else 0),  # Subtract zip option
            }

            log_response_info(logger, response, 200)
            return response, 200

        except Exception as e:
            log_exception(logger, "Failed to get history spreadsheets")
            response = {"message": f"Failed to get history spreadsheets: {str(e)}"}
            log_response_info(logger, response, 500)
            return response, 500

    @jwt_required()
    def post(self):
        """Download specific history file or zip archive"""
        log_request_info(logger, request)

        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

        try:
            data = request.get_json()
            if not data:
                return {"message": "Request body is required"}, 400

            filename = data.get("filename")
            if not filename:
                return {"message": "filename is required"}, 400

            admin_updates = os.getenv("ADMIN", "")
            folder_path = os.path.join(admin_updates, "history")

            if filename == "history.zip":
                # Create and return zip archive
                if not os.path.exists(folder_path):
                    return {"message": "History folder not found"}, 404

                # Get all files in history folder
                file_info = []
                for root, dirs, files in os.walk(folder_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        file_info.append((file_path, os.path.getmtime(file_path)))

                if not file_info:
                    return {"message": "No history files found"}, 404

                # Sort by modification time
                file_info.sort(key=lambda x: x[1])

                # Create temporary zip file
                zip_filename = os.path.join(admin_updates, "history.zip")
                with zipfile.ZipFile(zip_filename, "w", zipfile.ZIP_DEFLATED) as zipf:
                    for file_path, mtime in file_info:
                        arcname = os.path.relpath(file_path, folder_path)
                        zipf.write(file_path, arcname)

                try:
                    return send_file(
                        zip_filename, as_attachment=True, download_name="history.zip"
                    )
                finally:
                    # Clean up zip file
                    if os.path.exists(zip_filename):
                        os.remove(zip_filename)

            else:
                # Download specific file
                file_path = os.path.join(folder_path, filename)

                if not os.path.exists(file_path):
                    return {"message": "File not found"}, 404

                return send_file(
                    file_path,
                    mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    as_attachment=True,
                    download_name=filename,
                )

        except Exception as e:
            log_exception(logger, "Failed to download history file")
            response = {"message": f"Failed to download history file: {str(e)}"}
            log_response_info(logger, response, 500)
            return response, 500


class AdminDashboardResource(Resource, AdminRequiredMixin):
    """Admin dashboard statistics endpoint"""

    @jwt_required()
    def get(self):
        """Get admin dashboard statistics"""
        log_request_info(logger, request)

        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

        try:
            # Calculate statistics
            dashboard_stats = self._calculate_dashboard_stats()

            log_response_info(logger, dashboard_stats, 200)
            return dashboard_stats, 200

        except Exception as e:
            log_exception(logger, f"Failed to get dashboard stats: {str(e)}")
            response = {"message": f"Failed to get dashboard stats: {str(e)}"}
            log_response_info(logger, response, 500)
            return response, 500

    def _calculate_dashboard_stats(self):
        """Calculate all dashboard statistics"""
        try:
            # Get today's date range for filtering
            today = utc_now().date()
            today_start = datetime.combine(today, datetime.min.time()).replace(
                tzinfo=timezone.utc
            )
            today_end = datetime.combine(today, datetime.max.time()).replace(
                tzinfo=timezone.utc
            )

            # 1. Total users (excluding deleted)
            total_users = User.query.filter(
                (User.deleted == None) | (User.deleted == "")
            ).count()

            # 2. Total size of uploaded files (sum of all task sizes)
            total_size_result = (
                Task.query.with_entities(func.sum(Task.size))
                .filter(Task.size.isnot(None))
                .scalar()
            )

            total_size_mb = float(total_size_result or 0)

            # Convert to appropriate units
            if total_size_mb >= 1024:
                total_size_display = f"{total_size_mb / 1024:.2f} GB"
            else:
                total_size_display = f"{total_size_mb:.2f} MB"

            # 3. Users currently logged in (have active, non-blacklisted tokens)
            # This is approximated by checking for recent token activity
            # We'll count users who have accessed the system in the last hour
            six_hour_ago = utc_now() - timedelta(hours=6)

            # Count users who have tokens that were issued after their revocation time
            # or users without any revocation time
            active_users = User.query.filter(
                and_(
                    (User.deleted == None) | (User.deleted == ""),
                    User.tokens_revoked_at < six_hour_ago,
                )
            ).count()

            # Also count users with no revocation time who have recent activity
            users_never_revoked = User.query.filter(
                and_(
                    (User.deleted == None) | (User.deleted == ""),
                    User.tokens_revoked_at == None,
                    User.updated_at >= six_hour_ago,
                )
            ).count()

            currently_logged_in = active_users + users_never_revoked

            # 4. Tasks processed today - broken down by status
            tasks_today_query = Task.query.filter(
                and_(Task.created_at >= today_start, Task.created_at <= today_end)
            )

            # Count by status
            completed_today = tasks_today_query.filter(
                Task.task_status == TaskStatus.COMPLETED
            ).count()
            pending_today = tasks_today_query.filter(
                Task.task_status.in_([TaskStatus.UPLOADING, TaskStatus.UPLOADED])
            ).count()
            failed_today = tasks_today_query.filter(
                Task.task_status == TaskStatus.FAILED
            ).count()
            processing_today = tasks_today_query.filter(
                Task.task_status.in_([TaskStatus.ALIGNED, TaskStatus.PROCESSING])
            ).count()

            # Total count
            tasks_today = (
                completed_today + pending_today + failed_today + processing_today
            )

            # 5. Total size of uploaded files for the current day
            size_today = (
                Task.query.with_entities(func.sum(Task.size))
                .filter(
                    and_(Task.created_at >= today_start, Task.created_at <= today_end)
                )
                .filter(Task.size.isnot(None))
                .scalar()
            )

            size_today_mb = float(size_today or 0)

            # Convert to appropriate units
            if size_today_mb >= 1024:
                size_today_display = f"{size_today_mb / 1024:.2f} GB"
            else:
                size_today_display = f"{size_today_mb:.2f} MB"

            # Additional useful stats
            # Total tasks all time
            total_tasks = Task.query.count()

            # New users today
            new_users_today = User.query.filter(
                and_(
                    User.created_at >= today_start,
                    User.created_at <= today_end,
                    (User.deleted == None) | (User.deleted == ""),
                )
            ).count()

            return {
                "total_users": total_users,
                "total_file_size": {
                    "size_mb": total_size_mb,
                    "display": total_size_display,
                },
                "currently_logged_in": currently_logged_in,
                "tasks_processed_today": {
                    "completed": completed_today,
                    "pending": pending_today,
                    "failed": failed_today,
                    "processing": processing_today,
                    "count": tasks_today,
                    "size_mb": size_today_mb,
                    "size_display": size_today_display,
                },
                "additional_stats": {
                    "total_tasks_all_time": total_tasks,
                    "new_users_today": new_users_today,
                },
                "generated_at": utc_now().isoformat(),
                "date": today.isoformat(),
            }

        except Exception as e:
            logger.error(f"Error calculating dashboard stats: {str(e)}")
            raise


class AdminUserActionsResource(Resource, AdminRequiredMixin):
    """Admin endpoint for performing actions on users via email"""

    @jwt_required()
    def post(self):
        """Perform admin actions on users by email"""
        log_request_info(logger, request)

        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

        try:
            data = request.get_json()
            if not data:
                return {"message": "Request body is required"}, 400

            email = data.get("email", "").strip().lower()
            action = data.get("action", "").strip().lower()

            if not email:
                return {"message": "Email is required"}, 400

            if not action:
                return {"message": "Action is required"}, 400

            # Valid actions
            valid_actions = ["verify", "make_admin", "block", "delete"]
            if action not in valid_actions:
                return {
                    "message": f"Invalid action. Valid actions are: {', '.join(valid_actions)}"
                }, 400

            # Find user by email
            user = User.query.filter_by(email=email).first()

            # For delete and block actions, we want to find the user even if deleted
            # For other actions, we only want active users
            if action in ["verify", "make_admin"] and (not user or user.deleted):
                return {"message": "User not found or already deleted"}, 404

            if action == "verify":
                return self._verify_user(user)
            elif action == "make_admin":
                return self._make_admin(user)
            elif action == "block":
                return self._block_user(email, user)
            elif action == "delete":
                return self._delete_user(email, user)

        except Exception as e:
            log_exception(logger, f"Admin user action failed: {str(e)}")
            response = {"message": f"Admin user action failed: {str(e)}"}
            log_response_info(logger, response, 500)
            return response, 500

    def _verify_user(self, user):
        """Set user as verified"""
        try:
            if user.verified:
                return {"message": f"User {user.email} is already verified"}, 200

            user.verified = True
            user.update()

            logger.info(f"Admin verified user: {user.email}")
            response = {
                "message": f"User {user.email} has been verified",
                "action": "verify",
                "success": True,
                "user_email": user.email,
            }
            log_response_info(logger, response, 200)
            return response, 200

        except Exception as e:
            logger.error(f"Error verifying user {user.email}: {str(e)}")
            return {"message": f"Failed to verify user: {str(e)}"}, 500

    def _make_admin(self, user):
        """Make user an admin"""
        try:
            if user.admin:
                return {"message": f"User {user.email} is already an admin"}, 200

            user.admin = True
            user.update()

            logger.info(f"Admin privileges granted to user: {user.email}")
            response = {
                "message": f"User {user.email} has been granted admin privileges",
                "action": "make_admin",
                "success": True,
                "user_email": user.email,
            }
            log_response_info(logger, response, 200)
            return response, 200

        except Exception as e:
            logger.error(f"Error making user admin {user.email}: {str(e)}")
            return {"message": f"Failed to make user admin: {str(e)}"}, 500

    def _block_user(self, email, user):
        """Block user by adding to blocked emails list"""
        try:
            blocked_emails_file = os.path.join(
                os.getenv("ADMIN", ""), "blocked_emails.txt"
            )

            # Ensure directory exists
            os.makedirs(os.path.dirname(blocked_emails_file), exist_ok=True)

            # Read existing emails
            existing_emails = []
            if os.path.exists(blocked_emails_file):
                with open(blocked_emails_file, "r") as email_file:
                    existing_emails = [
                        line.strip() for line in email_file.readlines() if line.strip()
                    ]

            user_logged_out = False
            already_blocked = email in existing_emails

            # Logout user if they exist and are not deleted
            if user and not user.deleted:
                user.revoke_all_tokens(reason="email_blocked_by_admin")
                user_logged_out = True
                logger.info(f"User {email} tokens revoked - blocked by admin")

            # Add email to blocked list if not already there
            if not already_blocked:
                existing_emails.insert(0, email)  # Add to beginning

                with open(blocked_emails_file, "w") as email_file:
                    for blocked_email in existing_emails:
                        email_file.write(blocked_email + "\n")

            logger.info(f"Admin blocked email: {email}")
            response = {
                "message": f"Email {email} has been blocked",
                "action": "block",
                "success": True,
                "user_email": email,
                "user_logged_out": user_logged_out,
                "already_blocked": already_blocked,
            }
            log_response_info(logger, response, 200)
            return response, 200

        except Exception as e:
            logger.error(f"Error blocking user {email}: {str(e)}")
            return {"message": f"Failed to block user: {str(e)}"}, 500

    def _delete_user(self, email, user):
        """Delete user account"""
        try:
            if not user:
                return {"message": f"User with email {email} not found"}, 404

            if user.deleted:
                return {"message": f"User {email} is already deleted"}, 200

            # Revoke tokens first
            user.revoke_all_tokens(reason="account_deleted_by_admin")

            # Use existing delete function
            success = delete_user_account(user.id)

            if success:
                logger.info(f"Admin deleted user: {email}")
                response = {
                    "message": f"User {email} has been deleted",
                    "action": "delete",
                    "success": True,
                    "user_email": email,
                }
                log_response_info(logger, response, 200)
                return response, 200
            else:
                return {"message": f"Failed to delete user {email}"}, 500

        except Exception as e:
            logger.error(f"Error deleting user {email}: {str(e)}")
            return {"message": f"Failed to delete user: {str(e)}"}, 500
