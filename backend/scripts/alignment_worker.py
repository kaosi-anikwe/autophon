#!/usr/bin/env python3
"""
Optimized Alignment Worker for Autophon
Replaces the old sniffer.py with improved architecture:
- Dynamic polling with exponential backoff
- SQLAlchemy integration
- Concurrent task processing
- Enhanced error handling and retry logic
- Proper resource management
"""

import os
import sys
import time
import json
import shutil
import signal
import zipfile
import traceback
import threading
import shlex
from typing import List
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor

# Setup Flask app context
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.models import Task, TaskFile, TaskStatus, FileType, Engine, Language
from app.utils.logger import get_logger

# Third-party imports
from praatio import textgrid
from dotenv import load_dotenv
from praatio.utilities.constants import Interval

# Load environment
load_dotenv()

# Configuration
ADMIN = os.getenv("ADMIN")
UPLOADS = os.getenv("UPLOADS")
CURRENT_DIR = os.getenv("CURRENT_DIR")
PHONE_REPLACEMENT = os.getenv("PHONE_REPLACEMENT")
CONDA_ENV = os.getenv("APP_CONDA_ENV")
LOGS = os.getenv("LOG_DIR")
VALIDATOR = os.getenv("VALIDATOR")


# Worker configuration
MAX_WORKERS = int(os.getenv("ALIGNMENT_WORKERS", "1"))
MIN_POLL_INTERVAL = 1  # seconds
MAX_POLL_INTERVAL = 30  # seconds
POLL_BACKOFF_FACTOR = 1.5

# Global state
app = create_app()
logger = get_logger(__name__)
shutdown_requested = threading.Event()


class AlignmentWorkerConfig:
    """Configuration for the alignment worker"""

    def __init__(self):
        self.max_workers = MAX_WORKERS
        self.min_poll_interval = MIN_POLL_INTERVAL
        self.max_poll_interval = MAX_POLL_INTERVAL
        self.poll_backoff_factor = POLL_BACKOFF_FACTOR
        self.retry_attempts = 3
        self.retry_delay = 5  # seconds


class TaskProcessor:
    """Handles individual task processing with error handling and retry logic"""

    def __init__(self, config: AlignmentWorkerConfig):
        self.config = config
        self.engine_cache = {}  # Cache engines to reduce database queries
        self.language_cache = {}  # Cache language info

    def get_language_info(self, lang_code: str) -> dict:
        """Get language information from database"""
        try:
            # Check cache first
            if lang_code in self.language_cache:
                return self.language_cache[lang_code]

            with app.app_context():
                # Find language by code
                language = Language.query.filter_by(code=lang_code).first()

                if language:
                    lang_info = {
                        "id": language.id,
                        "full_name": language.language_name,
                        "alphabet": language.alphabet or "",
                        "code": language.code,
                    }

                    # Cache the result
                    self.language_cache[lang_code] = lang_info
                    return lang_info
                else:
                    # Fallback: try to parse from langs.json if database entry not found
                    logger.warning(
                        f"Language {lang_code} not found in database, trying langs.json"
                    )
                    return self._get_language_from_json(lang_code)

        except Exception as e:
            logger.error(f"Failed to get language info from database: {e}")
            return self._get_language_from_json(lang_code)

    def _get_language_from_json(self, lang_code: str) -> dict:
        """Fallback method to get language info from JSON file"""
        langs_file = os.path.join(ADMIN, "langs.json")
        try:
            with open(langs_file, "r") as f:
                langs_dict = json.load(f)

            for lang in langs_dict.get("langs", []):
                if lang_code in lang:
                    return {
                        "full_name": lang[lang_code],
                        "alphabet": lang.get("alphabet", ""),
                        "code": lang_code,
                    }
        except (FileNotFoundError, json.JSONDecodeError) as e:
            logger.error(f"Failed to load language info from JSON: {e}")

        return {"full_name": lang_code, "alphabet": "", "code": lang_code}

    def get_engine_info(self, task: Task) -> dict:
        """Get engine information from database"""
        try:
            # Check cache first
            engine_id = task.engine_id
            if engine_id in self.engine_cache:
                return self.engine_cache[engine_id]

            with app.app_context():
                engine = Engine.query.filter_by(id=engine_id, is_active=True).first()

                if engine:
                    engine_info = {
                        "id": engine.id,
                        "code": engine.code,
                        "name": engine.name,
                        "path": engine.path,
                        "documentation_link": engine.documentation_link,
                    }

                    # Cache the result
                    self.engine_cache[engine_id] = engine_info
                    return engine_info
                else:
                    # Fallback to MFA1 if engine not found
                    logger.error(f"Engine with ID {engine_id} not found or inactive")
                    return self._get_default_engine()

        except Exception as e:
            logger.error(f"Failed to get engine info from database: {e}")
            return self._get_default_engine()

    def _get_default_engine(self) -> dict:
        """Get default engine as fallback"""
        with app.app_context():
            default_engine = Engine.query.filter_by(code="MFA1", is_active=True).first()
            if default_engine:
                return {
                    "id": default_engine.id,
                    "code": default_engine.code,
                    "name": default_engine.name,
                    "path": default_engine.path,
                    "documentation_link": default_engine.documentation_link,
                }
            else:
                # Last resort fallback
                logger.error("No default engine found in database")
                return {
                    "id": None,
                    "code": "MFA1",
                    "name": "Montreal Forced Alignment v1",
                    "path": os.getenv("MFA1", "/usr/local/bin/mfa_align"),
                    "documentation_link": None,
                }

    def merge_dicts(self, temp_path: str, user_dict_path: str) -> None:
        """Merge user dictionary with language dictionary"""
        temp_file_path = temp_path + ".tmp"
        with open(temp_path, "r") as dict_file, open(
            user_dict_path, "r"
        ) as user_dict, open(temp_file_path, "w") as temp_file:
            logger.debug("Merging dictionaries")
            user_dict_lines = user_dict.readlines()
            user_dict_lines = [line for line in user_dict_lines if line.strip()]
            user_words = [
                line.split()[0].lower() for line in user_dict_lines if line.split()
            ]
            # Iterate over the lines in the original file
            for dict_line in dict_file:
                if dict_line.split():
                    if dict_line.split()[0].lower() in user_words:
                        index = user_words.index(dict_line.split()[0].lower())
                        # Replace the line if it matches the line number
                        logger.debug(f"Matching word: {dict_line.split()[0]}")
                        temp_file.write(user_dict_lines[index])
                    else:
                        # Copy the original line to the temporary file
                        temp_file.write(dict_line)

        # Replace the original file with the temporary file
        os.replace(temp_file_path, temp_path)
        logger.debug("Dictionary merge completed")

        # Add user dict to temp dict
        with open(temp_path, "a") as temp_dict:
            temp_dict.writelines(user_dict_lines)

        # Sort to remove duplicate lines
        import subprocess

        subprocess.run(
            f'sort -u "{temp_path}" -o "{temp_path}"', shell=True, check=True
        )

    def fave_dict_prep(self, dict_path: str) -> str:
        """Prepare dictionary for FAVE alignment"""
        prepped = False
        with open(dict_path, "r") as infile, open(f"{dict_path}.tmp", "a+") as outfile:
            for line in infile:
                if "\t" not in line:
                    prepped = True
                    logger.debug(f"{dict_path} already prepped for FAVE-align")
                    break
                # Replace tab with 2 spaces and capitalize line
                outfile.write(line.upper().replace("\t", "  "))
            if not prepped:
                outfile.write("sp  sp\n")
                logger.debug(f"Done prepping {dict_path} for FAVE-align")

        if not prepped:
            os.replace(f"{dict_path}.tmp", dict_path)
        return dict_path

    def fase_dict_prep(self, dict_path: str) -> str:
        """Prepare dictionary for FASE alignment"""
        prepped = False
        with open(dict_path, "r") as infile, open(f"{dict_path}.tmp", "a+") as outfile:
            for line in infile:
                if "\t" not in line:
                    prepped = True
                    logger.debug(f"{dict_path} already prepped for faseAlign")
                    break
                # Replace tab with space and capitalize word only
                columns = line.split("\t")
                if columns[0] == "sp":
                    outfile.write(line.replace("\t", " "))
                else:
                    outfile.write(f"{columns[0].upper()} {columns[1]}")
            if not prepped:
                logger.debug(f"Done prepping {dict_path} for faseAlign")

        if not prepped:
            os.replace(f"{dict_path}.tmp", dict_path)
        return dict_path

    def parse_textgrid(self, textgrid_path: str):
        """Parse TextGrid for FAVE alignment"""
        intervals = []
        speaker = None
        with open(textgrid_path, "r") as file:
            lines = file.readlines()

        for i, line in enumerate(lines):
            line = line.strip()
            if line.startswith("name = "):
                speaker = line.split("=")[1].strip().strip('"')
            elif line.startswith("xmin = "):
                xmin = float(line.split("=")[1].strip())
            elif line.startswith("xmax = "):
                xmax = float(line.split("=")[1].strip())
            elif line.startswith("text = "):
                text = line.split("=")[1].strip().strip('"')
                if text:
                    intervals.append((xmin, xmax, text))

        return speaker, intervals

    def tg_to_tsv(self, speaker: str, intervals: list, output_path: str):
        """Convert TextGrid to TSV format for FAVE"""
        with open(output_path, "w") as file:
            for xmin, xmax, text in intervals:
                # Format for FAVE-align
                file.write(f"{speaker}\t{speaker}\t{xmin}\t{xmax}\t{text}\n")

    def tg_lower(self, fp: str):
        """Convert TextGrid labels to lowercase for FASE"""
        tg = textgrid.openTextgrid(fp, includeEmptyIntervals=True)
        for tier_name in tg.tierNames:
            tier = tg.getTier(tier_name)
            # Create a new list of intervals with text converted to lowercase
            updated_intervals = [
                Interval(start=start, end=end, label=label.lower())
                for start, end, label in tier.entries
            ]
            new_tier = textgrid.IntervalTier(
                name=tier.name,
                entries=updated_intervals,
                minT=tier.minTimestamp,
                maxT=tier.maxTimestamp,
            )
            # Replace the old tier with the updated one
            tg.replaceTier(tier_name, new_tier)
            tg.save(fp, includeBlankSpaces=True, format="long_textgrid")

    def update_task_status(self, task: Task, status: TaskStatus, **kwargs):
        """Update task status with additional fields"""
        try:
            with app.app_context():
                task_obj = Task.query.filter_by(task_id=task.task_id).first()
                if task_obj:
                    task_obj.task_status = status
                    for key, value in kwargs.items():
                        setattr(task_obj, key, value)
                    task_obj.update()
                    logger.info(f"Task {task.task_id} status updated to {status.value}")
                    return True
                else:
                    logger.error(f"Task {task.task_id} not found in database")
                    return False
        except Exception as e:
            logger.error(f"Failed to update task status for {task.task_id}: {e}")
            return False

    def cleanup_task_files(self, task: Task):
        """Clean up task files after processing with improved error handling"""
        cleanup_paths = []

        try:
            with app.app_context():
                corpus_folder = (
                    os.path.join(UPLOADS, task.task_path) if task.task_path else None
                )

                # Collect all paths to clean up
                if corpus_folder:
                    cleanup_paths.extend(
                        [
                            corpus_folder,
                            f"{corpus_folder}_aligned",
                            os.path.join(corpus_folder, "temp"),
                        ]
                    )

                # Add held transcript files
                held_files = TaskFile.query.filter_by(
                    task_id=task.id, file_type=FileType.HELD
                ).all()

                for held_file in held_files:
                    if held_file.file_path:
                        cleanup_paths.append(held_file.file_path)
                        # Also add parent directory for potential cleanup
                        parent_dir = os.path.dirname(held_file.file_path)
                        if parent_dir not in cleanup_paths:
                            cleanup_paths.append(parent_dir)

                # Clean up MFA Documents folder
                documents_folder = "/home/nordalign/Documents/MFA"
                mfa_task_folder = os.path.join(documents_folder, task.task_id)
                if os.path.exists(mfa_task_folder):
                    cleanup_paths.append(mfa_task_folder)

                # Perform cleanup with individual error handling
                self._safe_cleanup_paths(cleanup_paths)

        except Exception as e:
            logger.error(f"Error during cleanup preparation: {e}")
            logger.error(traceback.format_exc())

    def _safe_cleanup_paths(self, paths: list):
        """Safely clean up a list of paths with individual error handling"""
        for path in paths:
            try:
                if not path or not os.path.exists(path):
                    continue

                # Sanitize path to prevent directory traversal
                safe_path = os.path.abspath(path)
                if not safe_path.startswith(UPLOADS) and not safe_path.startswith(
                    "/home/nordalign/Documents/MFA"
                ):
                    logger.warning(
                        f"Skipping cleanup of path outside allowed directories: {safe_path}"
                    )
                    continue

                if os.path.isfile(path):
                    os.remove(path)
                    logger.debug(f"Deleted file: {path}")

                    # Try to remove empty parent directory
                    parent_dir = os.path.dirname(path)
                    if os.path.exists(parent_dir) and not os.listdir(parent_dir):
                        try:
                            os.rmdir(parent_dir)
                            logger.debug(f"Deleted empty directory: {parent_dir}")
                        except OSError:
                            pass  # Directory not empty or permission issue

                elif os.path.isdir(path):
                    shutil.rmtree(path)
                    logger.debug(f"Deleted directory: {path}")

            except OSError as e:
                logger.warning(f"Failed to delete {path}: {e}")
            except Exception as e:
                logger.error(f"Unexpected error cleaning up {path}: {e}")

    def process_task_with_retry(self, task: Task) -> bool:
        """Process a task with retry logic"""
        for attempt in range(self.config.retry_attempts):
            try:
                logger.info(f"Processing task {task.task_id} (attempt {attempt + 1})")
                self.update_task_status(task, TaskStatus.PROCESSING, pid=os.getpid())

                success = self.align_task(task)

                if success:
                    logger.info(f"Task {task.task_id} completed successfully")
                    return True
                else:
                    logger.warning(f"Task {task.task_id} failed, attempt {attempt + 1}")

            except Exception as e:
                logger.error(f"Task {task.task_id} failed with exception: {e}")
                logger.error(traceback.format_exc())

            if attempt < self.config.retry_attempts - 1:
                time.sleep(self.config.retry_delay * (attempt + 1))

        # All attempts failed
        status_updated = self.update_task_status(task, TaskStatus.FAILED)
        if not status_updated:
            logger.critical(f"Failed to update task {task.task_id} to FAILED status - this may cause infinite retry loop!")
        logger.error(f"Alignment task {task.task_id} failed after {self.config.retry_attempts} attempts")
        return False

    def align_task(self, task: Task) -> bool:
        """Main task alignment logic - complete implementation"""
        import subprocess
        import re

        try:
            # Validate task
            if not self._validate_task(task):
                return False

            # Get language and engine information from database
            lang_code = (
                task.lang.replace("(suggested)", "").strip() if task.lang else ""
            )
            lang_info = self.get_language_info(lang_code)
            engine_info = self.get_engine_info(task)

            logger.info(
                f"Aligning task {task.task_id} with language {lang_code} ({lang_info['full_name']}), engine: {engine_info['code']} ({engine_info['name']})"
            )

            # Get task details from database
            with app.app_context():
                task_files = TaskFile.query.filter_by(task_id=task.id).all()
                held_files = [tf for tf in task_files if tf.file_type == FileType.HELD]

                if not task_files:
                    logger.error(f"Task {task.task_id} missing required files")
                    return False

                # Setup paths
                corpus_folder = os.path.join(UPLOADS, task.task_path)
                align_folder = f"{corpus_folder}_aligned"
                Path(align_folder).mkdir(parents=True, exist_ok=True)

                # Create sub directories
                ipa_folder = os.path.join(align_folder, "IPA")
                os.makedirs(ipa_folder, exist_ok=True)
                lang_folder = os.path.join(align_folder, lang_info["alphabet"])
                os.makedirs(lang_folder, exist_ok=True)

                # Copy support files
                self._copy_support_files(
                    task, align_folder, lang_code, lang_info["full_name"]
                )

                # Prepare dictionaries
                temp_dict_path, comp_temp_dict_path = self._prepare_dictionaries(
                    task, lang_code
                )

                # Process each file group (multi-tier TextGrids)
                success = self._perform_alignment_processing(
                    task,
                    corpus_folder,
                    lang_folder,
                    lang_code,
                    engine_info,
                    temp_dict_path,
                )

                if success:
                    # Perform phone replacement
                    self._perform_phone_replacement(
                        lang_folder, lang_code, comp_temp_dict_path, engine_info["code"]
                    )

                    # Create final output with IPA substitution
                    self._create_final_output(
                        task,
                        align_folder,
                        ipa_folder,
                        lang_folder,
                        lang_code,
                        held_files,
                        engine_info["code"],
                    )

                    # Package results
                    output_path = self._package_results(task, align_folder)

                    # Cleanup temporary files
                    self._cleanup_temp_files([temp_dict_path, comp_temp_dict_path])

                    # Update task as completed
                    self.update_task_status(
                        task,
                        TaskStatus.COMPLETED,
                        download_path=output_path,
                        aligned=datetime.now(timezone.utc),
                    )
                    return True
                else:
                    self.update_task_status(task, TaskStatus.FAILED)
                    return False

        except Exception as e:
            logger.error(f"Alignment failed for task {task.task_id}: {e}")
            logger.error(traceback.format_exc())
            self.update_task_status(task, TaskStatus.FAILED)

        return False

    def _validate_task(self, task: Task) -> bool:
        """Validate task has all required fields and files"""
        try:
            # Check required fields
            if not task.task_id:
                logger.error("Task missing task_id")
                return False

            if not task.lang:
                logger.error(f"Task {task.task_id} missing language")
                return False

            if not task.engine_id:
                logger.error(f"Task {task.task_id} missing engine_id")
                return False

            if not task.task_path:
                logger.error(f"Task {task.task_id} missing task_path")
                return False

            # Check if task path exists
            task_dir = os.path.join(UPLOADS, task.task_path)
            if not os.path.exists(task_dir):
                logger.error(f"Task directory does not exist: {task_dir}")
                return False

            # Check if task has files
            with app.app_context():
                task_files = TaskFile.query.filter_by(task_id=task.id).all()
                if not task_files:
                    logger.error(f"Task {task.task_id} has no associated files")
                    return False

            return True

        except Exception as e:
            logger.error(f"Task validation failed: {e}")
            return False

    def _copy_support_files(
        self, task: Task, align_folder: str, lang_code: str, full_language: str
    ):
        """Copy support files (README, cite, guide)"""
        try:
            # Copy log file
            log_file_path = (
                task.log_path
                if task.log_path
                else f"{UPLOADS}/{task.task_path}/README.txt"
            )
            if os.path.exists(log_file_path):
                shutil.copy2(log_file_path, f"{align_folder}/README.txt")
                logger.debug(f"Copied log file: {log_file_path}")

            # Copy cite file
            cite_file = os.path.join(ADMIN, lang_code, f"{lang_code}_cite.txt")
            if os.path.exists(cite_file):
                shutil.copy2(cite_file, align_folder)
                logger.debug(f"Copied cite file: {cite_file}")

            # Copy guide file
            guide_file = f"{CURRENT_DIR}/app/static/langs/{lang_code}/{lang_code}.pdf"
            if os.path.exists(guide_file):
                shutil.copy2(
                    guide_file, f"{align_folder}/User guide {full_language}.pdf"
                )
                logger.debug(f"Copied guide file: {guide_file}")

        except Exception as e:
            logger.warning(f"Failed to copy support files: {e}")

    def _prepare_dictionaries(self, task: Task, lang_code: str) -> tuple:
        """Prepare dictionaries for alignment with improved error handling"""
        import subprocess
        import re

        logger.info(f"Preparing dictionaries for language: {lang_code}")

        # Validate inputs
        if not lang_code or not lang_code.strip():
            raise ValueError("Language code cannot be empty")

        # Sanitize language code
        lang_code = re.sub(r"[^a-zA-Z0-9_-]", "", lang_code.strip())

        # Dictionary paths with validation
        dictionary_path = os.path.join(ADMIN, lang_code, f"{lang_code}_simple.dict")
        model_path = os.path.join(ADMIN, lang_code, f"{lang_code}.zip")

        # Validate required files exist
        if not os.path.exists(dictionary_path):
            logger.error(f"Language dictionary not found: {dictionary_path}")
            raise FileNotFoundError(
                f"Dictionary file not found for language {lang_code}"
            )

        if not os.path.exists(model_path):
            logger.error(f"Language model not found: {model_path}")
            raise FileNotFoundError(f"Model file not found for language {lang_code}")

        # User dictionary paths with validation and creation
        user_dict_dir = os.path.join(UPLOADS, str(task.user_uuid), "dic")

        # Ensure user dict directory exists
        try:
            os.makedirs(user_dict_dir, exist_ok=True)
        except OSError as e:
            logger.error(f"Failed to create user dictionary directory: {e}")
            raise

        temp_dict_path = os.path.join(user_dict_dir, "temp.dict")
        user_dict_path = os.path.join(user_dict_dir, f"{lang_code}.dict")

        # Missing pronunciation dictionary
        missingpron_path = getattr(task, "missingprondict", None)

        # Complex to simple phone mapping with validation
        monodup_path = os.path.join(
            ADMIN, lang_code, f"{lang_code}_complex2simple.json"
        )
        replace_phones = {}
        operations = []
        post_operations = []

        # Load phone replacement mappings
        if os.path.exists(monodup_path):
            try:
                with open(monodup_path, "r", encoding="utf-8") as monodup_file:
                    monodup = json.load(monodup_file)
                    if isinstance(monodup, list):
                        for pair in monodup:
                            if (
                                isinstance(pair, dict)
                                and "complex" in pair
                                and "simple" in pair
                            ):
                                replace_phones[pair["complex"]] = pair["simple"]
                    else:
                        logger.warning(
                            f"Invalid format in {monodup_path}: expected list"
                        )
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                logger.error(f"Failed to parse phone mapping file {monodup_path}: {e}")
                # Continue without phone replacement
        else:
            logger.warning(f"Phone replacement file not found: {monodup_path}")

        # Prepare files for phone replacement
        if missingpron_path and os.path.exists(missingpron_path):
            operations.append(missingpron_path)
        if os.path.exists(user_dict_path):
            operations.append(user_dict_path)

        # Compile regex pattern to match phones
        phone_pattern = re.compile(r"([\S]+)")

        # Replace phones in dictionaries with improved error handling
        if replace_phones:
            logger.debug(f"Replacing phones using {len(replace_phones)} mappings...")
            for path in operations:
                temp_op_path = f"{path}.tmp"
                try:
                    with open(path, "r", encoding="utf-8") as file, open(
                        temp_op_path, "w", encoding="utf-8"
                    ) as temp_op_file:
                        for line_num, dict_line in enumerate(file, 1):
                            try:
                                line = dict_line.rstrip("\n")
                                if "\t" in line:
                                    left_column, right_column = line.split("\t", 1)
                                else:
                                    left_column = line
                                    right_column = ""

                                # Function to replace each phone
                                def replace_match(match):
                                    phone = match.group(0)
                                    return replace_phones.get(phone, phone)

                                # Replace phones in right_column
                                right_column = phone_pattern.sub(
                                    replace_match, right_column
                                )
                                # Write the updated line to the temporary file
                                temp_op_file.write(f"{left_column}\t{right_column}\n")
                            except Exception as e:
                                logger.warning(
                                    f"Error processing line {line_num} in {path}: {e}"
                                )
                                # Write original line if processing fails
                                temp_op_file.write(dict_line)

                except (IOError, UnicodeDecodeError) as e:
                    logger.error(f"Error processing dictionary file {path}: {e}")
                    # Skip this file if we can't process it
                    continue

                post_operations.append(temp_op_path)

            # Update paths to use temp files
            if missingpron_path == path:
                missingpron_path = temp_op_path
            if user_dict_path == path:
                user_dict_path = temp_op_path

        # Create merged dictionary
        catfiles = [dictionary_path]

        # Initialize temp dict
        subprocess.run(f' > "{temp_dict_path}"', shell=True, check=True)

        # Add missing pronunciation dict if exists
        if missingpron_path and os.path.exists(missingpron_path):
            catfiles.append(missingpron_path)

        # Merge dictionaries with error handling
        try:
            subprocess.run(
                f'cat {" ".join(shlex.quote(f) for f in catfiles)} >> "{shlex.quote(temp_dict_path)}"',
                shell=True,
                check=True,
                timeout=60,
            )
        except subprocess.TimeoutExpired:
            logger.error("Dictionary merge operation timed out")
            raise
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to merge dictionaries: {e}")
            raise

        # Sort and remove duplicates with error handling
        try:
            subprocess.run(
                f'sort -u "{shlex.quote(temp_dict_path)}" -o "{shlex.quote(temp_dict_path)}"',
                shell=True,
                check=True,
                timeout=120,
            )
        except subprocess.TimeoutExpired:
            logger.error("Dictionary sort operation timed out")
            raise
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to sort dictionary: {e}")
            raise

        # Merge with user dictionary if exists
        if os.path.exists(user_dict_path):
            logger.debug("Merging user dictionary")
            self.merge_dicts(temp_path=temp_dict_path, user_dict_path=user_dict_path)

        # Prepare complex dictionary for phone replacement
        comp_dict_path = f"{ADMIN}/{lang_code}/{lang_code}.dict"
        comp_temp_dict_path = os.path.join(user_dict_dir, "comp_temp.dict")

        # Create complex dictionary
        comp_catfiles = [comp_dict_path]
        subprocess.run(f' > "{comp_temp_dict_path}"', shell=True, check=True)

        # Add missing words to complex dict
        comp_missing_words = getattr(task, "missingprondict", None)
        if comp_missing_words and os.path.exists(comp_missing_words):
            comp_catfiles.append(comp_missing_words)

        try:
            subprocess.run(
                f'cat {" ".join(shlex.quote(f) for f in comp_catfiles)} >> "{shlex.quote(comp_temp_dict_path)}"',
                shell=True,
                check=True,
                timeout=60,
            )
            subprocess.run(
                f'sort -u "{shlex.quote(comp_temp_dict_path)}" -o "{shlex.quote(comp_temp_dict_path)}"',
                shell=True,
                check=True,
                timeout=120,
            )
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError) as e:
            logger.error(f"Failed to prepare complex dictionary: {e}")
            raise

        # Merge complex dict with user dict
        comp_user_dict = os.path.join(user_dict_dir, f"{lang_code}.dict")
        if os.path.exists(comp_user_dict):
            self.merge_dicts(
                temp_path=comp_temp_dict_path, user_dict_path=comp_user_dict
            )

        # Store post operations for cleanup
        self.post_operations = post_operations

        logger.info("Dictionary preparation completed")
        return temp_dict_path, comp_temp_dict_path

    def _perform_alignment_processing(
        self,
        task: Task,
        corpus_folder: str,
        lang_folder: str,
        lang_code: str,
        engine_info: dict,
        temp_dict_path: str,
    ) -> bool:
        """Perform the actual alignment process for all file groups"""
        import subprocess

        try:
            logger.info(
                f"Performing alignment with engine {engine_info['code']} ({engine_info['name']})"
            )

            # Validate engine path exists
            if not os.path.exists(engine_info["path"]):
                logger.error(f"Engine path does not exist: {engine_info['path']}")
                return False

            # Get task file groups from database
            with app.app_context():
                # Get task paths - this should be implemented based on your task structure
                # For now, simulate the file groups structure from original sniffer
                task_files = TaskFile.query.filter_by(task_id=task.id).all()

                # Group files by base name (audio + textgrid pairs)
                file_groups = self._group_task_files(task_files)

                if not file_groups:
                    logger.error("No file groups found for alignment")
                    return False

                model_path = f"{ADMIN}/{lang_code}/{lang_code}.zip"

                for file_group in file_groups:
                    success = self._align_file_group(
                        file_group,
                        corpus_folder,
                        lang_folder,
                        engine_info,
                        temp_dict_path,
                        model_path,
                    )
                    if not success:
                        return False

                return True

        except Exception as e:
            logger.error(f"Alignment processing failed: {e}")
            return False

    def _group_task_files(self, task_files: list) -> list:
        """Group task files by base name (audio + textgrid pairs)"""
        groups = {}

        for tf in task_files:
            if tf.file_type in [FileType.AUDIO, FileType.TEXTGRID]:
                # Extract base name without extension
                base_name = os.path.splitext(os.path.basename(tf.file_path))[0]
                if base_name not in groups:
                    groups[base_name] = []
                groups[base_name].append(tf.file_path)

        # Convert to list of file groups
        return list(groups.values())

    def _align_file_group(
        self,
        file_group: list,
        corpus_folder: str,
        lang_folder: str,
        engine_info: dict,
        temp_dict_path: str,
        model_path: str,
    ) -> bool:
        """Align a single file group (audio + textgrid)"""
        import subprocess

        try:
            # Find textgrid and audio files
            tg_path = next(
                (path for path in file_group if str(path).endswith(".TextGrid")), None
            )
            audio_file = next(
                (path for path in file_group if str(path).endswith(".wav")), None
            )

            if not tg_path or not audio_file:
                logger.error(f"Missing audio or TextGrid file in group: {file_group}")
                return False

            # Load textgrid
            tg = textgrid.openTextgrid(fnFullPath=tg_path, includeEmptyIntervals=True)

            if len(tg.tiers) > 1:
                logger.info(f"Multi-tier TextGrid: {tg_path}")

            # Process each tier separately
            for i, tier in enumerate(tg.tiers):
                success = self._align_single_tier(
                    tg,
                    tier,
                    i,
                    audio_file,
                    tg_path,
                    corpus_folder,
                    lang_folder,
                    engine_info,
                    temp_dict_path,
                    model_path,
                )
                if not success:
                    return False

            return True

        except Exception as e:
            logger.error(f"Failed to align file group: {e}")
            return False

    def _align_single_tier(
        self,
        tg,
        tier,
        tier_index: int,
        audio_file: str,
        tg_path: str,
        corpus_folder: str,
        lang_folder: str,
        engine_info: dict,
        temp_dict_path: str,
        model_path: str,
    ) -> bool:
        """Align a single tier of a TextGrid"""
        import subprocess

        try:
            # Create temp folder for this tier
            temp_textgrid_folder = os.path.join(corpus_folder, "temp")

            # Delete temp folder if it exists
            if os.path.exists(temp_textgrid_folder):
                shutil.rmtree(temp_textgrid_folder)

            # Create temp folder
            os.makedirs(temp_textgrid_folder, exist_ok=True)

            # Create new textgrid with single tier
            new_tg = textgrid.Textgrid(maxTimestamp=tg.maxTimestamp)
            new_tg.addTier(tier)

            # Generate temp file names
            temp_wav_name = (
                f"{os.path.splitext(os.path.basename(audio_file))[0]}_{tier_index}.wav"
            )
            temp_textgrid_name = f"{os.path.splitext(os.path.basename(tg_path))[0]}_{tier_index}.TextGrid"

            # Copy audio file to temp folder
            shutil.copyfile(
                audio_file, os.path.join(temp_textgrid_folder, temp_wav_name)
            )

            # Save new textgrid
            new_tg.save(
                fn=os.path.join(temp_textgrid_folder, temp_textgrid_name),
                includeBlankSpaces=True,
                format="long_textgrid",
            )

            # Run alignment based on engine
            engine_code = engine_info["code"]
            engine_path = engine_info["path"]
            aligning = None

            if engine_code == "MFA1":
                cmd = f"{engine_path} {temp_textgrid_folder} {temp_dict_path} {model_path} {lang_folder}"
                aligning = subprocess.Popen(
                    cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
                )
                logger.debug(f"MFA1 command: {cmd}")

            elif engine_code == "MFA2":
                cmd = f"{engine_path} align --clean {temp_textgrid_folder} {temp_dict_path} {model_path} {lang_folder}"
                aligning = subprocess.Popen(
                    cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
                )
                logger.debug(f"MFA2 command: {cmd}")

            elif engine_code == "FAVE":
                if not engine_path or not os.path.exists(engine_path):
                    logger.error(f"FAVE_DIR not found: {engine_path}")
                    return False

                align_txt = os.path.join(
                    temp_textgrid_folder,
                    f"{os.path.splitext(temp_textgrid_name)[0]}.txt",
                )
                align_wav = os.path.join(temp_textgrid_folder, temp_wav_name)

                # Convert TextGrid to TSV for FAVE
                speaker, intervals = self.parse_textgrid(
                    os.path.join(temp_textgrid_folder, temp_textgrid_name)
                )
                self.tg_to_tsv(speaker, intervals, align_txt)

                cmd = f"cd {engine_path} && {CONDA_ENV} {engine_path} -d {self.fave_dict_prep(temp_dict_path)} {align_wav} {align_txt} {os.path.join(lang_folder, temp_textgrid_name)}"
                aligning = subprocess.Popen(
                    cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
                )
                logger.debug(f"FAVE command: {cmd}")

            elif engine_code == "FASE":
                align_wav = os.path.join(temp_textgrid_folder, temp_wav_name)
                align_tg = os.path.join(temp_textgrid_folder, temp_textgrid_name)

                cmd = f"{engine_path} -d {self.fase_dict_prep(temp_dict_path)} -w {align_wav} -t {align_tg} -o {lang_folder} -n {temp_textgrid_name}"
                aligning = subprocess.Popen(
                    cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
                )
                logger.debug(f"FASE command: {cmd}")
            else:
                logger.error(f"Unsupported engine: {engine_code}")
                return False

            if aligning:
                aligning.wait()
                stdout_output = aligning.stdout.read().decode("utf-8")
                stderr_output = aligning.stderr.read().decode("utf-8")

                if aligning.returncode != 0:
                    logger.error(f"Alignment failed for tier {tier.name}")
                    logger.error(f"STDOUT: {stdout_output}")
                    logger.error(f"STDERR: {stderr_output}")
                    return False
                else:
                    logger.info(f"Successfully aligned tier: {tier.name}")
                    if stdout_output.strip():
                        logger.debug(f"Alignment output: {stdout_output}")
                    return True
            else:
                logger.error(
                    f"Failed to create alignment process for engine: {engine_code}"
                )
                return False

        except Exception as e:
            logger.error(f"Failed to align single tier: {e}")
            return False

    def _perform_phone_replacement(
        self, lang_folder: str, lang_code: str, comp_temp_dict_path: str, engine: str
    ):
        """Perform complex phone replacement"""
        import subprocess

        try:
            logger.info("Performing phone replacement...")

            cmd = f"{CONDA_ENV} {PHONE_REPLACEMENT} --input_filename={lang_folder} --output_filename={lang_folder} --orig_phone_column=complex --mod_phone_column=simple --lang={lang_code} --new_dict={comp_temp_dict_path} --ngin {engine}"

            logger.debug(f"Phone replacement command: {cmd}")

            phone_replacement = subprocess.run(
                cmd,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            if phone_replacement.returncode != 0:
                logger.error("Error performing complex phone replacement")
                logger.error(f"Process output: {phone_replacement.stdout.decode()}")
                logger.error(f"Error output: {phone_replacement.stderr.decode()}")
                raise Exception("Error performing complex phone replacement")

            logger.info("Phone replacement completed successfully")

        except Exception as e:
            logger.error(f"Phone replacement failed: {e}")
            raise

    def _cleanup_temp_files(self, file_paths: list):
        """Clean up temporary dictionary files"""
        try:
            for path in file_paths:
                if path and os.path.exists(path):
                    os.remove(path)
                    logger.debug(f"Cleaned up temp file: {path}")

            # Clean up post operation files
            if hasattr(self, "post_operations"):
                for path in self.post_operations:
                    if os.path.exists(path):
                        os.remove(path)
                        logger.debug(f"Cleaned up post operation file: {path}")

        except Exception as e:
            logger.warning(f"Failed to cleanup temp files: {e}")

    def _create_final_output(
        self,
        task: Task,
        align_folder: str,
        ipa_folder: str,
        lang_folder: str,
        lang_code: str,
        held_files: list,
        engine: str,
    ):
        """Create final output with IPA substitutions and merge TextGrids"""
        import re

        try:
            logger.info("Creating final output...")

            # Get IPA substitution file
            substitute_file = os.path.join(ADMIN, lang_code, f"{lang_code}_IPA.json")

            if not os.path.exists(substitute_file):
                logger.warning(f"IPA substitution file not found: {substitute_file}")
                return

            with open(substitute_file, "r") as f:
                substitutions = json.load(f)

            # Process held files (original TextGrids) and merge with aligned output
            with app.app_context():
                # Get file names mapping
                task_files = TaskFile.query.filter_by(
                    task_id=task.id, file_type=FileType.HELD
                ).all()
                file_names = {}

                for tf in task_files:
                    file_id = os.path.splitext(os.path.basename(tf.file_path))[0]
                    file_names[file_id] = os.path.basename(tf.file_path)

                # Process each held file
                for held_file in held_files:
                    if not os.path.exists(held_file.file_path):
                        continue

                    file_id = os.path.splitext(os.path.basename(held_file.file_path))[0]

                    # Load original TextGrid
                    old_tg = textgrid.openTextgrid(
                        held_file.file_path, includeEmptyIntervals=True
                    )

                    # Output paths
                    output_tg_path = os.path.join(
                        lang_folder,
                        file_names.get(file_id, os.path.basename(held_file.file_path)),
                    )
                    output_tg_path_ipa = os.path.join(
                        ipa_folder,
                        file_names.get(file_id, os.path.basename(held_file.file_path)),
                    )

                    # Create directories if needed
                    os.makedirs(os.path.dirname(output_tg_path), exist_ok=True)
                    os.makedirs(os.path.dirname(output_tg_path_ipa), exist_ok=True)

                    # Create merged TextGrid
                    merged_tg = textgrid.Textgrid()

                    # Process each tier
                    for i, old_tier in enumerate(old_tg.tiers):
                        # Find corresponding aligned TextGrid
                        aligned_tg_path = None
                        for tg_name in sorted(os.listdir(lang_folder)):
                            if (
                                file_id in tg_name
                                and tg_name.endswith(".TextGrid")
                                and int(os.path.splitext(tg_name)[0].split("_")[-1])
                                == i
                            ):
                                aligned_tg_path = os.path.join(lang_folder, tg_name)
                                break

                        if aligned_tg_path and os.path.exists(aligned_tg_path):
                            # Load aligned TextGrid
                            aligned_tg = textgrid.openTextgrid(
                                aligned_tg_path, includeEmptyIntervals=True
                            )

                            # Rename and add tiers
                            self._process_aligned_tiers(aligned_tg, old_tier, merged_tg)

                            # Add original transcription tier
                            merged_tg.addTier(old_tier)
                            merged_tg.renameTier(
                                old_tier.name, f"{old_tier.name} - trans"
                            )

                            # Delete the individual aligned file
                            os.remove(aligned_tg_path)

                    # Save merged TextGrid
                    if merged_tg.tiers:
                        merged_tg.save(
                            fn=output_tg_path,
                            includeBlankSpaces=True,
                            format="long_textgrid",
                        )

                        # Convert to lowercase for FASE
                        if engine == "FASE":
                            self.tg_lower(output_tg_path)

                        # Create IPA version
                        self._create_ipa_version(
                            merged_tg, substitutions, output_tg_path_ipa, engine
                        )

            logger.info("Final output creation completed")

        except Exception as e:
            logger.error(f"Failed to create final output: {e}")
            logger.error(traceback.format_exc())

    def _process_aligned_tiers(self, aligned_tg, old_tier, merged_tg):
        """Process aligned tiers and add to merged TextGrid"""
        import re

        replacements = {
            " - words": " - word",
            " - phones": " - phone",
            " : words": " - word",
            " : phones": " - phone",
            "words": " - word",
            "phones": " - phone",
        }

        pattern = re.compile("|".join(map(re.escape, replacements.keys())))
        removed_tier = None

        for tier in aligned_tg.tiers:
            # Rename tier
            tier_name = pattern.sub(
                lambda match: replacements[match.group(0)], tier.name
            )
            tier_name = (
                f"{old_tier.name}{tier_name}"
                if old_tier.name not in tier_name
                else tier_name
            )
            aligned_tg.renameTier(tier.name, tier_name)
            logger.debug(f"Tier renamed from {tier.name} to {tier_name}")

            # Handle word tier placement
            if " - word" in tier_name:
                removed_tier = aligned_tg.removeTier(tier_name)
            else:
                merged_tg.addTier(aligned_tg.getTier(tier_name))

        # Add word tier last if it exists
        if removed_tier:
            merged_tg.addTier(removed_tier)

    def _create_ipa_version(
        self, merged_tg, substitutions: list, output_path: str, engine: str
    ):
        """Create IPA version of TextGrid"""
        try:
            # Apply IPA substitutions
            for tier in merged_tg.tiers:
                if "phone" in tier.name:
                    for interval in tier.entries:
                        for line in substitutions:
                            if interval.label == line["dummy"]:
                                new_interval = Interval(
                                    start=interval.start,
                                    end=interval.end,
                                    label=line["ipa"],
                                )
                                tier.insertEntry(
                                    new_interval,
                                    collisionMode="replace",
                                    collisionReportingMode="silence",
                                )

            # Save IPA version
            merged_tg.save(
                output_path,
                includeBlankSpaces=True,
                format="long_textgrid",
            )

            # Convert to lowercase for FASE
            if engine == "FASE":
                self.tg_lower(output_path)

        except Exception as e:
            logger.error(f"Failed to create IPA version: {e}")

    def _package_results(self, task: Task, align_folder: str) -> str:
        """Package alignment results into a zip file"""

        def zipdir(path, ziph):
            """Add directory to zip file with proper structure"""
            for root, dirs, files in os.walk(path):
                for file in files:
                    # Get the full path of the file
                    file_path = os.path.join(root, file)
                    # Get the path of the file relative to the given path
                    path_components = file_path.split(os.sep)
                    # Remove the highest-level components from the path (adjust as needed)
                    archive_name = (
                        os.path.join(*path_components[8:])
                        if len(path_components) > 8
                        else file
                    )
                    # Add the file to the zip archive with the new archive name
                    ziph.write(file_path, archive_name)

        try:
            zip_filename = f"{task.task_id}.zip"

            # Create zip in current directory first
            with zipfile.ZipFile(zip_filename, "w", zipfile.ZIP_DEFLATED) as zipf:
                zipdir(align_folder, zipf)

            # Move to final location
            zip_path = os.path.join(UPLOADS, str(task.user_uuid), "otp", task.task_id)
            os.makedirs(zip_path, exist_ok=True)
            full_zip_path = os.path.join(zip_path, zip_filename)

            shutil.move(zip_filename, full_zip_path)

            logger.info(f"Results packaged: {full_zip_path}")
            return full_zip_path

        except Exception as e:
            logger.error(f"Failed to package results: {e}")
            return ""


class AlignmentWorker:
    """Main worker class that handles task polling and processing"""

    def __init__(self, config: AlignmentWorkerConfig):
        self.config = config
        self.processor = TaskProcessor(config)
        self.current_poll_interval = config.min_poll_interval
        self.executor = ThreadPoolExecutor(
            max_workers=config.max_workers, thread_name_prefix="AlignmentWorker"
        )
        self.active_tasks = set()
        self.stats = {
            "tasks_processed": 0,
            "tasks_succeeded": 0,
            "tasks_failed": 0,
            "start_time": datetime.now(),
            "last_task_time": None,
            "peak_active_tasks": 0,
        }
        logger.info(
            f"AlignmentWorker initialized with {config.max_workers} max workers"
        )

    def signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully"""
        logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        shutdown_requested.set()

        # Cancel active tasks and reset them for realignment
        for task_id in list(self.active_tasks):
            logger.info(f"Cancelling active task: {task_id} and resetting to uploaded")
            # Update task status back to uploaded for realignment later
            with app.app_context():
                task = Task.query.filter_by(task_id=task_id).first()
                if task:
                    self.processor.update_task_status(
                        task, TaskStatus.UPLOADED, cancelled=False, pid=None, aligned=None
                    )

        # Shutdown executor
        self.executor.shutdown(wait=True)
        logger.info("Graceful shutdown completed")
        sys.exit(0)

    def get_pending_tasks(self) -> List[Task]:
        """Get tasks that need processing"""
        try:
            with app.app_context():
                from datetime import datetime, timezone, timedelta
                
                tasks = (
                    Task.query.filter(
                        Task.task_status == TaskStatus.ALIGNED,
                        Task.deleted.is_(None),
                        Task.cancelled != True,
                    )
                    .order_by(Task.created_at)
                    .all()
                )

                # Filter out tasks already being processed and apply timeout safeguard
                available_tasks = []
                for task in tasks:
                    if task.task_id in self.active_tasks:
                        continue
                    
                    # Safeguard: Skip tasks that have been in ALIGNED status for too long
                    # This prevents infinite retry loops if status updates fail
                    if hasattr(task, 'updated_at') and task.updated_at:
                        # Handle timezone-aware/naive datetime comparison
                        if task.updated_at.tzinfo is None:
                            # Database datetime is naive, assume UTC
                            task_updated_utc = task.updated_at.replace(tzinfo=timezone.utc)
                        else:
                            # Database datetime is already timezone-aware
                            task_updated_utc = task.updated_at
                        
                        time_in_aligned = datetime.now(timezone.utc) - task_updated_utc
                        if time_in_aligned > timedelta(hours=2):  # 2 hour timeout for alignment
                            logger.warning(f"Task {task.task_id} stuck in ALIGNED for {time_in_aligned} - marking as failed")
                            self.processor.update_task_status(task, TaskStatus.FAILED, 
                                                            error_msg="Timeout: stuck in aligned status")
                            continue
                    
                    available_tasks.append(task)

                return available_tasks
        except Exception as e:
            logger.error(f"Error getting pending tasks: {e}")
            return []

    def adjust_poll_interval(self, tasks_found: int):
        """Adjust polling interval based on workload"""
        if tasks_found > 0:
            # Reset to minimum when tasks are found
            self.current_poll_interval = self.config.min_poll_interval
        else:
            # Exponential backoff when idle
            self.current_poll_interval = min(
                self.current_poll_interval * self.config.poll_backoff_factor,
                self.config.max_poll_interval,
            )

    def process_task_async(self, task: Task):
        """Process a task asynchronously"""

        def task_wrapper():
            try:
                self.active_tasks.add(task.task_id)
                success = self.processor.process_task_with_retry(task)

                # Update statistics
                self.stats["tasks_processed"] += 1
                self.stats["last_task_time"] = datetime.now()
                if success:
                    self.stats["tasks_succeeded"] += 1
                    logger.info(f"Task {task.task_id} completed successfully")
                else:
                    self.stats["tasks_failed"] += 1
                    logger.error(f"Task {task.task_id} failed after all retry attempts")

                # Clean up files
                self.processor.cleanup_task_files(task)

            except Exception as e:
                logger.error(f"Task wrapper error: {e}")
                self.stats["tasks_failed"] += 1
            finally:
                self.active_tasks.discard(task.task_id)

        return self.executor.submit(task_wrapper)

    def log_stats(self):
        """Log enhanced worker statistics"""
        uptime = datetime.now() - self.stats["start_time"]
        success_rate = (
            (self.stats["tasks_succeeded"] / self.stats["tasks_processed"] * 100)
            if self.stats["tasks_processed"] > 0
            else 0
        )

        # Update peak active tasks
        current_active = len(self.active_tasks)
        if current_active > self.stats["peak_active_tasks"]:
            self.stats["peak_active_tasks"] = current_active

        logger.info(
            f"Aligner Worker Stats - Uptime: {uptime}, "
            f"Processed: {self.stats['tasks_processed']}, "
            f"Success: {self.stats['tasks_succeeded']} ({success_rate:.1f}%), "
            f"Failed: {self.stats['tasks_failed']}, "
            f"Active: {current_active}/{self.config.max_workers}, "
            f"Peak: {self.stats['peak_active_tasks']}, "
            f"Poll Interval: {self.current_poll_interval:.1f}s"
        )

        # Log last task time if available
        if self.stats["last_task_time"]:
            time_since_last = datetime.now() - self.stats["last_task_time"]
            logger.debug(f"Time since last task: {time_since_last}")

    def run(self):
        """Main worker loop"""
        logger.info("Alignment worker started")

        # Setup signal handlers
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)

        last_stats_time = datetime.now()

        while not shutdown_requested.is_set():
            try:
                # Get pending tasks
                pending_tasks = self.get_pending_tasks()
                logger.debug(f"Found {len(pending_tasks)} pending tasks")

                # Process available tasks (respect worker limits)
                available_slots = self.config.max_workers - len(self.active_tasks)
                tasks_to_process = pending_tasks[:available_slots]

                for task in tasks_to_process:
                    logger.info(
                        f"Starting task: {task.task_id} (slot {len(self.active_tasks) + 1}/{self.config.max_workers})"
                    )
                    self.process_task_async(task)

                # Adjust polling interval
                self.adjust_poll_interval(len(pending_tasks))

                # Log stats periodically (every 60 seconds)
                if (datetime.now() - last_stats_time).total_seconds() >= 60:
                    self.log_stats()
                    last_stats_time = datetime.now()

                # Wait before next poll
                shutdown_requested.wait(self.current_poll_interval)

            except Exception as e:
                logger.error(f"Worker loop error: {e}")
                logger.error(traceback.format_exc())
                time.sleep(5)  # Brief pause on errors

        logger.info("Align Worker stopped")


def validate_environment():
    """Validate environment variables and paths"""
    errors = []
    warnings = []

    # Required environment variables
    required_vars = {
        "ADMIN": ADMIN,
        "UPLOADS": UPLOADS,
        "LOGS": LOGS,
        "CURRENT_DIR": CURRENT_DIR,
        "PHONE_REPLACEMENT": PHONE_REPLACEMENT,
    }

    for var_name, var_value in required_vars.items():
        if not var_value:
            errors.append(f"Missing required environment variable: {var_name}")
        elif not os.path.exists(var_value):
            if var_name in ["ADMIN", "UPLOADS", "LOGS", "CURRENT_DIR"]:
                errors.append(f"Path does not exist for {var_name}: {var_value}")
            else:
                warnings.append(f"Path may not exist for {var_name}: {var_value}")

    if not CONDA_ENV:
        warnings.append("APP_CONDA_ENV not set - may cause issues with some aligners")

    # Check database connection
    try:
        with app.app_context():
            # Test database connection
            Engine.query.first()
            logger.info("Database connection successful")
    except Exception as e:
        errors.append(f"Database connection failed: {e}")

    # Report results
    if errors:
        for error in errors:
            logger.error(f"Environment validation error: {error}")
        return False

    if warnings:
        for warning in warnings:
            logger.warning(f"Environment validation warning: {warning}")

    logger.info("Environment validation completed")
    return True


def main():
    """Main entry point with environment validation"""
    try:
        # Setup logging directory
        os.makedirs(LOGS, exist_ok=True)

        logger.info("Starting Autophon Alignment Worker")
        logger.info(f"Worker PID: {os.getpid()}")
        logger.info(f"Python version: {sys.version}")

        # Validate environment
        if not validate_environment():
            logger.error("Environment validation failed - exiting")
            sys.exit(1)

        # Create worker configuration
        config = AlignmentWorkerConfig()
        logger.info(
            f"Worker configuration: max_workers={config.max_workers}, "
            f"poll_interval={config.min_poll_interval}-{config.max_poll_interval}s"
        )

        # Create and run worker
        worker = AlignmentWorker(config)
        worker.run()

    except KeyboardInterrupt:
        logger.info("Worker interrupted by user")
        sys.exit(0)
    except SystemExit:
        raise  # Re-raise SystemExit
    except Exception as e:
        logger.error(f"Worker failed: {e}")
        logger.error(traceback.format_exc())
        sys.exit(1)
    finally:
        logger.info("Worker shutdown complete")


if __name__ == "__main__":
    main()
