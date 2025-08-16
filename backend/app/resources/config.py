import os
from flask import current_app
from flask_restful import Resource


class ConfigResource(Resource):
    def get(self):
        """Get application configuration including user limits and audio extensions"""
        try:
            config_data = {}

            # Get user limits
            if hasattr(current_app, "user_limits"):
                config_data["userLimits"] = current_app.user_limits
            else:
                # Fallback: read directly from file
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
                                try:
                                    value = int(value)
                                except ValueError:
                                    pass
                                user_limits[key] = value
                config_data["userLimits"] = user_limits

            # Get audio extensions
            if hasattr(current_app, "audio_extensions"):
                config_data["audioExtensions"] = current_app.audio_extensions

            return {"status": "success", "data": config_data}

        except Exception as e:
            current_app.logger.error(f"Error reading configuration: {str(e)}")
            return {
                "status": "error",
                "message": "Failed to load application configuration",
            }, 500
