from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

devices_bp = Blueprint("devices_api", __name__, url_prefix="/api/devices")

# In-memory store: {device_name: last_seen_utc}
_seen: dict[str, datetime] = {}
_ONLINE_THRESHOLD_SECONDS = 30


@devices_bp.route("/heartbeat", methods=["POST"])
def heartbeat():
    name = request.headers.get("X-Device-Name", "").strip()
    if name:
        _seen[name] = datetime.now(timezone.utc)
    return "", 204


@devices_bp.route("", methods=["GET"])
def list_devices():
    now = datetime.now(timezone.utc)
    online = [
        name
        for name, ts in _seen.items()
        if (now - ts).total_seconds() <= _ONLINE_THRESHOLD_SECONDS
    ]
    return jsonify(online)
