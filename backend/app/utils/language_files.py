import os
import shutil
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import current_app

from app.models.language import Language


class LanguageFileManager:
    """Manages language resource files with backup functionality"""

    REQUIRED_FILES = [
        "cite",
        "cleanup",
        "complex2simple",
        "g2p_model",
        "ipa",
        "meta",
        "simple_dict",
        "normal_dict",
        "dict_json",
        "guide_pdf",
        "model_zip",
    ]

    def __init__(self, language: Language):
        self.language = language
        self.admin_path = os.getenv("ADMIN", "")
        self.language_dir = self.language.get_language_dir()
        self.backup_dir = os.path.join(self.language_dir, "backups")

    def ensure_directories(self):
        """Ensure language and backup directories exist"""
        os.makedirs(self.language_dir, exist_ok=True)
        os.makedirs(self.backup_dir, exist_ok=True)

    def create_backup(self, file_type: str) -> str:
        """Create a backup of existing file before replacement"""
        file_path = self.language.get_file_path(file_type)
        if not file_path or not os.path.exists(file_path):
            return None

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = os.path.basename(file_path)
        name, ext = os.path.splitext(filename)
        backup_filename = f"{name}_{timestamp}{ext}"
        backup_path = os.path.join(self.backup_dir, backup_filename)

        try:
            shutil.copy2(file_path, backup_path)
            current_app.logger.info(f"Created backup: {backup_path}")
            return backup_path
        except Exception as e:
            current_app.logger.error(f"Failed to create backup: {e}")
            return None

    def save_file(self, file_type: str, uploaded_file) -> bool:
        """Save uploaded file, creating backup if file exists"""
        if file_type not in self.REQUIRED_FILES:
            raise ValueError(f"Invalid file type: {file_type}")

        self.ensure_directories()

        # Create backup if file exists
        self.create_backup(file_type)

        # Save new file
        file_path = self.language.get_file_path(file_type)
        try:
            uploaded_file.save(file_path)
            current_app.logger.info(f"Saved file: {file_path}")
            return True
        except Exception as e:
            current_app.logger.error(f"Failed to save file: {e}")
            return False

    def save_multiple_files(self, files_dict: dict) -> dict:
        """Save multiple files at once"""
        results = {}
        self.ensure_directories()

        for file_type, uploaded_file in files_dict.items():
            if file_type in self.REQUIRED_FILES:
                success = self.save_file(file_type, uploaded_file)
                results[file_type] = success
            else:
                results[file_type] = False

        # Update file status flags
        self.language.update_file_status()
        return results

    def delete_file(self, file_type: str, create_backup: bool = True) -> bool:
        """Delete a language file, optionally creating backup"""
        file_path = self.language.get_file_path(file_type)
        if not file_path or not os.path.exists(file_path):
            return False

        try:
            if create_backup:
                self.create_backup(file_type)

            os.remove(file_path)
            current_app.logger.info(f"Deleted file: {file_path}")
            return True
        except Exception as e:
            current_app.logger.error(f"Failed to delete file: {e}")
            return False

    def get_file_info(self) -> dict:
        """Get information about all language files"""
        file_info = {}

        for file_type in self.REQUIRED_FILES:
            file_path = self.language.get_file_path(file_type)
            exists = os.path.exists(file_path) if file_path else False

            info = {"exists": exists, "path": file_path, "size": None, "modified": None}

            if exists:
                try:
                    stat = os.stat(file_path)
                    info["size"] = stat.st_size
                    info["modified"] = datetime.fromtimestamp(stat.st_mtime).isoformat()
                except Exception:
                    pass

            file_info[file_type] = info

        return file_info

    def get_missing_files(self) -> list:
        """Get list of missing required files"""
        missing = []
        for file_type in self.REQUIRED_FILES:
            if not self.language.check_file_exists(file_type):
                missing.append(file_type)
        return missing

    def is_complete(self) -> bool:
        """Check if all required files are present"""
        return len(self.get_missing_files()) == 0

    def cleanup_backups(self, keep_count: int = 5):
        """Clean up old backup files, keeping only the most recent ones"""
        if not os.path.exists(self.backup_dir):
            return

        for file_type in self.REQUIRED_FILES:
            file_mappings = self.language.get_file_path(file_type)
            if not file_mappings:
                continue

            base_name = os.path.splitext(os.path.basename(file_mappings))[0]

            # Find all backup files for this type
            backup_files = []
            for f in os.listdir(self.backup_dir):
                if f.startswith(f"{base_name}_") and not f.endswith(".tmp"):
                    backup_path = os.path.join(self.backup_dir, f)
                    backup_files.append((backup_path, os.path.getmtime(backup_path)))

            # Sort by modification time (newest first)
            backup_files.sort(key=lambda x: x[1], reverse=True)

            # Remove old backups
            for backup_path, _ in backup_files[keep_count:]:
                try:
                    os.remove(backup_path)
                    current_app.logger.info(f"Cleaned up old backup: {backup_path}")
                except Exception as e:
                    current_app.logger.error(f"Failed to cleanup backup: {e}")

    def validate_file_type(self, uploaded_file, file_type: str) -> bool:
        """Validate uploaded file based on expected file type"""
        if not uploaded_file or not uploaded_file.filename:
            return False

        filename = secure_filename(uploaded_file.filename)

        # Define expected extensions for each file type
        expected_extensions = {
            "cite": [".txt"],
            "cleanup": [".txt"],
            "complex2simple": [".json"],
            "g2p_model": [".zip"],
            "ipa": [".json"],
            "meta": [".yaml", ".yml"],
            "simple_dict": [".dict"],
            "normal_dict": [".dict"],
            "dict_json": [".json"],
            "guide_pdf": [".pdf"],
            "model_zip": [".zip"],
        }

        if file_type not in expected_extensions:
            return False

        file_ext = os.path.splitext(filename)[1].lower()
        return file_ext in expected_extensions[file_type]
