import json
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.utils.security_utils import sanitize_text

logger = logging.getLogger("security")

class RequestSanitizationMiddleware(BaseHTTPMiddleware):
    """
    Middleware to intercept request bodies and sanitize all string fields
    to prevent XSS and SQL injection globally.
    """
    async def dispatch(self, request: Request, call_next):
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            if "application/json" in content_type:
                try:
                    # Read and parse body
                    body = await request.body()
                    if body:
                        data = json.loads(body)
                        
                        # Recursively sanitize
                        sanitized_data = self._sanitize_payload(data)
                        
                        # Re-encode body
                        new_body = json.dumps(sanitized_data).encode()
                        
                        # Replace the request's receive method to return sanitized body
                        async def receive():
                            return {"type": "http.request", "body": new_body}
                        
                        request._receive = receive
                except Exception as e:
                    logger.error(f"Error in RequestSanitizationMiddleware: {str(e)}")
                    # If parsing fails, we let it proceed (it will likely fail in Pydantic validation)
        
        response = await call_next(request)
        return response

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
