import logging
import os
import sys
from logging.handlers import RotatingFileHandler

from flask import request

import config as app_config

FORMAT = "%(asctime)s %(levelname)s %(name)s: %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def configure_logging(app):
    root_logger = logging.getLogger()
    if root_logger.handlers:
        return  # already configured (e.g. re-entrant create_app() calls)

    level = getattr(logging, app_config.LOG_LEVEL.upper(), logging.INFO)
    formatter = logging.Formatter(FORMAT, DATE_FORMAT)

    root_logger.setLevel(level)

    console_handler = logging.StreamHandler(sys.stderr)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    if app_config.LOG_FILE:
        os.makedirs(os.path.dirname(app_config.LOG_FILE), exist_ok=True)
        file_handler = RotatingFileHandler(
            app_config.LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3
        )
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)

    @app.after_request
    def _log_request(response):
        device = request.headers.get("X-Device-Name", "-")
        app.logger.info(
            '%s "%s %s" %s (device=%s)',
            request.remote_addr,
            request.method,
            request.path,
            response.status_code,
            device,
        )
        return response
