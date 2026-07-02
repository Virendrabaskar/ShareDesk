import io
import socket

import qrcode
from flask import Blueprint, jsonify, request, send_file

from ..models import Setting

qrcode_bp = Blueprint("qrcode_api", __name__, url_prefix="/api")


def _lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return socket.gethostname()


@qrcode_bp.route("/qrcode", methods=["GET"])
def get_qrcode():
    if not Setting.get_bool("enable_qr_code", True):
        return jsonify({"error": "QR code disabled"}), 404

    port = request.host.split(":")[-1] if ":" in request.host else "80"
    url = f"http://{_lan_ip()}:{port}/"
    img = qrcode.make(url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return send_file(buf, mimetype="image/png")
