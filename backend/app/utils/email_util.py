import os
import ssl
import smtplib
from dotenv import load_dotenv
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.utils.logger import get_logger

load_dotenv()

logger = get_logger(__name__)


# Common email sending function
def send_email(receiver_email, subject, plaintext, html=None):
    # Connection configuration
    SMTP_SERVER = os.getenv("SMTP_SERVER")
    PORT = 587
    SENDER_EMAIL = os.getenv("SENDER_EMAIL")
    PASSWORD = os.getenv("PASSWORD")

    # Message setup
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = SENDER_EMAIL
    message["To"] = receiver_email

    # Turn text into plain or HTML MIMEText objects
    part1 = MIMEText(plaintext, "plain")
    part2 = MIMEText(html, "html") if html else None

    # Add HTML/plain-text parts to MIMEMultipart message
    # The email client will try to render the last part first
    message.attach(part1)
    message.attach(part2) if part2 else None

    # Create a secure SSL context
    context = ssl.create_default_context()

    # Try to log in to server and send email
    try:
        server = smtplib.SMTP(SMTP_SERVER, PORT)
        server.ehlo()
        server.starttls(context=context)  # Secure the connection
        server.ehlo()
        server.login(SENDER_EMAIL, PASSWORD)
        server.send_message(message)
    except Exception as e:
        # Print error messages to stdout
        logger.error(e)
        return False
    finally:
        server.quit()
        return True
