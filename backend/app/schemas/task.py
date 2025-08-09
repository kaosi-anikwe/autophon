from enum import Enum


class TaskStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class FileType(Enum):
    AUDIO = "audio"
    TEXTGRID = "textgrid"
    HELD = "held"
    OUTPUT = "output"
