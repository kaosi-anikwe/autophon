import os
from PIL import Image, ImageDraw, ImageFont

UPLOADS = os.getenv("UPLOADS")
ADMIN_UPDATES = os.getenv("ADMIN_UPDATES")


def generate_user_icon(name, user_id, force=False):
    image_path = os.path.join(UPLOADS, user_id, "profile.png")
    os.makedirs(os.path.dirname(image_path), exist_ok=True)
    if not os.path.exists(image_path) or force:
        # Load the template image
        template_path = os.path.join(ADMIN_UPDATES, "profile_template.png")
        image = Image.open(template_path).convert("RGBA")
        # Create a drawing context
        draw = ImageDraw.Draw(image)
        # Get the user's initials
        initials = f"{name.split()[0][:2]}{name.split()[1][:2]}"
        # Define the font size and type
        font_size = 100
        font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        font = ImageFont.truetype(font_path, font_size)
        # Get the size of the image and the text
        image_width, image_height = image.size
        text_width, text_height = draw.textsize(initials, font=font)
        # Calculate the position to center the text on the image
        x = (image_width - text_width) / 2 + 5
        y = (image_height - text_height) / 2 - 10
        # Draw the initials on the image
        draw.text((x, y), initials, font=font, fill="black")
        # Save to user folder
        image_path = os.path.join(UPLOADS, user_id, "profile.png")
        os.makedirs(os.path.dirname(image_path), exist_ok=True)
        image.save(image_path)
    return os.path.relpath(image_path)
