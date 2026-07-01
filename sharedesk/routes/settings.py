from flask import Blueprint, jsonify, request

from ..models import Setting

settings_bp = Blueprint("settings_api", __name__, url_prefix="/api/settings")

EDITABLE_KEYS = {
    "app_title",
    "max_upload_size_mb",
    "max_history_items",
    "file_retention_days",
    "password_enabled",
    "password",
    "enable_qr_code",
    "lan_only",
    "theme",
}


@settings_bp.route("", methods=["GET"])
def get_settings():
    data = Setting.get_all()
    data.pop("password", None)  # never expose the password value
    return jsonify(data)


@settings_bp.route("", methods=["PUT"])
def update_settings():
    data = request.get_json(silent=True) or {}
    unknown = set(data.keys()) - EDITABLE_KEYS
    if unknown:
        return jsonify({"error": f"unknown setting(s): {', '.join(sorted(unknown))}"}), 400

    for key, value in data.items():
        if key == "password" and not value:
            continue  # don't overwrite existing password with blank
        Setting.set(key, value)

    result = Setting.get_all()
    result.pop("password", None)
    return jsonify(result)
