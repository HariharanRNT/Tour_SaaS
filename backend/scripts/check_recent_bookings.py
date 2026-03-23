import asyncio
import os
import sys
import json

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from sqlalchemy import select, desc
from app.models import Booking

async def check_bookings():
    output_file = "tmp/recent_bookings_output.txt"
    os.makedirs("tmp", exist_ok=True)
    with open(output_file, "w") as f:
        async with AsyncSessionLocal() as db:
            query = select(Booking).order_by(desc(Booking.created_at)).limit(5)
            result = await db.execute(query)
            bookings = result.scalars().all()
            
            f.write(f"Found {len(bookings)} recent bookings.\n")
            for b in bookings:
                # Check for Enum value or string
                status_val = b.payment_status.value if hasattr(b.payment_status, 'value') else b.payment_status
                f.write(f"Ref: {b.booking_reference}, Status: {b.status}, Payment Status: {b.payment_status} (val: {status_val}, type: {type(b.payment_status)})\n")
                f.write(f"  Total Amount: {b.total_amount}\n")
                f.write(f"  Created At: {b.created_at}\n")
                f.write("-" * 20 + "\n")
    print(f"Results written to {output_file}")

if __name__ == "__main__":
    asyncio.run(check_bookings())
