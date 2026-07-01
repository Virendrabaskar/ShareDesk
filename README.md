# ShareDesk

A lightweight, self-hosted shared clipboard and temporary file-sharing service
for devices on the same local network. Browser-based, no client installs,
Python + SQLite only.

## Quick start (development)

```bash
python3 -m venv sharedesk-env
source sharedesk-env/bin/activate
pip install -r requirements.txt
python app.py
```

Open `http://<this-machine-ip>:8383` from any device on the LAN.

## Production

```bash
source sharedesk-env/bin/activate
gunicorn -w 2 -b 0.0.0.0:8383 app:app
```

Or run as a systemd service:

```bash
sudo cp deploy/sharedesk.service /etc/systemd/system/sharedesk.service
sudo systemctl daemon-reload
sudo systemctl enable --now sharedesk
```

Edit `WorkingDirectory`, `User`/`Group`, and the venv path in the unit file
to match your deployment location first.

## Configuration

Process-level options (require a restart) live in `config.py` or can be
overridden with environment variables: `SHAREDESK_HOST`, `SHAREDESK_PORT`,
`SHAREDESK_DATABASE_PATH`, `SHAREDESK_UPLOAD_FOLDER`, `SHAREDESK_SECRET_KEY`.

Everything else (app title, password protection, theme, upload size limit,
clipboard history limit, file retention, QR code toggle) is editable live
from the **Settings** page and stored in the SQLite database.

## Features

- Shared clipboard with pin, search, edit, expiration, and history limit
- Drag & drop multi-file upload with previews (images, PDF, text, audio, video, markdown)
- Download links, rename, delete, download counts
- QR code to open ShareDesk on mobile
- Per-device name attached to clipboard entries and uploads
- Global instant search across clipboard and files
- Optional single shared-password protection
- Light/dark/auto theme
