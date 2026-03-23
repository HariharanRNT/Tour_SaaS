import asyncio
import os
import sys
import logging

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import AsyncSessionLocal
from app.models import Booking, User, Agent
from app.services.customer_notification_service import CustomerNotificationService

logging.basicConfig(filename='test_out_python.log', filemode='w', level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

async def test_latest_payment_receipt():
    logger.info("Testing the latest booking's payment receipt...")
    async with AsyncSessionLocal() as session:
        # Get the latest booking
        stmt = select(Booking).order_by(Booking.created_at.desc()).limit(1).options(
            selectinload(Booking.package),
            selectinload(Booking.travelers),
            selectinload(Booking.user),
            selectinload(Booking.agent),
            selectinload(Booking.payments)
        )
        result = await session.execute(stmt)
        booking = result.scalar_one_or_none()
        
        if not booking:
            logger.info("No booking found.")
            return

        logger.info(f"Testing with booking {booking.booking_reference}")
        payment_details = {
            "amount": float(booking.total_amount),
            "method": "Online Payment",
            "date": "2026-03-19"
        }
        
        try:
            await CustomerNotificationService.send_payment_receipt(booking, payment_details)
            logger.info("Successfully requested send_payment_receipt!")
        except Exception as e:
            logger.error(f"Exception raised during send_payment_receipt: {e}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(test_latest_payment_receipt())
