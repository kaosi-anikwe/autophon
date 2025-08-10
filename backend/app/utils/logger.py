import os
import logging
from datetime import datetime
from logging.handlers import RotatingFileHandler


def setup_logging(app):
    """Setup application logging with file rotation."""

    # Get log directory from environment
    log_dir = os.getenv("LOG_DIR", "/tmp/autophon_logs")

    # Create log directory if it doesn't exist
    os.makedirs(log_dir, exist_ok=True)

    # Set log level based on environment
    log_level = logging.DEBUG if app.config.get("DEBUG", False) else logging.INFO

    # Create formatters
    file_formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s in %(module)s.%(funcName)s (%(filename)s:%(lineno)d): %(message)s"
    )

    console_formatter = logging.Formatter("[%(asctime)s] %(levelname)s: %(message)s")

    # Setup file handler with rotation (1MB max, keep 10 files)
    file_handler = RotatingFileHandler(
        filename=os.path.join(log_dir, "run.log"),
        maxBytes=1024 * 1024,  # 1MB
        backupCount=10,
        encoding="utf-8",
    )
    file_handler.setFormatter(file_formatter)
    file_handler.setLevel(log_level)

    # Setup error file handler for errors only
    error_file_handler = RotatingFileHandler(
        filename=os.path.join(log_dir, "error.log"),
        maxBytes=1024 * 1024,  # 1MB
        backupCount=5,
        encoding="utf-8",
    )
    error_file_handler.setFormatter(file_formatter)
    error_file_handler.setLevel(logging.ERROR)

    # Setup console handler for development
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(console_formatter)
    console_handler.setLevel(
        logging.INFO if app.config.get("DEBUG", False) else logging.WARNING
    )

    # Configure root logger
    logging.basicConfig(
        level=log_level, handlers=[file_handler, error_file_handler, console_handler]
    )

    # Configure Flask app logger
    app.logger.setLevel(log_level)

    # Remove default Flask handlers to avoid duplicates
    app.logger.handlers.clear()

    # Add our handlers to Flask app logger
    app.logger.addHandler(file_handler)
    app.logger.addHandler(error_file_handler)
    app.logger.addHandler(console_handler)

    # Log startup message
    app.logger.info(f"Logging initialized - Log directory: {log_dir}")
    app.logger.info(f"Log level: {logging.getLevelName(log_level)}")
    app.logger.info(f"Application started at {datetime.now().isoformat()}")

    return app.logger


def get_logger(name):
    """Get a logger instance for a specific module."""
    return logging.getLogger(name)


def log_exception(logger, message="An exception occurred"):
    """Log an exception with full traceback."""
    logger.exception(message)


def log_request_info(logger, request):
    """Log request information for debugging."""
    logger.info(f"Request: {request.method} {request.path}")
    logger.debug(f"Request headers: {dict(request.headers)}")
    if request.is_json and request.get_json():
        # Don't log sensitive data like passwords
        data = request.get_json().copy()
        if "password" in data:
            data["password"] = "[REDACTED]"
        if "current_password" in data:
            data["current_password"] = "[REDACTED]"
        if "new_password" in data:
            data["new_password"] = "[REDACTED]"
        logger.debug(f"Request JSON: {data}")


def log_response_info(logger, response, status_code):
    """Log response information for debugging."""
    logger.info(f"Response: {status_code}")
    if status_code >= 400:
        logger.warning(f"Error response: {response}")
