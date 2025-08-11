#!/usr/bin/env python3
"""
Real-time Upload Worker for Autophon
Processes upload tasks immediately for near-instant user experience:
- Very frequent polling (0.1-2 seconds) for real-time processing
- SQLAlchemy integration
- Concurrent upload processing
- Enhanced error handling and retry logic
- Real-time status updates
"""

import os
import sys
import time
import signal
import traceback
import threading
from typing import List
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor

# Setup Flask app context
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.models import Task, TaskFile, TaskStatus, FileType
from app.utils.logger import get_logger
from app.utils.uploads import uploaderOps

# Third-party imports
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Configuration for real-time processing
UPLOADS = os.getenv("UPLOADS")
LOGS = os.getenv("LOGS")

# Upload worker configuration - optimized for real-time
MAX_UPLOAD_WORKERS = int(os.getenv("UPLOAD_WORKERS", "3"))
MIN_POLL_INTERVAL = 0.1  # 100ms for near-instant response
MAX_POLL_INTERVAL = 2.0  # 2 seconds max when idle
POLL_BACKOFF_FACTOR = 1.3  # Gentle backoff

# Global state
app = create_app()
logger = get_logger(__name__)
shutdown_requested = threading.Event()


class UploadWorkerConfig:
    """Configuration for the upload worker optimized for real-time processing"""

    def __init__(self):
        self.max_workers = MAX_UPLOAD_WORKERS
        self.min_poll_interval = MIN_POLL_INTERVAL
        self.max_poll_interval = MAX_POLL_INTERVAL
        self.poll_backoff_factor = POLL_BACKOFF_FACTOR
        self.retry_attempts = 2  # Quick retries for uploads
        self.retry_delay = 1  # Fast retry for real-time feel


class UploadTaskProcessor:
    """Handles individual upload task processing with real-time optimization"""

    def __init__(self, config: UploadWorkerConfig):
        self.config = config

    def update_task_status(self, task: Task, status: TaskStatus, **kwargs):
        """Update task status with real-time feedback"""
        try:
            with app.app_context():
                task_obj = Task.query.filter_by(task_id=task.task_id).first()
                if task_obj:
                    task_obj.task_status = status
                    for key, value in kwargs.items():
                        setattr(task_obj, key, value)
                    task_obj.update()
                    logger.info(f"Task {task.task_id} status updated to {status.value}")
        except Exception as e:
            logger.error(f"Failed to update task status: {e}")

    def validate_upload_task(self, task: Task) -> bool:
        """Validate upload task has required fields"""
        try:
            if not task.task_id:
                logger.error("Upload task missing task_id")
                return False

            if not task.user_id:
                logger.error(f"Upload task {task.task_id} missing user_id")
                return False

            return True

        except Exception as e:
            logger.error(f"Upload task validation failed: {e}")
            return False

    def process_upload_with_retry(self, task: Task) -> bool:
        """Process upload task with quick retry for real-time feel"""
        for attempt in range(self.config.retry_attempts):
            try:
                logger.info(f"Processing upload {task.task_id} (attempt {attempt + 1})")
                self.update_task_status(task, TaskStatus.PROCESSING, pid=os.getpid())

                success = self.process_upload(task)

                if success:
                    logger.info(f"Upload {task.task_id} processed successfully")
                    return True
                else:
                    logger.warning(
                        f"Upload {task.task_id} failed, attempt {attempt + 1}"
                    )

            except Exception as e:
                logger.error(f"Upload {task.task_id} failed with exception: {e}")
                logger.error(traceback.format_exc())

            if attempt < self.config.retry_attempts - 1:
                time.sleep(self.config.retry_delay)

        # All attempts failed
        self.update_task_status(task, TaskStatus.FAILED, pre_error=True)
        return False

    def process_upload(self, task: Task) -> bool:
        """Process the upload using the existing uploaderOps function"""
        try:
            # Validate task
            if not self.validate_upload_task(task):
                return False

            logger.info(f"Processing upload for task {task.task_id}")

            # Get upload files from database - we need to adapt this based on your current upload structure
            with app.app_context():
                # For now, we'll call uploaderOps with the task data
                # This might need adjustment based on your current upload workflow
                result = self.call_uploader_ops(task)

                if result and result.get("success", False):
                    # Update task status to uploaded and ready for alignment
                    self.update_task_status(
                        task, TaskStatus.UPLOADED, processed=datetime.now(timezone.utc)
                    )
                    logger.info(
                        f"Upload task {task.task_id} completed - ready for alignment"
                    )
                    return True
                else:
                    logger.error(
                        f"Upload processing failed for task {task.task_id}: {result.get('msg', 'Unknown error')}"
                    )
                    return False

        except Exception as e:
            logger.error(f"Upload processing failed for task {task.task_id}: {e}")
            logger.error(traceback.format_exc())
            return False

    def call_uploader_ops(self, task: Task):
        """Call the existing uploaderOps function with proper parameters"""
        try:
            with app.app_context():
                # Get task files that need processing
                task_files = TaskFile.query.filter_by(task_id=task.id).all()

                if not task_files:
                    logger.warning(f"No files found for upload task {task.task_id}")
                    return {"success": True, "msg": "No files to process"}

                # Prepare file groups for uploaderOps based on the current structure
                files = self.prepare_file_groups_for_uploader_ops(task_files, task)

                if not files:
                    logger.warning(
                        f"No valid file groups found for task {task.task_id}"
                    )
                    return {"success": True, "msg": "No valid file groups"}

                # Get the working user ID (handle both authenticated and anonymous users)
                working_user_id = str(task.user_id) if task.user_id else "anonymous"

                logger.info(
                    f"Processing upload task {task.task_id} with {len(files)} file groups"
                )
                logger.debug(f"Working user ID: {working_user_id}")

                # Call the existing uploaderOps function with the current interface
                result = uploaderOps(
                    files=files,
                    user_id=working_user_id,
                    task_id=task.task_id,
                    upload_log=task.log_path,
                    final_temp=None,
                )

                # Handle the result
                if isinstance(result, dict):
                    return result
                else:
                    # uploaderOps might not return anything on success
                    return {"success": True, "msg": "Upload processing completed"}

        except Exception as e:
            logger.error(f"Error calling uploaderOps for task {task.task_id}: {e}")
            logger.error(traceback.format_exc())
            return {"success": False, "msg": str(e)}

    def prepare_file_groups_for_uploader_ops(self, task_files, task: Task):
        """Prepare file groups for uploaderOps function matching current system"""
        try:
            # The uploaderOps function expects a list of file groups
            # Each file group is a list of file paths that belong together (audio + textgrid)

            # Check if this is a batch task or individual tasks
            if task.trans_choice in ["exp-a", "comp-ling"]:
                # Batch mode: group by original file grouping
                return self._prepare_batch_file_groups(task_files)
            else:
                # Individual mode: group files by base name
                return self._prepare_individual_file_groups(task_files)

        except Exception as e:
            logger.error(f"Error preparing file groups for task {task.task_id}: {e}")
            return []

    def _prepare_batch_file_groups(self, task_files):
        """Prepare file groups for batch processing (exp-a, comp-ling)"""
        try:
            # For batch mode, all files should be processed together
            # Group by file key patterns if available, otherwise by base name
            groups = {}

            for tf in task_files:
                if tf.file_type in [FileType.AUDIO, FileType.TEXTGRID]:
                    # Extract group identifier from file_key if available
                    if tf.file_key and "group_" in tf.file_key:
                        # file_key format: "group_0_file_0", "group_0_file_1", etc.
                        parts = tf.file_key.split("_")
                        if len(parts) >= 2:
                            group_key = f"group_{parts[1]}"
                        else:
                            group_key = "group_0"
                    else:
                        # Fallback to base name grouping
                        group_key = os.path.splitext(os.path.basename(tf.file_path))[0]

                    if group_key not in groups:
                        groups[group_key] = []
                    groups[group_key].append(tf.file_path)

            # Convert to list of file groups
            file_groups = []
            for group_key, paths in groups.items():
                if len(paths) >= 1:  # At least one file needed
                    file_groups.append(paths)
                else:
                    logger.warning(f"Empty file group for {group_key}")

            logger.debug(f"Created {len(file_groups)} batch file groups")
            return file_groups

        except Exception as e:
            logger.error(f"Error preparing batch file groups: {e}")
            return []

    def _prepare_individual_file_groups(self, task_files):
        """Prepare file groups for individual processing (var-ling, exp-b)"""
        try:
            # Group files by base name (audio + textgrid pairs)
            groups = {}

            for tf in task_files:
                if tf.file_type in [FileType.AUDIO, FileType.TEXTGRID]:
                    base_name = os.path.splitext(os.path.basename(tf.file_path))[0]
                    if base_name not in groups:
                        groups[base_name] = []
                    groups[base_name].append(tf.file_path)

            # Convert to list of file groups (each group should have audio + textgrid)
            file_groups = []
            for base_name, paths in groups.items():
                if len(paths) >= 1:  # At least one file needed
                    file_groups.append(paths)
                elif len(paths) == 1:
                    # Single file - might be just audio or just textgrid
                    logger.warning(f"Single file in group {base_name}: {paths}")
                    file_groups.append(paths)  # Still include it

            logger.debug(f"Created {len(file_groups)} individual file groups")
            return file_groups

        except Exception as e:
            logger.error(f"Error preparing individual file groups: {e}")
            return []


class UploadWorker:
    """Real-time upload worker with very frequent polling"""

    def __init__(self, config: UploadWorkerConfig):
        self.config = config
        self.processor = UploadTaskProcessor(config)
        self.current_poll_interval = config.min_poll_interval
        self.executor = ThreadPoolExecutor(
            max_workers=config.max_workers, thread_name_prefix="UploadWorker"
        )
        self.active_tasks = set()
        self.stats = {
            "uploads_processed": 0,
            "uploads_succeeded": 0,
            "uploads_failed": 0,
            "start_time": datetime.now(),
            "last_upload_time": None,
            "peak_active_uploads": 0,
            "avg_processing_time": 0,
        }
        logger.info(
            f"Real-time UploadWorker initialized with {config.max_workers} max workers"
        )

    def signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully"""
        logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        shutdown_requested.set()

        # Cancel active uploads
        for task_id in list(self.active_tasks):
            logger.info(f"Cancelling active upload: {task_id}")
            # Reset task status back to pending for retry
            with app.app_context():
                task = Task.query.filter_by(task_id=task_id).first()
                if task:
                    self.processor.update_task_status(
                        task, TaskStatus.PENDING, cancelled=True
                    )

        # Shutdown executor
        self.executor.shutdown(wait=True)
        logger.info("Upload worker graceful shutdown completed")
        sys.exit(0)

    def get_pending_uploads(self) -> List[Task]:
        """Get tasks that need upload processing"""
        try:
            with app.app_context():
                # Look for tasks in UPLOADING status
                tasks = (
                    Task.query.filter(
                        Task.task_status == TaskStatus.UPLOADING,
                        Task.deleted.is_(None),
                        Task.cancelled != True,
                    )
                    .order_by(Task.created_at)
                    .all()
                )

                # Filter out tasks already being processed
                available_tasks = [
                    t for t in tasks if t.task_id not in self.active_tasks
                ]

                return available_tasks
        except Exception as e:
            logger.error(f"Error getting pending uploads: {e}")
            return []

    def adjust_poll_interval(self, tasks_found: int):
        """Adjust polling interval - stay very responsive for uploads"""
        if tasks_found > 0:
            # Keep at minimum for real-time processing
            self.current_poll_interval = self.config.min_poll_interval
        else:
            # Gentle backoff when idle, but stay responsive
            self.current_poll_interval = min(
                self.current_poll_interval * self.config.poll_backoff_factor,
                self.config.max_poll_interval,
            )

    def process_upload_async(self, task: Task):
        """Process an upload task asynchronously"""

        def task_wrapper():
            start_time = time.time()
            try:
                self.active_tasks.add(task.task_id)
                success = self.processor.process_upload_with_retry(task)

                # Calculate processing time
                processing_time = time.time() - start_time

                # Update statistics
                self.stats["uploads_processed"] += 1
                self.stats["last_upload_time"] = datetime.now()

                # Update average processing time
                if self.stats["uploads_processed"] == 1:
                    self.stats["avg_processing_time"] = processing_time
                else:
                    self.stats["avg_processing_time"] = (
                        self.stats["avg_processing_time"]
                        * (self.stats["uploads_processed"] - 1)
                        + processing_time
                    ) / self.stats["uploads_processed"]

                if success:
                    self.stats["uploads_succeeded"] += 1
                    logger.info(
                        f"Upload {task.task_id} completed successfully in {processing_time:.2f}s"
                    )
                else:
                    self.stats["uploads_failed"] += 1
                    logger.error(
                        f"Upload {task.task_id} failed after {processing_time:.2f}s"
                    )

            except Exception as e:
                logger.error(f"Upload task wrapper error: {e}")
                self.stats["uploads_failed"] += 1
            finally:
                self.active_tasks.discard(task.task_id)

        return self.executor.submit(task_wrapper)

    def log_stats(self):
        """Log upload worker statistics"""
        uptime = datetime.now() - self.stats["start_time"]
        success_rate = (
            (self.stats["uploads_succeeded"] / self.stats["uploads_processed"] * 100)
            if self.stats["uploads_processed"] > 0
            else 0
        )

        # Update peak active uploads
        current_active = len(self.active_tasks)
        if current_active > self.stats["peak_active_uploads"]:
            self.stats["peak_active_uploads"] = current_active

        logger.info(
            f"Upload Worker Stats - Uptime: {uptime}, "
            f"Processed: {self.stats['uploads_processed']}, "
            f"Success: {self.stats['uploads_succeeded']} ({success_rate:.1f}%), "
            f"Failed: {self.stats['uploads_failed']}, "
            f"Active: {current_active}/{self.config.max_workers}, "
            f"Peak: {self.stats['peak_active_uploads']}, "
            f"Avg Time: {self.stats['avg_processing_time']:.2f}s, "
            f"Poll Interval: {self.current_poll_interval:.3f}s"
        )

        # Log last upload time if available
        if self.stats["last_upload_time"]:
            time_since_last = datetime.now() - self.stats["last_upload_time"]
            logger.debug(f"Time since last upload: {time_since_last}")

    def run(self):
        """Main worker loop - optimized for real-time processing"""
        logger.info("Real-time upload worker started - monitoring for uploads...")

        # Setup signal handlers
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)

        last_stats_time = datetime.now()

        while not shutdown_requested.is_set():
            try:
                # Get pending uploads
                pending_uploads = self.get_pending_uploads()

                if pending_uploads:
                    logger.debug(f"Found {len(pending_uploads)} pending uploads")

                # Process available uploads immediately (respect worker limits)
                available_slots = self.config.max_workers - len(self.active_tasks)
                uploads_to_process = pending_uploads[:available_slots]

                for task in uploads_to_process:
                    logger.info(
                        f"Starting upload processing: {task.task_id} (slot {len(self.active_tasks) + 1}/{self.config.max_workers})"
                    )
                    self.process_upload_async(task)

                # Adjust polling interval - stay very responsive
                self.adjust_poll_interval(len(pending_uploads))

                # Log stats every 30 seconds (more frequent than alignment worker)
                if (datetime.now() - last_stats_time).total_seconds() >= 30:
                    self.log_stats()
                    last_stats_time = datetime.now()

                # Very short wait before next poll for real-time feel
                shutdown_requested.wait(self.current_poll_interval)

            except Exception as e:
                logger.error(f"Upload worker loop error: {e}")
                logger.error(traceback.format_exc())
                time.sleep(1)  # Brief pause on errors

        logger.info("Upload worker stopped")


def validate_upload_environment():
    """Validate environment for upload worker"""
    errors = []
    warnings = []

    # Required environment variables
    required_vars = {
        "UPLOADS": UPLOADS,
        "LOGS": LOGS,
    }

    for var_name, var_value in required_vars.items():
        if not var_value:
            errors.append(f"Missing required environment variable: {var_name}")
        elif not os.path.exists(var_value):
            errors.append(f"Path does not exist for {var_name}: {var_value}")

    # Check database connection
    try:
        with app.app_context():
            # Test database connection
            Task.query.first()
            logger.info("Database connection successful")
    except Exception as e:
        errors.append(f"Database connection failed: {e}")

    # Report results
    if errors:
        for error in errors:
            logger.error(f"Upload environment validation error: {error}")
        return False

    if warnings:
        for warning in warnings:
            logger.warning(f"Upload environment validation warning: {warning}")

    logger.info("Upload environment validation completed")
    return True


def main():
    """Main entry point for real-time upload worker"""
    try:
        # Setup logging directory
        os.makedirs(LOGS, exist_ok=True)

        logger.info("Starting Autophon Real-time Upload Worker")
        logger.info(f"Worker PID: {os.getpid()}")
        logger.info(f"Real-time polling: {MIN_POLL_INTERVAL}s - {MAX_POLL_INTERVAL}s")

        # Validate environment
        if not validate_upload_environment():
            logger.error("Upload environment validation failed - exiting")
            sys.exit(1)

        # Create worker configuration
        config = UploadWorkerConfig()
        logger.info(
            f"Upload worker configuration: max_workers={config.max_workers}, "
            f"poll_interval={config.min_poll_interval}-{config.max_poll_interval}s"
        )

        # Create and run worker
        worker = UploadWorker(config)
        worker.run()

    except KeyboardInterrupt:
        logger.info("Upload worker interrupted by user")
        sys.exit(0)
    except SystemExit:
        raise  # Re-raise SystemExit
    except Exception as e:
        logger.error(f"Upload worker failed: {e}")
        logger.error(traceback.format_exc())
        sys.exit(1)
    finally:
        logger.info("Upload worker shutdown complete")


if __name__ == "__main__":
    main()
