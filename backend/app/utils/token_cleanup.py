from app.models.verification_token import VerificationToken
from app.utils.logger import get_logger

logger = get_logger(__name__)


def cleanup_expired_verification_tokens():
    """Clean up expired verification tokens - can be called periodically"""
    try:
        count = VerificationToken.cleanup_expired_tokens()
        logger.info(f"Cleaned up {count} expired verification tokens")
        return count
    except Exception as e:
        logger.error(f"Error cleaning up verification tokens: {str(e)}")
        return 0
