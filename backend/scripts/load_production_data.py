#!/usr/bin/env python3
"""
Production Data Loader Script - Updated Version

Safely loads users.json and tasks.json data into the database.
This script includes comprehensive validation and error handling for production use.

Usage:
    python load_production_data.py [--dry-run] [--users-only] [--tasks-only]
    
Options:
    --dry-run     Show what would be inserted without actually inserting
    --users-only  Only load users data
    --tasks-only  Only load tasks data
"""

import os
import sys
import json
import argparse
from typing import Dict, Optional, Any
from datetime import datetime, timezone

# Add the app directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.task import Task, TaskStatus, TaskFile, TaskFileName, FileType
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DataLoadError(Exception):
    """Custom exception for data loading errors"""

    pass


class ProductionDataLoader:
    def __init__(self, app):
        self.app = app
        self.users_file = "users.json"
        self.tasks_file = "tasks.json"

    def validate_files(self) -> None:
        """Validate that required JSON files exist and are readable"""
        for filename in [self.users_file, self.tasks_file]:
            if not os.path.exists(filename):
                raise DataLoadError(f"File not found: {filename}")

            if not os.access(filename, os.R_OK):
                raise DataLoadError(f"Cannot read file: {filename}")

            # Validate JSON structure
            try:
                with open(filename, "r", encoding="utf-8") as f:
                    json.load(f)
            except json.JSONDecodeError as e:
                raise DataLoadError(f"Invalid JSON in {filename}: {e}")

    def parse_mongo_date(self, date_obj: Dict[str, str]) -> Optional[datetime]:
        """Parse MongoDB date format to Python datetime"""
        if not date_obj or not isinstance(date_obj, dict):
            return None

        date_str = date_obj.get("$date")
        if not date_str:
            return None

        try:
            # Parse ISO format with timezone
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except (ValueError, TypeError) as e:
            logger.warning(f"Failed to parse date '{date_str}': {e}")
            return None

    def _safe_int(self, value: Any) -> Optional[int]:
        """Safely convert value to int"""
        if value is None or value == "":
            return None
        try:
            return int(float(value))  # Convert through float to handle decimal strings
        except (ValueError, TypeError):
            logger.warning(f"Could not convert to int: {value}")
            return None

    def _safe_float(self, value: Any) -> Optional[float]:
        """Safely convert value to float"""
        if value is None or value == "":
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            logger.warning(f"Could not convert to float: {value}")
            return None

    def validate_user_data(self, user_data: Dict[str, Any]) -> None:
        """Validate user data before insertion"""
        required_fields = ["id"]

        for field in required_fields:
            if field not in user_data or not user_data[field]:
                raise DataLoadError(f"Missing required user field: {field}")

        # For deleted users, email might be "deleted"
        email = user_data.get("email", "")
        if email != "deleted" and (not email or "@" not in email or len(email) < 5):
            raise DataLoadError(f"Invalid email format: {email}")

    def validate_task_data(self, task_data: Dict[str, Any]) -> None:
        """Validate task data before insertion"""
        required_fields = ["user_id"]

        for field in required_fields:
            if field not in task_data or not task_data[field]:
                raise DataLoadError(f"Missing required task field: {field}")

    def load_users(self, dry_run: bool = False) -> int:
        """Load users from users.json"""
        logger.info("Starting user data loading...")

        with open(self.users_file, "r", encoding="utf-8") as f:
            users_data = json.load(f)

        if not isinstance(users_data, list):
            raise DataLoadError("users.json must contain a list of users")

        loaded_count = 0
        skipped_count = 0

        for i, user_data in enumerate(users_data):
            try:
                self.validate_user_data(user_data)

                # Use full original ID as UUID (no truncation)
                original_id = user_data.get("id", "")
                user_uuid = original_id

                if "deleted" in user_data["email"]:
                    user_data["email"] = f"deleted_{i}@deleted.com"

                # Check if user already exists by email or UUID
                existing_user = (
                    User.query.filter_by(email=user_data["email"]).first()
                    or User.query.filter_by(uuid=user_uuid).first()
                )
                if existing_user:
                    logger.info(f"Skipping existing user: {user_data['email']}")
                    skipped_count += 1
                    continue

                # Handle title mapping
                title = user_data.get("title")
                if title == "none":
                    title = ""

                # Map fields from JSON to database model with corrections
                user_fields = {
                    "uuid": user_uuid,
                    "title": title,
                    "first_name": user_data.get("first_name"),
                    "last_name": user_data.get("last_name"),
                    "email": user_data["email"],
                    "verified": user_data.get("verified", False),
                    "trans_default": user_data.get("transDefault"),
                    "dict_default": user_data.get("dictDefault"),
                    "edited": user_data.get("edited", False),
                    "org": user_data.get("org"),
                    "industry": user_data.get("industry"),
                    "admin": user_data.get("admin", False),
                    "deleted": user_data.get("deleted", ""),
                    "password_hash": user_data.get(
                        "password", ""
                    ),  # Note: keeping existing hash
                }

                # Handle timestamps
                registered = self.parse_mongo_date(user_data.get("registered"))
                if registered:
                    user_fields["created_at"] = registered

                if dry_run:
                    logger.info(
                        f"[DRY RUN] Would create user: {user_fields['email']} (UUID: {user_uuid})"
                    )
                else:
                    user = User(**user_fields)
                    db.session.add(user)
                    logger.info(
                        f"Created user: {user_fields['email']} (UUID: {user_uuid})"
                    )

                loaded_count += 1

            except DataLoadError as e:
                logger.error(f"Validation error for user {i}: {e}")
                skipped_count += 1
                continue
            except Exception as e:
                logger.error(f"Error processing user {i}: {e}")
                logger.error(f"User data: {user_data}")
                skipped_count += 1
                continue

        if not dry_run:
            db.session.commit()
            logger.info(
                f"Successfully loaded {loaded_count} users, skipped {skipped_count}"
            )
        else:
            logger.info(
                f"[DRY RUN] Would load {loaded_count} users, skip {skipped_count}"
            )

        return loaded_count

    def load_tasks(self, dry_run: bool = False) -> int:
        """Load tasks from tasks.json"""
        logger.info("Starting task data loading...")

        with open(self.tasks_file, "r", encoding="utf-8") as f:
            tasks_data = json.load(f)

        if not isinstance(tasks_data, list):
            raise DataLoadError("tasks.json must contain a list of tasks")

        loaded_count = 0
        skipped_count = 0

        for i, task_data in enumerate(tasks_data):
            try:
                self.validate_task_data(task_data)

                # Check if user exists using full user_id
                user_id_full = task_data["user_id"]
                user = User.query.filter_by(uuid=user_id_full).first()
                if not user:
                    logger.warning(
                        f"User not found for task {i}, marking as anonymous, user_id: {user_id_full}"
                    )
                    # Mark as anonymous task
                    anonymous_flag = True
                    user_db_id = None
                    user_uuid = user_id_full  # Keep original user_id for reference
                else:
                    anonymous_flag = task_data.get("anonymous", False)
                    user_db_id = user.id
                    user_uuid = user.uuid

                # Use task_id from JSON, fallback to task_path
                task_id = (
                    task_data.get("task_id")
                    or task_data.get("task_path")
                    or f"import_{i}"
                )

                # Check if task already exists
                existing_task = Task.query.filter_by(task_id=task_id).first()
                if existing_task:
                    logger.info(f"Skipping existing task: {task_id}")
                    skipped_count += 1
                    continue

                # Map task status with special handling for pre-error
                raw_status = task_data.get("task_status", "pending")
                pre_error_flag = False

                if raw_status == "pre-error":
                    task_status = TaskStatus.UPLOADING
                    pre_error_flag = True
                else:
                    status_map = {
                        "completed": TaskStatus.COMPLETED,
                        "error": TaskStatus.FAILED,
                        "pending": TaskStatus.PENDING,
                        "processing": TaskStatus.PROCESSING,
                        "cancelled": TaskStatus.CANCELLED,
                        "uploaded": TaskStatus.UPLOADED,
                        "uploading": TaskStatus.UPLOADING,
                        "aligned": TaskStatus.ALIGNED,
                        "expired": TaskStatus.EXPIRED,
                    }
                    task_status = status_map.get(raw_status, TaskStatus.EXPIRED)

                # Clean and convert task language
                task_lang = task_data.get("lang", "")
                if task_lang:
                    task_lang = task_lang.replace(" (suggested)", "")

                # Map fields from JSON to database model with type conversions
                task_fields = {
                    "task_id": task_id,
                    "user_id": user_db_id,
                    "user_uuid": user_uuid,
                    "task_status": task_status,
                    "anonymous": anonymous_flag,
                    "trans_choice": task_data.get("trans_choice"),
                    "lang": task_lang,
                    "task_path": task_data.get("task_path"),
                    "log_path": task_data.get("log_path"),
                    "download_path": task_data.get("download_path"),
                    "missingprondict": task_data.get("missingprondict"),
                    "final_temp": task_data.get("final_temp"),
                    "size": self._safe_float(task_data.get("size")),
                    "words": self._safe_int(task_data.get("words")),
                    "missing_words": self._safe_int(task_data.get("missing_words")),
                    "duration": self._safe_int(task_data.get("duration")),
                    "no_of_files": self._safe_int(task_data.get("no_of_files", 1)),
                    "no_of_tiers": self._safe_int(task_data.get("no_of_tiers", 1)),
                    "multitier": task_data.get("multitier", False),
                    "pre_error": pre_error_flag or task_data.get("pre_error", False),
                    "cancelled": task_data.get("cancelled", False),
                    "download_title": task_data.get("download_title"),
                    "download_counts": self._safe_int(
                        task_data.get("download_counts", 0)
                    ),
                    "download_date": task_data.get("download_date"),
                    "deleted": task_data.get("deleted", ""),
                    "pid": self._safe_int(task_data.get("pid")),
                    "created_at": datetime.strptime(
                        task_data.get("task_id"), "%Y-%m-%d_%H.%M.%S.%f"
                    ).replace(tzinfo=timezone.utc),
                }

                # Handle timestamps
                aligned = self.parse_mongo_date(task_data.get("aligned"))
                if aligned:
                    task_fields["aligned"] = aligned

                if dry_run:
                    logger.info(
                        f"[DRY RUN] Would create task: {task_fields['task_id']}"
                    )
                else:
                    task = Task(**task_fields)
                    db.session.add(task)
                    db.session.flush()  # Get the task ID

                    # Handle task paths (files)
                    task_paths = task_data.get("task_paths", [])
                    if task_paths and isinstance(task_paths, list):
                        for path_pair in task_paths:
                            if isinstance(path_pair, list) and len(path_pair) >= 2:
                                # Audio file
                                if path_pair[0]:
                                    task_file = TaskFile(
                                        task_id=task.id,
                                        file_type=FileType.AUDIO,
                                        file_path=path_pair[0],
                                        original_filename=os.path.basename(
                                            path_pair[0]
                                        ),
                                    )
                                    db.session.add(task_file)

                                # TextGrid file
                                if path_pair[1]:
                                    task_file = TaskFile(
                                        task_id=task.id,
                                        file_type=FileType.TEXTGRID,
                                        file_path=path_pair[1],
                                        original_filename=os.path.basename(
                                            path_pair[1]
                                        ),
                                    )
                                    db.session.add(task_file)

                    # Handle held paths
                    held_paths = task_data.get("held_paths", [])
                    if held_paths and isinstance(held_paths, list):
                        for held_path in held_paths:
                            if held_path:
                                task_file = TaskFile(
                                    task_id=task.id,
                                    file_type=FileType.HELD,
                                    file_path=held_path,
                                    original_filename=os.path.basename(held_path),
                                )
                                db.session.add(task_file)

                    # Handle file names
                    file_names = task_data.get("file_names", {})
                    if file_names and isinstance(file_names, dict):
                        for file_key, original_name in file_names.items():
                            task_filename = TaskFileName(
                                task_id=task.id,
                                file_key=file_key,
                                original_name=original_name,
                            )
                            db.session.add(task_filename)

                    logger.info(f"Created task: {task_fields['task_id']}")

                loaded_count += 1

                # Commit every 100 records to avoid memory issues
                if not dry_run and loaded_count % 100 == 0:
                    db.session.commit()
                    logger.info(f"Committed batch of 100 tasks (total: {loaded_count})")

            except Exception as e:
                logger.error(f"Error processing task {i}: {e}")
                logger.error(f"Task data: {task_data}")
                if not dry_run:
                    db.session.rollback()
                skipped_count += 1
                continue

        if not dry_run:
            db.session.commit()
            logger.info(
                f"Successfully loaded {loaded_count} tasks, skipped {skipped_count}"
            )
        else:
            logger.info(
                f"[DRY RUN] Would load {loaded_count} tasks, skip {skipped_count}"
            )

        return loaded_count


def main():
    parser = argparse.ArgumentParser(description="Load production data from JSON files")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be inserted without actually inserting",
    )
    parser.add_argument(
        "--users-only", action="store_true", help="Only load users data"
    )
    parser.add_argument(
        "--tasks-only", action="store_true", help="Only load tasks data"
    )

    args = parser.parse_args()

    try:
        # Create Flask app
        app = create_app()

        with app.app_context():
            loader = ProductionDataLoader(app)

            # Validate files exist
            loader.validate_files()

            if args.dry_run:
                logger.info("=== DRY RUN MODE - NO CHANGES WILL BE MADE ===")

            # Load data
            if not args.tasks_only:
                users_loaded = loader.load_users(dry_run=args.dry_run)
                logger.info(f"Users processing complete: {users_loaded} records")

            if not args.users_only:
                tasks_loaded = loader.load_tasks(dry_run=args.dry_run)
                logger.info(f"Tasks processing complete: {tasks_loaded} records")

            if args.dry_run:
                logger.info("=== DRY RUN COMPLETE - NO CHANGES WERE MADE ===")
            else:
                logger.info("=== DATA LOADING COMPLETE ===")

    except DataLoadError as e:
        logger.error(f"Data loading error: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
