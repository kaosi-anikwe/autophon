import os
from dotenv import load_dotenv

load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://new.autophontest.se")


def get_password_reset_email(user_name, reset_token):
    """Generate password reset email content"""
    reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"

    subject = "Reset Your Autophon Password"

    plain_text = f"""
Hi {user_name},

You recently requested to reset your password for your Autophon account. Click the link below to reset it:

{reset_url}

This link will expire in 24 hours. If you did not request a password reset, please ignore this email.

Best regards,
The Autophon Team
"""

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c3e50;">Reset Your Autophon Password</h2>
        
        <p>Hi {user_name},</p>
        
        <p>You recently requested to reset your password for your Autophon account. Click the button below to reset it:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_url}" 
               style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
            </a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 3px;">
            {reset_url}
        </p>
        
        <p><strong>This link will expire in 24 hours.</strong></p>
        
        <p>If you did not request a password reset, please ignore this email.</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The Autophon Team
        </p>
    </div>
</body>
</html>
"""

    return subject, plain_text, html_content


def get_email_verification_email(user_name, verification_token):
    """Generate email verification email content"""
    verification_url = f"{FRONTEND_URL}/verify-email?token={verification_token}"

    subject = "Verify Your Autophon Email Address"

    plain_text = f"""
Hi {user_name},

Thank you for registering with Autophon! Please verify your email address by clicking the link below:

{verification_url}

This link will expire in 24 hours. If you did not create an Autophon account, please ignore this email.

Best regards,
The Autophon Team
"""

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Verify Your Email Address</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c3e50;">Welcome to Autophon!</h2>
        
        <p>Hi {user_name},</p>
        
        <p>Thank you for registering with Autophon! To complete your registration, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{verification_url}" 
               style="background-color: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email Address
            </a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 3px;">
            {verification_url}
        </p>
        
        <p><strong>This link will expire in 24 hours.</strong></p>
        
        <p>If you did not create an Autophon account, please ignore this email.</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The Autophon Team
        </p>
    </div>
</body>
</html>
"""

    return subject, plain_text, html_content
