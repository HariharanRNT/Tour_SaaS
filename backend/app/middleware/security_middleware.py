import json
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.utils.security_utils import sanitize_text

logger = logging.getLogger("security")

class RequestSanitizationMiddleware:
    """
    Pure ASGI Middleware to intercept request bodies and sanitize all string fields
    to prevent XSS and SQL injection globally.
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        if scope["method"] in ["POST", "PUT", "PATCH"]:
            # Check content-type
            headers = dict(scope.get("headers", []))
            content_type = headers.get(b"content-type", b"").decode("latin-1")
            
            if "application/json" in content_type:
                try:
                    # 1. Consume the request body
                    body = b""
                    more_body = True
                    while more_body:
                        message = await receive()
                        body += message.get("body", b"")
                        more_body = message.get("more_body", False)

                    # 2. Parse and sanitize
                    if body:
                        data = json.loads(body)
                        sanitized_data = self._sanitize_payload(data)
                        new_body = json.dumps(sanitized_data).encode()
                    else:
                        new_body = b""

                    # 3. Create a fake receive function to inject the new body
                    received = False
                    async def fake_receive():
                        nonlocal received
                        if not received:
                            received = True
                            return {"type": "http.request", "body": new_body, "more_body": False}
                        return {"type": "http.disconnect"}

                    # Update content-length header
                    new_headers = []
                    for k, v in scope.get("headers", []):
                        if k.lower() == b"content-length":
                            new_headers.append((b"content-length", str(len(new_body)).encode("latin-1")))
                        else:
                            new_headers.append((k, v))
                    scope["headers"] = new_headers

                    # 4. Call the next application with the fake receive
                    await self.app(scope, fake_receive, send)
                    return
                except Exception as e:
                    logger.error(f"Error in RequestSanitizationMiddleware: {str(e)}")
                    # On parsing error, the original body is consumed, so we should reconstruct it.
                    # For simplicity and to avoid hangs, we'll pass an empty body or the original body
                    # Since we consumed the original body, we must pass it down using fake_receive
                    received_err = False
                    async def fake_receive_err():
                        nonlocal received_err
                        if not received_err:
                            received_err = True
                            return {"type": "http.request", "body": body, "more_body": False}
                        return {"type": "http.disconnect"}
                    await self.app(scope, fake_receive_err, send)
                    return

        # Not POST/PUT/PATCH or not application/json
        await self.app(scope, receive, send)

    def _sanitize_payload(self, data):
        """Recursively sanitize strings in nested dictionaries and lists."""
        if isinstance(data, dict):
            # We don't know if a field allows HTML here, so we default to allow_html=True
            # and rely on specific Pydantic validators for more strictness if needed.
            # However, for global safety, we use allow_html=True but bleach will strip tags.
            return {k: self._sanitize_payload(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self._sanitize_payload(v) for v in data]
        elif isinstance(data, str):
            # We use allow_html=True to keep safe tags but strip dangerous ones like <script>
            return sanitize_text(data, allow_html=True)
        return data
