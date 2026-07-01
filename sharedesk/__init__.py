import os

from flask import Flask
from flask_wtf import CSRFProtect
from flask_wtf.csrf import generate_csrf

import config as app_config
from .models import db, Setting

csrf = CSRFProtect()


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = app_config.SECRET_KEY
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{app_config.DATABASE_PATH}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["UPLOAD_FOLDER"] = app_config.UPLOAD_FOLDER
    # Flask enforces MAX_CONTENT_LENGTH before we can read DB settings, so we
    # apply the generous ceiling here and re-check the configured value inside
    # the upload route.
    app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024 * 1024  # 1 GB hard ceiling

    os.makedirs(os.path.dirname(app_config.DATABASE_PATH), exist_ok=True)
    os.makedirs(app_config.UPLOAD_FOLDER, exist_ok=True)

    db.init_app(app)
    csrf.init_app(app)
    app.jinja_env.globals["csrf_token"] = generate_csrf

    with app.app_context():
        db.create_all()
        Setting.seed_defaults(app_config.DEFAULT_SETTINGS)

    from .routes.pages import pages_bp
    from .routes.auth import auth_bp
    from .routes.clipboard import clipboard_bp
    from .routes.files import files_bp
    from .routes.settings import settings_bp
    from .routes.qrcode_route import qrcode_bp
    from .routes.search import search_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(pages_bp)
    app.register_blueprint(clipboard_bp)
    app.register_blueprint(files_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(qrcode_bp)
    app.register_blueprint(search_bp)

    from .auth import register_auth_guard

    register_auth_guard(app)

    return app
