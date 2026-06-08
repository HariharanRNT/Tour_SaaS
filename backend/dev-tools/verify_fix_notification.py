
import sys
import os

# Add the app directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'app'))
sys.path.append(os.getcwd())

from app.utils.customer_email_templates import get_customer_notification_template_config, get_customer_notification_html_content, get_customer_notification_html
from app.utils.template_renderer import render_template

def simulate_send_notification(template_type, data):
    # 1. Get the template configuration
    template_config = get_customer_notification_template_config(template_type, data)
    
    # 2. Get the HTML content
    html_content = template_config.get("html_content") or get_customer_notification_html_content(template_type)
    
    # 3. Render template with data
    html_body = render_template(html_content, data, template_type=template_type)
    subject = template_config.get("subject")

    # 4. Fallback logic (The Fix)
    if not html_body:
        legacy_subject, legacy_html = get_customer_notification_html(template_type, data)
        if legacy_html:
            html_body = legacy_html
            if subject == "Notification" or not subject:
                subject = legacy_subject
                
    return subject, html_body

def test_template(template_type):
    data = {
        "customer_name": "Test User", 
        "reference_id": "REF123", 
        "package_name": "Test Pkg",
        "refund_amount": "₹500.00",
        "travel_date": "2024-12-25",
        "cancellation_date": "2024-11-01"
    }
    subject, body = simulate_send_notification(template_type, data)
    print(f"Template: {template_type}")
    print(f"Subject: {subject}")
    print(f"Body length: {len(body)}")
    print(f"Body start: {body[:100].strip()}")
    print(f"Contains 'Dear Agent': {'Dear Agent' in body}")
    print("-" * 20)

print("Verifying Fix...")
test_template("booking_cancellation")
test_template("agent_cancellation_alert")
