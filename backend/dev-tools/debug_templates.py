
import sys
import os

# Add the app directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'app'))
sys.path.append(os.getcwd())

from app.utils.customer_email_templates import get_customer_notification_template_config, get_customer_notification_html_content
from app.utils.template_renderer import render_template

def test_template(template_type):
    data = {"customer_name": "Test User", "reference_id": "REF123", "package_name": "Test Pkg"}
    template_config = get_customer_notification_template_config(template_type, data)
    html_content = template_config.get("html_content") or get_customer_notification_html_content(template_type)
    html_body = render_template(html_content, data, template_type=template_type)
    subject = template_config.get("subject")
    print(f"Template: {template_type}")
    print(f"Subject: {subject}")
    print(f"Body length: {len(html_body)}")
    print(f"Body start: {html_body[:50]}")
    print("-" * 20)

test_template("booking_cancellation")
test_template("agent_cancellation_alert")
