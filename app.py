"""
ShareDesk entrypoint.

Everyday LAN use:
    python app.py            (serves via Waitress, handles concurrent devices)

systemd / multi-worker deployment:
    gunicorn -w 2 -b 0.0.0.0:8383 app:app
"""

from waitress import serve

import config
from sharedesk import create_app

app = create_app()

if __name__ == "__main__":
    serve(app, host=config.HOST, port=config.PORT)
