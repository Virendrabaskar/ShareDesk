from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def utcnow():
    return datetime.now(timezone.utc)


class Clipboard(db.Model):
    __tablename__ = "clipboard"

    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text, nullable=False)
    device_name = db.Column(db.String(120), nullable=True)
    pinned = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)
    expires_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "text": self.text,
            "device_name": self.device_name,
            "pinned": self.pinned,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
        }


class FileEntry(db.Model):
    __tablename__ = "files"

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)  # name on disk
    original_name = db.Column(db.String(255), nullable=False)  # display name
    mime_type = db.Column(db.String(120), nullable=True)
    size = db.Column(db.Integer, nullable=False, default=0)
    uploaded_by = db.Column(db.String(120), nullable=True)
    uploaded_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    download_count = db.Column(db.Integer, nullable=False, default=0)

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "original_name": self.original_name,
            "mime_type": self.mime_type,
            "size": self.size,
            "uploaded_by": self.uploaded_by,
            "uploaded_at": self.uploaded_at.isoformat(),
            "download_count": self.download_count,
        }


class Setting(db.Model):
    __tablename__ = "settings"

    key = db.Column(db.String(64), primary_key=True)
    value = db.Column(db.Text, nullable=True)

    @staticmethod
    def seed_defaults(defaults: dict):
        existing = {row.key for row in Setting.query.all()}
        for key, value in defaults.items():
            if key not in existing:
                db.session.add(Setting(key=key, value=value))
        db.session.commit()

    @staticmethod
    def get_all() -> dict:
        return {row.key: row.value for row in Setting.query.all()}

    @staticmethod
    def get(key: str, default=None):
        row = Setting.query.get(key)
        return row.value if row is not None else default

    @staticmethod
    def get_bool(key: str, default=False) -> bool:
        value = Setting.get(key, None)
        if value is None:
            return default
        return str(value).lower() in ("1", "true", "yes", "on")

    @staticmethod
    def set(key: str, value):
        row = Setting.query.get(key)
        if row is None:
            row = Setting(key=key, value=str(value))
            db.session.add(row)
        else:
            row.value = str(value)
        db.session.commit()
