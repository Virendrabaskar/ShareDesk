import io

import qrcode
from flask import Blueprint, jsonify, request, send_file

from ..models import Setting

qrcode_bp = Blueprint("qrcode_api", __name__, url_prefix="/api")


@qrcode_bp.route("/qrcode", methods=["GET"])
def get_qrcode():
    if not Setting.get_bool("enable_qr_code", True):
        return jsonify({"error": "QR code disabled"}), 404

    url = request.url_root
    img = qrcode.make(url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return send_file(buf, mimetype="image/png")
