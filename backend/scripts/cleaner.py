#!/usr/bin/env python3
"""
Database and file cleanup script for Autophon.
This script is meant to be run as a cron job at 3AM everyday to:
- Clean up expired tasks and their files
- Remove orphaned directories
- Backup user and history data
- Clean up temporary files
"""

import os
import shutil
import subprocess
from datetime import datetime, timezone
from dotenv import load_dotenv

# Flask app setup for database access
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.extensions import db
from app.models import Task, User, Captcha, TaskFile, TaskStatus
from app.utils.helpers import (
    copy_file,
    purge_unverified_accounts,
    populate_users,
    populate_history,
    delete_folders,
)

# Load environment
load_dotenv()
ADMIN = os.getenv("ADMIN")
UPLOADS = os.getenv("UPLOADS")

# Create Flask app context
app = create_app()


def anonymous_cleanup():
    """Clean up anonymous tasks that should be deleted"""
    print("Anonymous Clean up...")
    with app.app_context():
        # Find anonymous tasks that are not deleted
        anonymous_tasks = Task.query.filter(
            Task.anonymous == True, Task.deleted.is_(None)
        ).all()

        for task in anonymous_tasks:
            print(f"Deleting anonymous task with ID: {task.task_id}")

            # Delete task folders
            delete_folders(UPLOADS, task.task_id)

            # Delete missing pronunciation dict if exists
            if task.missingprondict and os.path.exists(task.missingprondict):
                os.remove(task.missingprondict)

            # Mark as deleted
            task.deleted = datetime.now(timezone.utc).strftime("%Y/%m/%d - %H:%M:%S")
            task.update()


def cleanup():
    """Clean up uploaded tasks that should be expired"""
    print("Cleaning up uploaded tasks...")
    with app.app_context():
        # Find uploaded non-anonymous tasks
        uploaded_tasks = Task.query.filter(
            Task.task_status == TaskStatus.UPLOADED, Task.anonymous == False
        ).all()

        for task in uploaded_tasks:
            print(f"Deleting folder {task.task_path}")

            # Remove task directory
            if task.task_path:
                task_full_path = os.path.join(UPLOADS, task.task_path)
                if os.path.exists(task_full_path):
                    subprocess.run(f"rm -rf {task_full_path}", shell=True)

            # Update status to expired
            task.task_status = TaskStatus.EXPIRED
            task.update()


def mark_deleted():
    """Mark tasks as expired if their folders don't exist"""
    print("Marking tasks with missing folders as expired...")
    with app.app_context():
        # Find uploaded non-anonymous tasks
        uploaded_tasks = Task.query.filter(
            Task.task_status == TaskStatus.UPLOADED, Task.anonymous == False
        ).all()

        for task in uploaded_tasks:
            if task.task_path:
                task_full_path = os.path.join(UPLOADS, task.task_path)
                if not os.path.exists(task_full_path):
                    print(f"Folder {task.task_path} does not exist, marking as expired")
                    task.task_status = TaskStatus.EXPIRED
                    task.update()


def delete_expired():
    """Delete expired tasks and their files"""
    print("Deleting expired tasks...")
    with app.app_context():
        # Find expired tasks that are not deleted
        expired_tasks = Task.query.filter(
            Task.task_status == TaskStatus.EXPIRED,
            Task.deleted.is_(None),
            Task.anonymous == False,
        ).all()

        for task in expired_tasks:
            trans_choice = task.trans_choice or "var-ling"

            if trans_choice in ["exp-a", "comp-ling"]:
                # Delete entirely for experimental/computational linguistics tasks
                print(f"Deleting {trans_choice} task: {task.task_id}")

                delete_folders(UPLOADS, task.task_id)

                # Delete missing pronunciation dict
                if task.missingprondict and os.path.exists(task.missingprondict):
                    os.remove(task.missingprondict)

                # Mark as deleted
                task.deleted = datetime.now(timezone.utc).strftime(
                    "%Y/%m/%d - %H:%M:%S"
                )
                task.update()
            else:
                # Just delete the upload folder for other task types
                if task.task_path:
                    task_full_path = os.path.join(UPLOADS, task.task_path)
                    if os.path.exists(task_full_path):
                        print(f"Deleting folder {task.task_path}")
                        subprocess.run(f"rm -rf {task_full_path}", shell=True)


def delete_unknown():
    """Delete directories that are not in the database and are not whitelisted"""
    print("Deleting unknown directories...")
    with app.app_context():
        # Get all non-deleted user UUIDs
        users = User.query.filter(
            db.or_(User.deleted.is_(None), User.deleted == "")
        ).all()
        user_uuids = [user.uuid for user in users]

        # Check uploads directory
        if os.path.exists(UPLOADS):
            for directory in os.listdir(UPLOADS):
                if directory not in user_uuids + ["README.txt"]:
                    unknown_path = os.path.join(UPLOADS, directory)
                    print(f"Deleting unknown folder: {unknown_path}")
                    subprocess.run(f"rm -rf {unknown_path}", shell=True)

        # Check each user's directory for unknown task folders
        for user_uuid in user_uuids:
            user_upload_dir = os.path.join(UPLOADS, user_uuid)
            if os.path.exists(user_upload_dir):
                for directory in os.listdir(user_upload_dir):
                    # Skip whitelisted directories
                    if directory in ["tmp", "dic", "held", "otp", "upl", "profile.png"]:
                        continue

                    # Check if this directory corresponds to a task
                    expected_task_path = f"{user_uuid}/upl/{directory}"
                    task_exists = Task.query.filter_by(
                        task_path=expected_task_path
                    ).first()

                    if not task_exists:
                        unknown_task_path = os.path.join(user_upload_dir, directory)
                        if (
                            os.path.exists(unknown_task_path)
                            and "README" not in directory
                        ):
                            print(
                                f"Deleting unknown task folder: {user_uuid}/{directory}"
                            )
                            subprocess.run(f"rm -rf {unknown_task_path}", shell=True)


def delete_held():
    """Delete held transcripts for expired and completed tasks"""
    print("Deleting held transcripts...")
    with app.app_context():
        # Find tasks that are completed, have errors, or are expired
        tasks_with_held = Task.query.filter(
            Task.deleted.is_(None),
            Task.task_status.in_(
                [TaskStatus.PRE_ERROR, TaskStatus.COMPLETED, TaskStatus.FAILED]
            ),
        ).all()

        for task in tasks_with_held:
            # Get held file paths from task files
            held_files = TaskFile.query.filter(
                TaskFile.task_id == task.id, TaskFile.file_type == "held"
            ).all()

            for held_file in held_files:
                if held_file.file_path and os.path.exists(held_file.file_path):
                    os.remove(held_file.file_path)
                    print(f"Deleted held file: {held_file.file_path}")

                    # Remove empty parent directory
                    parent_dir = os.path.dirname(held_file.file_path)
                    if os.path.exists(parent_dir) and len(os.listdir(parent_dir)) == 0:
                        shutil.rmtree(parent_dir)


def delete_missingpron():
    """Clean up orphaned missing pronunciation dictionaries"""
    print("Deleting orphaned missing pronunciation dictionaries...")

    if not os.path.exists(UPLOADS):
        return

    with app.app_context():
        # Get all user directories
        for user_dir in os.listdir(UPLOADS):
            if user_dir == "README.txt":
                continue

            dicts_dir = os.path.join(UPLOADS, user_dir, "dic", "missing")
            if os.path.exists(dicts_dir):
                for dict_file in os.listdir(dicts_dir):
                    dict_path = os.path.join(dicts_dir, dict_file)

                    # Skip directories
                    if os.path.isdir(dict_path):
                        continue

                    # Check if this dict is referenced by any active task
                    task_using_dict = Task.query.filter(
                        Task.deleted.is_(None), Task.missingprondict == dict_path
                    ).first()

                    if task_using_dict:
                        print(f"Keeping: {dict_file} for user {user_dir}")
                    else:
                        print(
                            f"Deleting orphaned dict: {dict_file} for user {user_dir}"
                        )
                        if os.path.exists(dict_path):
                            os.remove(dict_path)


def cleanup_captchas():
    """Clean up expired captchas"""
    print("Cleaning up expired captchas...")
    with app.app_context():
        cleaned_count = Captcha.cleanup_expired_captchas()
        print(f"Deleted {cleaned_count} expired captchas")


def backup_data():
    """Backup user and history data"""
    print("Backing up data...")
    timestamp = datetime.now().strftime("%y%m%d")

    # History backup
    history_src = os.path.join(ADMIN, "history.xlsx")
    history_dst = os.path.join(ADMIN, "history", f"history_{timestamp}.xlsx")
    if os.path.exists(history_src):
        copy_file(src=history_src, dst=history_dst)
        print(f"Backed up history to {history_dst}")

    # User backup
    print("Backing up users.xlsx file...")
    populate_users(
        limit=datetime.now(),
        include_deleted=True,
        filename=os.path.join(ADMIN, "users", f"users_{timestamp}.xlsx"),
    )

    # History backup
    print("Backing up history.xlsx file...")
    populate_history(
        filename=os.path.join(ADMIN, "history", f"history_{timestamp}.xlsx"),
    )


def clear_temp():
    """Clear temporary files"""
    print("Clearing tmp folder...")
    subprocess.run("rm -rf /tmp/*", shell=True)


def main():
    """Main cleanup routine"""
    print(f"Starting cleanup at {datetime.now()}")

    try:
        # Core cleanup functions
        anonymous_cleanup()
        cleanup()
        mark_deleted()
        delete_expired()
        delete_unknown()
        delete_held()
        delete_missingpron()

        # Maintenance functions
        purge_unverified_accounts()
        cleanup_captchas()

        # Backup functions
        backup_data()

        # Clear temp files
        clear_temp()

        print(f"Cleanup completed successfully at {datetime.now()}")

    except Exception as e:
        print(f"Cleanup failed with error: {str(e)}")
        raise


if __name__ == "__main__":
    main()
