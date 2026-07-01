from flask import Blueprint, render_template

from ..models import Setting

pages_bp = Blueprint("pages", __name__)


def _common_context():
    return {
        "app_title": Setting.get("app_title", "ShareDesk"),
        "enable_qr_code": Setting.get_bool("enable_qr_code", True),
        "theme": Setting.get("theme", "auto"),
        "password_enabled": Setting.get_bool("password_enabled", False),
    }


@pages_bp.route("/")
def clipboard_page():
    return render_template("clipboard.html", active="clipboard", **_common_context())


@pages_bp.route("/files")
def files_page():
    return render_template("files.html", active="files", **_common_context())


@pages_bp.route("/settings")
def settings_page():
    return render_template(
        "settings.html", active="settings", settings=Setting.get_all(), **_common_context()
    )


@pages_bp.route("/about")
def about_page():
    return render_template("about.html", active="about", **_common_context())
