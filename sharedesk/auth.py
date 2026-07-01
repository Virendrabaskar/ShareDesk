from flask import redirect, request, session, url_for

from .models import Setting

# Endpoints reachable without being logged in.
EXEMPT_ENDPOINTS = {"auth.login", "static"}


def is_authenticated() -> bool:
    if not Setting.get_bool("password_enabled", False):
        return True
    return bool(session.get("authenticated"))


def register_auth_guard(app):
    @app.before_request
    def _enforce_auth():
        if request.endpoint in EXEMPT_ENDPOINTS:
            return None
        if request.endpoint is None:
            return None
        if is_authenticated():
            return None

        if request.path.startswith("/api/"):
            return {"error": "authentication required"}, 401
        return redirect(url_for("auth.login", next=request.path))
