from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from ..models import Clipboard, Setting, db

clipboard_bp = Blueprint("clipboard_api", __name__, url_prefix="/api/clipboard")


def _prune_expired():
    now = datetime.now(timezone.utc)
    Clipboard.query.filter(
        Clipboard.expires_at.isnot(None), Clipboard.expires_at < now
    ).delete(synchronize_session=False)
    db.session.commit()


def _enforce_history_limit():
    limit = int(Setting.get("max_history_items", 500) or 500)
    total = Clipboard.query.filter_by(pinned=False).count()
    if total > limit:
        overflow = (
            Clipboard.query.filter_by(pinned=False)
            .order_by(Clipboard.created_at.asc())
            .limit(total - limit)
            .all()
        )
        for entry in overflow:
            db.session.delete(entry)
        db.session.commit()


@clipboard_bp.route("", methods=["GET"])
def list_clipboard():
    _prune_expired()
    query = request.args.get("q", "").strip()
    q = Clipboard.query
    if query:
        q = q.filter(Clipboard.text.ilike(f"%{query}%"))
    entries = q.order_by(Clipboard.pinned.desc(), Clipboard.created_at.desc()).all()
    return jsonify([e.to_dict() for e in entries])


@clipboard_bp.route("", methods=["POST"])
def create_clipboard():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400

    expires_at = None
    if data.get("expires_at"):
        try:
            expires_at = datetime.fromisoformat(data["expires_at"])
        except ValueError:
            return jsonify({"error": "invalid expires_at"}), 400

    entry = Clipboard(
        text=text,
        device_name=data.get("device_name") or request.headers.get("X-Device-Name"),
        pinned=bool(data.get("pinned", False)),
        expires_at=expires_at,
    )
    db.session.add(entry)
    db.session.commit()
    _enforce_history_limit()
    return jsonify(entry.to_dict()), 201


@clipboard_bp.route("/<int:entry_id>", methods=["PUT"])
def update_clipboard(entry_id):
    entry = Clipboard.query.get_or_404(entry_id)
    data = request.get_json(silent=True) or {}

    if "text" in data:
        text = (data["text"] or "").strip()
        if not text:
            return jsonify({"error": "text is required"}), 400
        entry.text = text
    if "pinned" in data:
        entry.pinned = bool(data["pinned"])
    if "expires_at" in data:
        if data["expires_at"]:
            try:
                entry.expires_at = datetime.fromisoformat(data["expires_at"])
            except ValueError:
                return jsonify({"error": "invalid expires_at"}), 400
        else:
            entry.expires_at = None

    db.session.commit()
    return jsonify(entry.to_dict())


@clipboard_bp.route("/<int:entry_id>", methods=["DELETE"])
def delete_clipboard(entry_id):
    entry = Clipboard.query.get_or_404(entry_id)
    db.session.delete(entry)
    db.session.commit()
    return "", 204


@clipboard_bp.route("/clear", methods=["POST"])
def clear_clipboard():
    Clipboard.query.filter_by(pinned=False).delete()
    db.session.commit()
    return "", 204
