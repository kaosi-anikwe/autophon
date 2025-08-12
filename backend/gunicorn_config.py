import os
from dotenv import load_dotenv

load_dotenv()

# gunicorn config
bind = "unix:app.sock"
workers = 3

accesslog = os.path.join(os.getenv("CURRENT_DIR"), "backend", "logs", "run.log")
errorlog = os.path.join(os.getenv("CURRENT_DIR"), "backend", "logs", "run.log")
