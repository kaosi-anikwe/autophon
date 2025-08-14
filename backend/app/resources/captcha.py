import base64
from flask import request
from datetime import timezone
from flask_restful import Resource

from app.models.captcha import Captcha
from app.utils.helpers import generate_captcha
from app.utils.datetime_helpers import utc_now
from app.utils.logger import get_logger, log_request_info, log_response_info

logger = get_logger(__name__)


class CaptchaResource(Resource):
    """Handle captcha generation and validation"""

    def get(self):
        """Generate new captcha"""
        log_request_info(logger, request)
        try:
            # Generate captcha until we get a unique one
            while True:
                image_data, captcha_text = generate_captcha()

                # Check if captcha with this text already exists
                existing_captcha = Captcha.query.filter_by(text=captcha_text).first()
                if not existing_captcha:
                    break

            # Store captcha in database
            captcha = Captcha(text=captcha_text, timestamp=utc_now(), used=False)
            captcha.insert()

            # Encode image as base64
            image_b64 = base64.b64encode(image_data.getvalue()).decode("utf-8")

            response = {
                "image": image_b64,
                "timestamp": captcha.timestamp.isoformat(),
                "used": False,
            }

            logger.info(f"Generated captcha: {captcha_text}")
            log_response_info(logger, {"captcha_generated": True}, 200)
            return response, 200

        except Exception as e:
            logger.error(f"Failed to generate captcha: {str(e)}")
            response = {"message": f"Failed to generate captcha: {str(e)}"}
            log_response_info(logger, response, 500)
            return response, 500

    def post(self):
        """Validate captcha"""
        log_request_info(logger, request)
        try:
            data = request.get_json()
            captcha_text = data.get("text", "")

            if not captcha_text:
                response = {"success": False, "message": "Captcha text is required"}
                log_response_info(logger, response, 400)
                return response, 400

            # Find captcha in database
            captcha = Captcha.query.filter_by(text=captcha_text).first()

            if not captcha:
                response = {"success": False, "message": "CAPTCHA is invalid"}
                log_response_info(logger, response, 200)
                return response, 200

            if captcha.used:
                response = {
                    "success": False,
                    "message": "CAPTCHA has already been used",
                }
                log_response_info(logger, response, 200)
                return response, 200

            # Check if captcha is still valid (within 30 seconds)
            time_difference = (
                utc_now() - captcha.timestamp.replace(tzinfo=timezone.utc)
            ).total_seconds()

            if time_difference > 30:
                response = {
                    "success": False,
                    "message": "CAPTCHA is expired",
                    "timedelta": time_difference,
                }
                log_response_info(logger, response, 200)
                return response, 200

            # Mark captcha as used
            captcha.mark_as_used()

            response = {
                "success": True,
                "message": "CAPTCHA is valid",
                "timedelta": time_difference,
            }

            logger.info(f"Captcha validated successfully: {captcha_text}")
            log_response_info(logger, response, 200)
            return response, 200

        except Exception as e:
            logger.error(f"Failed to validate captcha: {str(e)}")
            response = {"message": f"Captcha validation failed: {str(e)}"}
            log_response_info(logger, response, 500)
            return response, 500


class CaptchaCleanupResource(Resource):
    """Admin endpoint for cleaning up expired captchas"""

    def post(self):
        """Clean up expired captchas (admin only)"""
        try:
            # Clean up expired captchas
            cleaned_count = Captcha.cleanup_expired_captchas()

            response = {
                "message": f"Cleaned up {cleaned_count} expired captchas",
                "cleaned_count": cleaned_count,
            }

            logger.info(f"Cleaned up {cleaned_count} expired captchas")
            return response, 200

        except Exception as e:
            logger.error(f"Failed to cleanup captchas: {str(e)}")
            response = {"message": f"Captcha cleanup failed: {str(e)}"}
            return response, 500
