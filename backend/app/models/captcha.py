from datetime import timedelta
from app.extensions import db
from app.models.base import TimestampMixin, DatabaseHelperMixin
from app.utils.datetime_helpers import utc_now


class Captcha(db.Model, TimestampMixin, DatabaseHelperMixin):
    """Captcha model for storing captcha validation data"""

    __tablename__ = "captchas"

    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(10), nullable=False, unique=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=utc_now)
    used = db.Column(db.Boolean, nullable=False, default=False)

    def __repr__(self):
        return f"<Captcha {self.text}>"

    def is_valid(self, timeout_seconds=30):
        """Check if captcha is still valid (not used and within timeout)"""
        if self.used:
            return False

        time_diff = (utc_now() - self.timestamp).total_seconds()
        return time_diff <= timeout_seconds

    def mark_as_used(self):
        """Mark captcha as used"""
        self.used = True
        self.update()

    @classmethod
    def cleanup_expired_captchas(cls, timeout_seconds=30):
        """Remove expired captchas from database"""
        cutoff_time = utc_now() - timedelta(seconds=timeout_seconds)
        expired_captchas = cls.query.filter(
            db.or_(cls.used == True, cls.timestamp < cutoff_time)
        ).all()

        count = len(expired_captchas)
        for captcha in expired_captchas:
            captcha.delete()

        return count
