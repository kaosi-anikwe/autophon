import os
import zipfile
from datetime import datetime

from flask_restful import Resource
from flask import request, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.models.user import User
from app.utils.logger import (
    get_logger,
    log_exception,
    log_request_info,
    log_response_info,
)
from app.utils.helpers import delete_user_account, populate_users

logger = get_logger(__name__)


class AdminRequiredMixin:
    """Mixin to check admin access for all admin resources"""

    def check_admin_access(self):
        """Check if current user is admin"""
        try:
            current_user_id = get_jwt_identity()
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


class SiteStatusResource(Resource, AdminRequiredMixin):
    """RESTful resource for managing site active status"""

    @jwt_required()
    def get(self):
        """Get current site status"""
        log_request_info(logger, request)

        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

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
    def post(self):
        """Find user by ID or email, or delete user"""
        log_request_info(logger, request)

        # Check admin access
        admin_check = self.check_admin_access()
        if admin_check:
            return admin_check

        try:
            data = request.get_json()
            if not data:
                return {"message": "Request body is required"}, 400

            action = data.get("action", "find")  # "find" or "delete"

            if action == "find":
                user = None
                if "user_id" in data:
                    user_id = data["user_id"]
                    user = User.query.filter_by(id=user_id).first()
                elif "email" in data:
                    email = data["email"]
                    user = User.query.filter_by(email=email).first()
                else:
                    return {"message": "user_id or email is required"}, 400

                if user:
                    from app.schemas import UserSchema

                    user_schema = UserSchema(exclude=["password_hash"])
                    response = {"user": user_schema.dump(user)}
                else:
                    response = {"user": None}

                log_response_info(logger, response, 200)
                return response, 200

            elif action == "delete":
                user_id = data.get("user_id")
                if not user_id:
                    return {"message": "user_id is required for delete action"}, 400

                # Find and revoke tokens first
                user = User.query.get(int(user_id))
                if user:
                    user.revoke_all_tokens(reason="account_deleted_by_admin")

                # Use existing delete function
                deleted = delete_user_account(user_id)
                response = {
                    "deleted": deleted,
                    "message": "User deleted successfully"
                    if deleted
                    else "User not found or already deleted",
                }

                log_response_info(logger, response, 200)
                return response, 200

            else:
                return {"message": "Invalid action. Use 'find' or 'delete'"}, 400

        except Exception as e:
            log_exception(logger, "Failed to manage user")
            response = {"message": f"Failed to manage user: {str(e)}"}
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
