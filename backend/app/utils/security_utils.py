import re
import html
import bleach
from typing import Any

# Allowed tags for fields that require safe HTML (e.g., package descriptions)
ALLOWED_TAGS = [
    'b', 'i', 'u', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'span', 'div'
]
ALLOWED_ATTRIBUTES = {
    '*': ['class', 'style', 'id'],
    'a': ['href', 'title', 'target', 'rel']
}

_SQL_PATTERN = re.compile(
    r"(\bDROP\s+TABLE\b|\bDROP\s+DATABASE\b|\bUNION\s+SELECT\b|\bSELECT\b.*\bFROM\b|\bINSERT\s+INTO\b|\bDELETE\s+FROM\b|\bUPDATE\b.*\bSET\b|'\s+OR\s+|xp_)",
    re.IGNORECASE | re.DOTALL
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
    """Raise ValueError if value contains obvious SQL injection patterns."""
    if value and isinstance(value, str) and _SQL_PATTERN.search(value):
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
