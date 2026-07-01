"""
ShareDesk entrypoint.

Development:
    python app.py

Production (recommended):
    gunicorn -w 2 -b 0.0.0.0:8383 app:app
"""

import config
from sharedesk import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host=config.HOST, port=config.PORT)
