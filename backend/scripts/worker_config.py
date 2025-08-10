"""
Configuration management for the alignment worker
"""

import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class WorkerConfig:
    """Configuration class for alignment worker settings"""

    # Worker settings
    max_workers: int = 1
    min_poll_interval: float = 1.0
    max_poll_interval: float = 30.0
    poll_backoff_factor: float = 1.5

    # Retry settings
    retry_attempts: int = 3
    retry_delay: int = 5  # seconds

    # Resource limits
    max_memory_mb: int = 1024
    max_disk_usage_gb: int = 10

    # Timeout settings
    task_timeout: int = 3600  # 1 hour
    alignment_timeout: int = 1800  # 30 minutes

    # Logging settings
    log_level: str = "INFO"
    log_stats_interval: int = 60  # seconds

    # Environment paths (loaded from .env)
    admin_path: Optional[str] = None
    uploads_path: Optional[str] = None
    logs_path: Optional[str] = None

    def __post_init__(self):
        """Load environment variables after initialization"""
        from dotenv import load_dotenv

        load_dotenv()

        self.admin_path = os.getenv("ADMIN")
        self.uploads_path = os.getenv("UPLOADS")
        self.logs_path = os.getenv("LOGS")

        # Override with environment variables if set
        self.max_workers = int(os.getenv("ALIGNMENT_WORKERS", str(self.max_workers)))
        self.log_level = os.getenv("WORKER_LOG_LEVEL", self.log_level)

        # Validate required paths
        if not all([self.admin_path, self.uploads_path, self.logs_path]):
            raise ValueError(
                "Required environment variables not set: ADMIN, UPLOADS, LOGS"
            )

    @classmethod
    def from_env(cls) -> "WorkerConfig":
        """Create configuration from environment variables"""
        return cls()

    def validate(self) -> bool:
        """Validate configuration settings"""
        if self.max_workers <= 0:
            raise ValueError("max_workers must be positive")

        if self.min_poll_interval <= 0:
            raise ValueError("min_poll_interval must be positive")

        if self.max_poll_interval <= self.min_poll_interval:
            raise ValueError("max_poll_interval must be greater than min_poll_interval")

        return True
