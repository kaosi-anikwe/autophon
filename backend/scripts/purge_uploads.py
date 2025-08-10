#!/usr/bin/env python3
"""
Purge uploads script - SQLAlchemy version
Deletes tasks marked for deletion and cleans up associated files and folders
"""

import os
import sys
import shutil
from datetime import datetime, timezone
from dotenv import load_dotenv

# Add the backend directory to Python path to import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Load environment variables
load_dotenv()

# Import Flask app and models
from app import create_app
from app.extensions import db
from app.models.task import Task, TaskFile
from app.utils.helpers import delete_folders
from app.utils.logger import get_logger

# Configuration
UPLOADS = os.getenv("UPLOADS")

logger = get_logger(__name__)


def purge_deleted_tasks():
    """Purge tasks that are marked as deleted and clean up associated files"""

    # Create Flask app context for database operations
    app = create_app()

    with app.app_context():
        try:
            # Find all tasks with empty deleted field (ready for deletion)
            tasks_to_delete = Task.query.filter_by(deleted="").all()

            logger.info(f"About to delete {len(tasks_to_delete)} tasks")

            if not tasks_to_delete:
                logger.info("No tasks found for deletion")
                return

            for task in tasks_to_delete:
                try:
                    logger.info(f"Deleting task: {task.task_id}")

                    # Delete task folders using task_id
                    delete_folders(UPLOADS, task.task_id)

                    # Delete missing pronunciation dictionary file if it exists
                    if task.missingprondict and os.path.exists(task.missingprondict):
                        try:
                            os.remove(task.missingprondict)
                            logger.info(
                                f"Removed missing pronunciation dict: {task.missingprondict}"
                            )
                        except OSError as e:
                            logger.warning(
                                f"Could not remove {task.missingprondict}: {e}"
                            )

                    # Delete log file if it exists
                    if task.log_path and os.path.exists(task.log_path):
                        try:
                            os.remove(task.log_path)
                            logger.info(f"Removed log file: {task.log_path}")
                        except OSError as e:
                            logger.warning(f"Could not remove {task.log_path}: {e}")

                    # Delete associated task files from filesystem
                    for task_file in task.files:
                        if task_file.file_path and os.path.exists(task_file.file_path):
                            try:
                                os.remove(task_file.file_path)
                                logger.info(f"Removed task file: {task_file.file_path}")

                                # Clean up empty parent directories
                                parent_dir = os.path.dirname(task_file.file_path)
                                if parent_dir and os.path.exists(parent_dir):
                                    try:
                                        if len(os.listdir(parent_dir)) == 0:
                                            shutil.rmtree(parent_dir)
                                            logger.info(
                                                f"Removed empty directory: {parent_dir}"
                                            )
                                    except OSError as e:
                                        logger.warning(
                                            f"Could not remove directory {parent_dir}: {e}"
                                        )

                            except OSError as e:
                                logger.warning(
                                    f"Could not remove {task_file.file_path}: {e}"
                                )

                    # Mark task as deleted with timestamp
                    delete_datetime = datetime.now(timezone.utc).strftime(
                        "%Y/%m/%d - %H:%M:%S"
                    )
                    task.deleted = delete_datetime
                    task.update()

                    logger.info(f"Successfully processed task {task.task_id}")

                except Exception as e:
                    logger.error(f"Error processing task {task.task_id}: {e}")
                    # Continue with next task even if this one fails
                    continue

            # Commit all changes
            db.session.commit()
            logger.info("Done deleting tasks - all changes committed")

        except Exception as e:
            logger.error(f"Error during purge operation: {e}")
            db.session.rollback()
            raise

        finally:
            # Ensure database connections are properly closed
            db.session.close()


if __name__ == "__main__":
    """Run the purge operation"""
    try:
        purge_deleted_tasks()
        print("Purge uploads completed successfully")
    except Exception as e:
        logger.error(f"Purge uploads failed: {e}")
        print(f"Purge uploads failed: {e}")
        sys.exit(1)
