import os
from flask import current_app
from flask_restful import Resource


class UserLimitsResource(Resource):
    def get(self):
        """Get user limits configuration from admin/user_limits.txt"""
        try:
            # Access the user_limits from the Flask app's global property
            if hasattr(current_app, "user_limits"):
                return {"status": "success", "data": current_app.user_limits}

            # Fallback: read directly from file if not loaded in app
            user_limits_path = os.path.join(os.getenv("ADMIN"), "user_limits.txt")

            user_limits = {}
            if os.path.exists(user_limits_path):
                with open(user_limits_path, "r") as file:
                    for line in file:
                        line = line.strip()
                        if line and ":" in line:
                            key, value = line.split(":", 1)
                            key = key.strip()
                            value = value.strip()
                            # Try to convert to int if it's a number
                            try:
                                value = int(value)
                            except ValueError:
                                pass
                            user_limits[key] = value

            return {"status": "success", "data": user_limits}

        except Exception as e:
            current_app.logger.error(f"Error reading user limits: {str(e)}")
            return {
                "status": "error",
                "message": "Failed to load user limits configuration",
            }, 500
