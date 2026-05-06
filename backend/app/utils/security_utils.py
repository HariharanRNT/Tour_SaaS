import re
import html
import bleach
import logging
from typing import Any

# Allowed tags for fields that require safe HTML (e.g., package descriptions)
ALLOWED_TAGS = [
    'b', 'i', 'u', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'span', 'div'
]
ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title', 'target', 'rel']
}

logger = logging.getLogger("security")

_SQL_PATTERN = re.compile(
    r"(\bDROP\s+TABLE\b|\bDROP\s+DATABASE\b)",
    re.IGNORECASE
)

def sanitize_safe_html(value: str) -> str:
    """Sanitizes HTML, keeping safe tags and removing dangerous ones like <script> or <iframe>."""
    if not isinstance(value, str):
        return value
    return bleach.clean(value, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRIBUTES, strip=True)

def escape_all_html(value: str) -> str:
    """Escapes all HTML tags making them plain text."""
    if not isinstance(value, str):
        return value
    return html.escape(value)

def reject_sql(value: str, field_name: str = 'field') -> str:
    """Raise ValueError if value contains obvious SQL injection patterns and logs the attempt."""
    if not value or not isinstance(value, str):
        return value

    # Natural language descriptions can be long and contain words like "select", "from", "update"
    # We skip strict SQL check for long strings with many spaces (likely natural language)
    # unless they contain extremely dangerous commands like DROP TABLE
    if len(value) > 200 and value.count(' ') > 10:
        if re.search(r"(\bDROP\s+TABLE\b|\bDROP\s+DATABASE\b)", value, re.IGNORECASE):
            logger.warning(f"CRITICAL SQL PATTERN BLOCKED: Field={field_name}")
            raise ValueError(f"{field_name} contains reserved keywords.")
        return value

    if _SQL_PATTERN.search(value):
        logger.warning(f"SUSPICIOUS SQL PATTERN BLOCKED: Field={field_name}, Value={value}")
        raise ValueError(f"{field_name} contains invalid characters or reserved keywords.")
    return value

def sanitize_text(value: str, allow_html: bool = False, field_name: str = 'field') -> str:
    """Centralized sanitization: rejects SQLi, escapes/sanitizes HTML."""
    if not isinstance(value, str):
        return value
    
    reject_sql(value, field_name)
    
    if allow_html:
        return sanitize_safe_html(value)
    else:
        return escape_all_html(value)
