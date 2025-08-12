"""DateTime Helper Functions"""

from datetime import datetime, timezone


def utc_now():
    """Get current UTC time as timezone-aware datetime"""
    return datetime.now(timezone.utc)


def utc_from_timestamp(timestamp):
    """Convert timestamp to timezone-aware UTC datetime"""
    return datetime.fromtimestamp(timestamp, tz=timezone.utc)


def make_utc_aware(dt):
    """Make a naive datetime timezone-aware in UTC"""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt
