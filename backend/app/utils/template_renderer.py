import re
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

from .email_shells import EMAIL_SHELLS

def render_template(content: Any, data: Dict[str, Any], template_type: str = None) -> str:
    """
    Renders email content. 
    If content is a string, treats it as raw HTML with {{variables}}.
    If content is a dict, uses the corresponding shell from EMAIL_SHELLS.
    """
    html = ""
    
    if isinstance(content, dict) and template_type in EMAIL_SHELLS:
        # Resolve structured JSON to HTML shell first
        html = EMAIL_SHELLS[template_type](content)
    elif isinstance(content, str):
        html = content
    else:
        return ""

    if not html:
        return ""
    
    def replace_match(match):
        key = match.group(1).strip()
        # Handle decimal/float formatting for amount keys
        val = data.get(key, f"{{{{{key}}}}}")
        
        if isinstance(val, (float, int)) and "amount" in key.lower():
            return f"{val:,.2f}"
        
        return str(val)

    # Regex to find {{ variable_name }}
    pattern = r"\{\{\s*([a-zA-Z0-0_]+)\s*\}\}"
    
    try:
        rendered = re.sub(pattern, replace_match, html)
        return rendered
    except Exception as e:
        logger.error(f"Error rendering template: {e}")
        return html
