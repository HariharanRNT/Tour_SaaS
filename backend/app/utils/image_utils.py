# Base64 inlining is NOT used — it breaks Gmail and bloats email size

def get_logo_img_tag(url: str, height: str = "40px", alt: str = "Logo") -> str:
    """
    Returns a simple <img> tag for external logo URL.
    Gmail renders this correctly.
    Outlook will show alt text if images are blocked (user must click Download Pictures).
    """
    if not url:
        return f'<span style="font-family:Arial,sans-serif;font-size:18px;font-weight:bold;color:#1e293b;">{alt}</span>'

    h = height.replace("px", "")
    return (
        f'<img src="{url}" '
        f'height="{h}" '
        f'width="auto" '
        f'border="0" '
        f'style="height:{height}; width:auto; max-width:200px; '
        f'display:block; margin:0 auto; outline:none; text-decoration:none;" '
        f'alt="{alt}" />'
    )
