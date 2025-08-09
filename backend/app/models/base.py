from app.extensions import db
from app.utils.logger import get_logger

logger = get_logger(__name__)


# timestamp to be inherited by other class models
class TimestampMixin(object):
    created_at = db.Column(
        db.DateTime, nullable=False, default=db.func.current_timestamp()
    )
    updated_at = db.Column(
        db.DateTime,
        default=db.func.current_timestamp(),
        onupdate=db.func.current_timestamp(),
    )

    def format_date(self):
        self.created_at = self.created_at.strftime("%d %B, %Y %I:%M")

    def format_time(self):
        try:
            self.datetime = self.datetime.strftime("%d %B, %Y %I:%M")
        except:
            pass


# db helper functions
class DatabaseHelperMixin(object):
    def update(self):
        try:
            db.session.commit()
            logger.debug(f"Updated {self.__class__.__name__} record")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to update {self.__class__.__name__}: {str(e)}")
            raise

    def insert(self):
        try:
            db.session.add(self)
            db.session.commit()
            logger.debug(f"Inserted new {self.__class__.__name__} record")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to insert {self.__class__.__name__}: {str(e)}")
            raise

    def delete(self):
        try:
            db.session.delete(self)
            db.session.commit()
            logger.debug(f"Deleted {self.__class__.__name__} record")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to delete {self.__class__.__name__}: {str(e)}")
            raise
