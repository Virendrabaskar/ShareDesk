from flask import Blueprint, jsonify, request

from ..models import Clipboard, FileEntry

search_bp = Blueprint("search_api", __name__, url_prefix="/api")


@search_bp.route("/search", methods=["GET"])
def global_search():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"clipboard": [], "files": []})

    clipboard_matches = (
        Clipboard.query.filter(Clipboard.text.ilike(f"%{query}%"))
        .order_by(Clipboard.pinned.desc(), Clipboard.created_at.desc())
        .limit(20)
        .all()
    )
    file_matches = (
        FileEntry.query.filter(FileEntry.original_name.ilike(f"%{query}%"))
        .order_by(FileEntry.uploaded_at.desc())
        .limit(20)
        .all()
    )

    return jsonify({
        "clipboard": [c.to_dict() for c in clipboard_matches],
        "files": [f.to_dict() for f in file_matches],
    })
