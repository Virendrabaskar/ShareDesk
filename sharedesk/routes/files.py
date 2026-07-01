import mimetypes
import os
import uuid
from datetime import datetime, timedelta, timezone

from flask import Blueprint, current_app, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename

from ..models import FileEntry, Setting, db

files_bp = Blueprint("files_api", __name__, url_prefix="/api/files")

PREVIEWABLE_EXTENSIONS = {
    # images
    ".png": "image", ".jpg": "image", ".jpeg": "image", ".gif": "image",
    ".webp": "image", ".svg": "image", ".bmp": "image",
    # documents
    ".pdf": "pdf",
    # text / code
    ".txt": "text", ".log": "text", ".csv": "text", ".json": "text",
    ".xml": "text", ".py": "text", ".js": "text", ".css": "text",
    ".html": "text", ".sh": "text", ".yml": "text", ".yaml": "text",
    ".sql": "text",
    # markdown
    ".md": "markdown", ".markdown": "markdown",
    # audio
    ".mp3": "audio", ".wav": "audio", ".ogg": "audio", ".m4a": "audio",
    # video
    ".mp4": "video", ".webm": "video", ".ogv": "video",
}


def _upload_dir():
    return current_app.config["UPLOAD_FOLDER"]


def _prune_expired_files():
    retention_days = int(Setting.get("file_retention_days", 0) or 0)
    if retention_days <= 0:
        return
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    stale = FileEntry.query.filter(FileEntry.uploaded_at < cutoff).all()
    for entry in stale:
        _delete_file_entry(entry)


def _delete_file_entry(entry: FileEntry):
    path = os.path.join(_upload_dir(), entry.filename)
    if os.path.exists(path):
        os.remove(path)
    db.session.delete(entry)
    db.session.commit()


def _preview_kind(filename: str):
    ext = os.path.splitext(filename)[1].lower()
    return PREVIEWABLE_EXTENSIONS.get(ext)


@files_bp.route("", methods=["GET"])
def list_files():
    _prune_expired_files()
    query = request.args.get("q", "").strip()
    q = FileEntry.query
    if query:
        q = q.filter(FileEntry.original_name.ilike(f"%{query}%"))
    entries = q.order_by(FileEntry.uploaded_at.desc()).all()
    results = []
    for entry in entries:
        data = entry.to_dict()
        data["preview_kind"] = _preview_kind(entry.original_name)
        results.append(data)
    return jsonify(results)


@files_bp.route("/upload", methods=["POST"])
def upload_files():
    uploaded = request.files.getlist("files")
    if not uploaded:
        return jsonify({"error": "no files provided"}), 400

    max_size_bytes = int(float(Setting.get("max_upload_size_mb", 512) or 512)) * 1024 * 1024
    device_name = request.headers.get("X-Device-Name") or request.form.get("device_name")

    created = []
    errors = []
    upload_dir = _upload_dir()

    for file_storage in uploaded:
        if not file_storage or not file_storage.filename:
            continue

        original_name = secure_filename(file_storage.filename) or "file"
        ext = os.path.splitext(original_name)[1]
        stored_name = f"{uuid.uuid4().hex}{ext}"
        dest_path = os.path.join(upload_dir, stored_name)

        file_storage.save(dest_path)
        size = os.path.getsize(dest_path)

        if size > max_size_bytes:
            os.remove(dest_path)
            errors.append(f"{original_name}: exceeds max upload size")
            continue

        mime_type = file_storage.mimetype or mimetypes.guess_type(original_name)[0]

        entry = FileEntry(
            filename=stored_name,
            original_name=original_name,
            mime_type=mime_type,
            size=size,
            uploaded_by=device_name,
        )
        db.session.add(entry)
        created.append(entry)

    db.session.commit()

    status = 201 if created else 400
    return jsonify({
        "created": [e.to_dict() for e in created],
        "errors": errors,
    }), status


@files_bp.route("/<int:file_id>", methods=["GET"])
def download_file(file_id):
    entry = FileEntry.query.get_or_404(file_id)
    entry.download_count += 1
    db.session.commit()
    return send_from_directory(
        _upload_dir(), entry.filename, as_attachment=True, download_name=entry.original_name
    )


@files_bp.route("/<int:file_id>/preview", methods=["GET"])
def preview_file(file_id):
    entry = FileEntry.query.get_or_404(file_id)
    return send_from_directory(
        _upload_dir(), entry.filename, as_attachment=False,
        mimetype=entry.mime_type or mimetypes.guess_type(entry.original_name)[0]
    )


@files_bp.route("/<int:file_id>", methods=["PUT"])
def rename_file(file_id):
    entry = FileEntry.query.get_or_404(file_id)
    data = request.get_json(silent=True) or {}
    new_name = secure_filename((data.get("original_name") or "").strip())
    if not new_name:
        return jsonify({"error": "original_name is required"}), 400
    entry.original_name = new_name
    db.session.commit()
    return jsonify(entry.to_dict())


@files_bp.route("/<int:file_id>", methods=["DELETE"])
def delete_file(file_id):
    entry = FileEntry.query.get_or_404(file_id)
    _delete_file_entry(entry)
    return "", 204
