import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.customer_notification_service import CustomerNotificationService

async def test_templates():
    print("Testing Notification Templates Generation...")
    
    test_data = {
        "customer_name": "Test User",
        "package_name": "Goa Adventure Package",
        "reference_id": "BK-TEST-1234",
        "travel_date": "2026-12-01",
        "travelers": 2,
        "total_amount": 15000.00,
        "payment_method": "Credit Card",
        "payment_date": "2026-03-19",
        "itinerary_summary": "Day 1: Arrival<br>Day 2: Beach visit<br>Day 3: Departure",
        "booking_status": "Confirmed",
        "reporting_time": "10:00 AM",
        "pickup_location": "Airport Terminal 1",
        "driver_name": "Raju",
        "driver_contact": "+91 9876543210",
        "hotel_details": "Taj Hotel, Panjim",
        "alert_message": "Your flight has been delayed by 2 hours.",
        "agency_name": "Test Agency"
    }

    templates = [
        "booking_confirmation",
        "payment_receipt",
        "itinerary_details",
        "booking_status",
        "trip_reminder_7d",
        "trip_reminder_1d",
        "pre_travel_assistance",
        "real_time_alert",
        "feedback_request"
    ]

    for t in templates:
        print(f"\n--- Testing template: {t} ---")
        try:
            from app.utils.customer_email_templates import get_customer_notification_html
            subject, html = get_customer_notification_html(t, test_data)
            print(f"Subject: {subject}")
            print(f"HTML starts with: {html[:100]}...")
            print("✓ Template rendered successfully")
        except Exception as e:
            print(f"FAILED to render {t}: {e}")

    print("\nTo truly test sending, please create a dummy booking on the frontend.")

if __name__ == "__main__":
    asyncio.run(test_templates())
