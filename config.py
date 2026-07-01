"""
ShareDesk configuration.

This is the single Python configuration file referenced by the spec.
Values here are defaults used to seed the DB-backed Settings table on
first run. HOST/PORT/DATABASE_PATH/UPLOAD_FOLDER are process-level and
require an application restart to take effect; everything else can be
changed live from the Settings page.
"""

import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# --- Process-level settings (require restart to change) ---
HOST = os.environ.get("SHAREDESK_HOST", "0.0.0.0")
PORT = int(os.environ.get("SHAREDESK_PORT", 8383))
DATABASE_PATH = os.environ.get(
    "SHAREDESK_DATABASE_PATH", os.path.join(BASE_DIR, "instance", "sharedesk.db")
)
UPLOAD_FOLDER = os.environ.get(
    "SHAREDESK_UPLOAD_FOLDER", os.path.join(BASE_DIR, "uploads")
)
SECRET_KEY = os.environ.get("SHAREDESK_SECRET_KEY", "dev-secret-key-change-me")

LOG_LEVEL = os.environ.get("SHAREDESK_LOG_LEVEL", "INFO")
# Empty by default: logs go to stderr only. Set to a path to also log to a
# rotating file (e.g. SHAREDESK_LOG_FILE=/var/log/sharedesk.log).
LOG_FILE = os.environ.get("SHAREDESK_LOG_FILE", "")

# --- Defaults used to seed the DB-backed Settings table ---
DEFAULT_SETTINGS = {
    "app_title": "ShareDesk",
    "max_upload_size_mb": "512",
    "max_history_items": "500",
    "file_retention_days": "0",  # 0 = keep forever
    "password_enabled": "false",
    "password": "",
    "enable_qr_code": "true",
    "lan_only": "true",
    "theme": "auto",  # light | dark | auto
}

ALLOWED_EXTENSIONS = None  # None = allow any file type (validated by size only)
