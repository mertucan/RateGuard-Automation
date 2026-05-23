import json
import logging
import time
import traceback
import uuid

from flask import g, jsonify, request
from werkzeug.exceptions import HTTPException


LOGGER_NAME = "rateguard"


def configure_logging():
    logger = logging.getLogger(LOGGER_NAME)
    if logger.handlers:
        return logger
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    return logger


def log_event(event, **fields):
    logger = configure_logging()
    payload = {
        "event": event,
        "request_id": getattr(g, "request_id", None),
        **fields,
    }
    logger.info(json.dumps(payload, ensure_ascii=False, default=str))


def register_observability(app):
    configure_logging()

    @app.before_request
    def start_request_context():
        g.request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        g.request_started_at = time.perf_counter()

    @app.after_request
    def add_observability_headers(response):
        duration_ms = round((time.perf_counter() - getattr(g, "request_started_at", time.perf_counter())) * 1000, 2)
        response.headers.setdefault("X-Request-Id", getattr(g, "request_id", ""))
        log_event(
            "request",
            method=request.method,
            path=request.path,
            status=response.status_code,
            duration_ms=duration_ms,
            remote_addr=request.headers.get("X-Forwarded-For", request.remote_addr),
        )
        return response

    @app.errorhandler(HTTPException)
    def handle_http_exception(exc):
        response = jsonify(
            {
                "error": exc.description or exc.name,
                "request_id": getattr(g, "request_id", None),
            }
        )
        response.status_code = exc.code or 500
        return response

    @app.errorhandler(Exception)
    def handle_unexpected_exception(exc):
        log_event(
            "unhandled_exception",
            method=request.method,
            path=request.path,
            error_type=type(exc).__name__,
            error=str(exc),
            traceback=traceback.format_exc(),
        )
        response = jsonify(
            {
                "error": "Internal server error",
                "request_id": getattr(g, "request_id", None),
            }
        )
        response.status_code = 500
        return response
