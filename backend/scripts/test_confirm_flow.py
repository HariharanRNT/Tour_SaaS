import asyncio
import sys
import os
from sqlalchemy import select
from sqlalchemy.orm import selectinload

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from app.services.booking_orchestrator import BookingOrchestrator
from app.services.tripjack_adapter import TripJackAdapter
from app.config import settings

async def test_confirm():
    async with AsyncSessionLocal() as db:
        # Get the latest booking ID
        from sqlalchemy import text
        result = await db.execute(text("SELECT id FROM bookings ORDER BY created_at DESC LIMIT 1"))
        booking_id = result.scalar()
        
        if not booking_id:
            print("No bookings found.")
            return

        print(f"Testing confirmation for Booking ID: {booking_id}")
        
        tripjack = TripJackAdapter(
            api_key=settings.TRIPJACK_API_KEY, 
            base_url=settings.TRIPJACK_BASE_URL
        )
        orchestrator = BookingOrchestrator(db, tripjack)
        
        # Mock payment verification
        payment_data = {
            "razorpay_order_id": "order_mock_test",
            "razorpay_payment_id": "pay_mock_test",
            "razorpay_signature": "sig_mock_test"
        }
        
        # Mock traveler info
        traveler_info = [{
            "first_name": "Test",
            "last_name": "User",
            "dob": "1990-01-01",
            "gender": "MALE",
            "passport_number": "P1234567",
            "passport_expiry": "2030-01-01",
            "type": "ADULT",
            "nationality": "IN"
        }]

        try:
            confirmed_booking = await orchestrator.process_checkout(
                booking_id=booking_id,
                payment_verification=payment_data,
                traveler_info=traveler_info
            )
            print(f"Success! Booking {confirmed_booking.booking_reference} confirmed.")
        except Exception as e:
            print(f"FAILED: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_confirm())
