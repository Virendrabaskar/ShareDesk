#!/usr/bin/env bash
# Start ShareDesk for local/LAN use.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

VENV_DIR="sharedesk-env"

if [ ! -d "$VENV_DIR" ]; then
  echo "Creating virtual environment in $VENV_DIR ..."
  python3 -m venv "$VENV_DIR"
  "$VENV_DIR/bin/pip" install -q -r requirements.txt
fi

exec "$VENV_DIR/bin/python" app.py
