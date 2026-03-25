import os
import sys

# Set up paths
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.database import AsyncSessionLocal
    print("SUCCESS: Imported AsyncSessionLocal")
except ImportError as e:
    print(f"FAILURE: Could not import AsyncSessionLocal: {e}")

try:
    from app.services.customer_notification_service import CustomerNotificationService
    print("SUCCESS: Imported CustomerNotificationService")
except Exception as e:
    print(f"FAILURE: Could not import CustomerNotificationService: {e}")

try:
    from app.tasks.email_tasks import send_email_task
    print("SUCCESS: Imported send_email_task")
except Exception as e:
    print(f"FAILURE: Could not import send_email_task: {e}")
