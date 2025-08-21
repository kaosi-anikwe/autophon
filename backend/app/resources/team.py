import os
from dotenv import load_dotenv
from flask_restful import Resource
from flask import request, send_file, redirect

from app.utils.logger import get_logger, log_exception

load_dotenv()
ADMIN = os.getenv("ADMIN")

logger = get_logger(__name__)


class TeamResource(Resource):
    """Handle team information retrieval"""

    def get(self):
        """Get team structure and member information"""
        try:
            team = []
            team_path = os.path.join(ADMIN, "team")

            if not os.path.exists(team_path):
                return {"message": "Team directory not found"}, 404

            # Iterate through categories (directories starting with numbers)
            for category_name in sorted(os.listdir(team_path)):
                category_path = os.path.join(team_path, category_name)
                if not os.path.isdir(category_path):
                    continue

                category = {"name": category_name[1:], "members": []}

                # Iterate through members in each category
                for member_id in sorted(os.listdir(category_path)):
                    member_path = os.path.join(category_path, member_id)
                    if not os.path.isdir(member_path):
                        continue

                    bio_file = os.path.join(member_path, "bio.txt")
                    if not os.path.exists(bio_file):
                        continue

                    member = {}
                    try:
                        with open(bio_file, "r", encoding="utf-8") as f:
                            document = f.readlines()

                        if len(document) >= 2:
                            member["name"] = document[0].strip()
                            member["role"] = document[1].strip()
                            member["bio"] = "<br><br>".join(
                                [line.strip() for line in document[2:] if line.strip()]
                            )
                            member["image"] = (
                                f"/api/v1/team-images?category={category_name}&member={member_id}"
                            )
                            category["members"].append(member)
                    except (IOError, UnicodeDecodeError) as e:
                        logger.warning(f"Could not read bio file for {member_id}: {e}")
                        continue

                if category["members"]:  # Only add categories with members
                    team.append(category)

            return {"team": team, "count": len(team)}, 200

        except Exception as e:
            log_exception(logger, "Error retrieving team information")
            return {"message": f"Error retrieving team information: {str(e)}"}, 500


class TeamImageResource(Resource):
    """Handle team member images"""

    def get(self):
        """Get team member image"""
        try:
            category = request.args.get("category")
            member = request.args.get("member")

            if not category or not member:
                return {"message": "category and member parameters are required"}, 400

            image_path = os.path.join(ADMIN, "team", category, member, "image.png")

            if os.path.exists(image_path):
                return send_file(image_path, mimetype="image/png")
            else:
                # Return redirect to placeholder image
                return redirect("https://placehold.co/400x400.png?text=No+image")

        except Exception as e:
            log_exception(logger, "Error retrieving team image")
            return {"message": f"Error retrieving team image: {str(e)}"}, 500


class ContactEmailResource(Resource):
    """Handle contact form email sending"""

    def post(self):
        """Send contact form email"""
        try:
            from marshmallow import Schema, fields, ValidationError
            from app.utils.email_util import send_email

            # Define validation schema inline
            class ContactEmailSchema(Schema):
                name = fields.Str(required=True, validate=fields.Length(min=1, max=100))
                email = fields.Email(required=True)
                subject = fields.Str(
                    required=True, validate=fields.Length(min=1, max=200)
                )
                body = fields.Str(
                    required=True, validate=fields.Length(min=1, max=2000)
                )

            schema = ContactEmailSchema()

            try:
                data = schema.load(request.get_json() or {})
            except ValidationError as e:
                return {"message": "Validation error", "errors": e.messages}, 400

            # Format email body with sender information
            formatted_body = (
                f"Name: {data['name']}\nEmail: {data['email']}\n\n{data['body']}"
            )

            # Send email to multiple recipients
            receiver_emails = (
                f"{data['email']}, n8.young@gmail.com, anikwehenryasa@gmail.com"
            )

            send_email(
                receiver_email=receiver_emails,
                subject=data["subject"],
                plaintext=formatted_body,
            )

            return {"success": True, "message": "Email sent successfully"}, 200

        except Exception as e:
            log_exception(logger, "Error sending contact email")
            return {"success": False, "message": f"Error sending email: {str(e)}"}, 500
