from flask import Blueprint, redirect, render_template, request, session, url_for

from ..models import Setting

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if not Setting.get_bool("password_enabled", False):
        return redirect(url_for("pages.clipboard_page"))

    error = None
    if request.method == "POST":
        password = request.form.get("password", "")
        if password and password == Setting.get("password", ""):
            session["authenticated"] = True
            next_url = request.args.get("next") or url_for("pages.clipboard_page")
            return redirect(next_url)
        error = "Incorrect password."

    return render_template("login.html", error=error)


@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.pop("authenticated", None)
    return redirect(url_for("auth.login"))
