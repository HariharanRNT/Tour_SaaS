"""
Centralized API Logger Middleware.

Wraps every request, records timing, masks sensitive data, and
writes an APILog row asynchronously (fire-and-forget) so it never
adds latency to actual API responses.
"""
from __future__ import annotations

import asyncio
import json
import re
import time
import traceback
import uuid
from typing import Any, Dict, Optional, Set

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.database import AsyncSessionLocal
from app.models import APILog
from app.config import settings

# ──────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────

# Paths that should NEVER be logged (health-checks, docs, assets)
SKIP_PATHS: Set[str] = {
    "/",
    "/health",
    "/api/docs",
    "/api/redoc",
    "/api/openapi.json",
}
SKIP_PREFIXES: tuple = ("/static/",)

# Fields whose values must be masked wherever they appear in a dict
SENSITIVE_KEYS: Set[str] = {
    "password",
    "password_hash",
    "confirm_password",
    "new_password",
    "old_password",
    "token",
    "access_token",
    "refresh_token",
    "id_token",
    "otp",
    "otp_code",
    "key_secret",
    "key_id",
    "smtp_password",
    "razorpay_signature",
    "webhook_secret",
    "secret",
    "authorization",
}

# Maximum size (bytes) to store for request / response bodies
MAX_BODY_BYTES = 10_240  # 10 KB

# Status codes that classify as "success"
SUCCESS_CODES: Set[int] = set(range(100, 400))

# Mapping of status code → error_type label
ERROR_TYPE_MAP = {
    400: "validation",
    401: "auth",
    403: "auth",
    404: "not_found",
    405: "validation",
    409: "validation",
    422: "validation",
    429: "rate_limit",
}


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def _mask(data: Any, depth: int = 0) -> Any:
    """Recursively mask sensitive values in dicts / lists."""
    if depth > 8:
        return data
    if isinstance(data, dict):
        return {
            k: ("***MASKED***" if k.lower() in SENSITIVE_KEYS else _mask(v, depth + 1))
            for k, v in data.items()
        }
    if isinstance(data, list):
        return [_mask(item, depth + 1) for item in data]
    return data


def _truncate_str(s: str, max_len: int = MAX_BODY_BYTES) -> str:
    if len(s) > max_len:
        return s[:max_len] + "…[TRUNCATED]"
    return s


def _safe_json(raw: bytes) -> Optional[Any]:
    """Parse bytes to JSON; return None if not valid JSON."""
    try:
        text = raw.decode("utf-8", errors="replace")
        text = _truncate_str(text)
        return json.loads(text)
    except Exception:
        try:
            return raw.decode("utf-8", errors="replace")[:MAX_BODY_BYTES]
        except Exception:
            return None


def _classify_error_type(status_code: int) -> Optional[str]:
    if status_code in ERROR_TYPE_MAP:
        return ERROR_TYPE_MAP[status_code]
    if status_code >= 500:
        return "server"
    return None


def _extract_headers(request: Request) -> Dict[str, str]:
    """Keep only useful request headers; mask Authorization."""
    keep = {"content-type", "x-forwarded-for", "x-real-ip", "user-agent", "origin", "referer", "authorization"}
    result = {}
    for k, v in request.headers.items():
        k_lower = k.lower()
        if k_lower in keep:
            result[k_lower] = ("***MASKED***" if k_lower == "authorization" else v)
    return result


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return ""


# ──────────────────────────────────────────────────────────────
# JWT user extraction (best-effort, no exception propagation)
# ──────────────────────────────────────────────────────────────

def _extract_user_from_request(request: Request) -> tuple[Optional[str], Optional[str]]:
    """
    Try to decode user_id and role from the JWT in Authorization header.
    Returns (user_id_str, role_str) — both None on any failure.
    """
    try:
        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            return None, None
        token = auth_header[7:]
        import jwt as _jwt  # type: ignore
        payload = _jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": False},
        )
        return str(payload.get("sub")), payload.get("role")
    except Exception:
        return None, None


# ──────────────────────────────────────────────────────────────
# Async DB writer (fire-and-forget)
# ──────────────────────────────────────────────────────────────

async def _write_log(log_data: dict) -> None:
    """Write one APILog row. Called as a background task."""
    try:
        async with AsyncSessionLocal() as session:
            log = APILog(**log_data)
            session.add(log)
            await session.commit()
    except Exception as exc:
        # Never raise — logging must not crash the application
        import logging as _logging
        _logging.getLogger("api_logger").warning(f"Failed to write API log: {exc}")


# ──────────────────────────────────────────────────────────────
# Middleware class
# ──────────────────────────────────────────────────────────────

class APILoggerMiddleware:
    """
    Non-blocking ASGI middleware that logs every API request/response
    to the `api_logs` table using an async background task.
    
    Refactored to pure ASGI to resolve 'RuntimeError: Unexpected message received: http.request'
    which occurs with BaseHTTPMiddleware when multiple middlewares interact with the request body.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Dict[str, Any], receive: Any, send: Any) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        # ── Skip non-API paths ──
        if path in SKIP_PATHS or any(path.startswith(pfx) for pfx in SKIP_PREFIXES):
            await self.app(scope, receive, send)
            return

        # ── Capture state ──
        start_time = time.perf_counter()
        request_body_raw = b""
        response_body_raw = b""
        status_code = [500]  # Use a list to make it mutable in the closure

        # ── Wrapper for Receive (to capture request body) ──
        async def wrapped_receive():
            nonlocal request_body_raw
            message = await receive()
            if message["type"] == "http.request":
                # We append chunks; Starlette usually sends one chunk for Small/Medium requests
                request_body_raw += message.get("body", b"")
            return message

        # ── Wrapper for Send (to capture response body and status code) ──
        async def wrapped_send(message):
            nonlocal response_body_raw
            if message["type"] == "http.response.start":
                status_code[0] = message.get("status", 500)
            elif message["type"] == "http.response.body":
                response_body_raw += message.get("body", b"")
            await send(message)

        # ── Call the actual app ──
        exc_message: Optional[str] = None
        exc_trace: Optional[str] = None
        
        try:
            await self.app(scope, wrapped_receive, wrapped_send)
        except Exception as exc:
            status_code[0] = 500
            exc_message = str(exc)
            exc_trace = traceback.format_exc() if settings.DEBUG else None
            # Re-raise so global exception handler or Starlette can handle it
            # But we still want to log it below
            raise exc
        finally:
            # ── Post-request logging ──
            # We do this in finally to ensure it runs even if request was cancelled or failed
            try:
                duration_ms = (time.perf_counter() - start_time) * 1000
                
                # We use the Request object for convenience helpers (headers, IP, etc.)
                # But we don't call await request.body() as we already captured it
                # Note: request.query_params is safe as it reads from scope
                request = Request(scope)
                
                # ── Parse request body ──
                request_body = None
                if request_body_raw:
                    parsed_req = _safe_json(request_body_raw)
                    if isinstance(parsed_req, dict):
                        request_body = _mask(parsed_req)
                    elif parsed_req is not None:
                        request_body = {"_raw": str(parsed_req)[:MAX_BODY_BYTES]}

                # ── Parse response body ──
                response_body = None
                if response_body_raw:
                    parsed_resp = _safe_json(response_body_raw)
                    if isinstance(parsed_resp, dict):
                        response_body = _mask(parsed_resp)

                # ── Headers ──
                request_headers = _extract_headers(request)

                # ── User context (best-effort JWT decode) ──
                user_id_str, user_role = _extract_user_from_request(request)

                # ── Classify status ──
                final_status_code = status_code[0]
                is_success = final_status_code in SUCCESS_CODES
                status = "success" if is_success else "error"
                error_type = None if is_success else _classify_error_type(final_status_code)
                error_message = exc_message
                stack_trace = exc_trace

                # Extract error message from response body if available
                if not is_success and not error_message and isinstance(response_body, dict):
                    error_message = (
                        response_body.get("detail")
                        or response_body.get("message")
                        or response_body.get("error")
                    )
                    if isinstance(error_message, list):
                        error_message = json.dumps(error_message)[:1000]
                    elif error_message:
                        error_message = str(error_message)[:1000]

                # ── Build log record ──
                log_data = {
                    "id": uuid.uuid4(),
                    "method": request.method,
                    "endpoint": path,
                    "query_params": dict(request.query_params) or None,
                    "request_body": request_body,
                    "request_headers": request_headers,
                    "status_code": final_status_code,
                    "status": status,
                    "response_body": response_body,
                    "duration_ms": round(duration_ms, 2),
                    "error_type": error_type,
                    "error_message": error_message,
                    "stack_trace": stack_trace,
                    "user_id": user_id_str,
                    "user_role": user_role,
                    "ip_address": _get_client_ip(request),
                    "user_agent": request.headers.get("user-agent", "")[:500],
                }

                # ── Fire-and-forget DB write ──
                asyncio.create_task(_write_log(log_data))

            except Exception as inner_exc:
                # Never let logging logic crash the main thread
                import logging as _logging
                _logging.getLogger("api_logger").warning(f"Error preparing API log: {inner_exc}")
