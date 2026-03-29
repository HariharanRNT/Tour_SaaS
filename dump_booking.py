
import asyncio
import os
import sys
import json
from decimal import Decimal
from datetime import datetime, date
from uuid import UUID

# Add the backend to sys.path
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'backend')))

from app.database import AsyncSessionLocal
from app.models import Booking, Package, User
from sqlalchemy import select
from sqlalchemy.orm import selectinload

def custom_serializer(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, UUID):
        return str(obj)
    return str(obj)

async def test():
    async with AsyncSessionLocal() as db:
        try:
            # Fetch one booking with all relations
            stmt = select(Booking).limit(1).options(
                selectinload(Booking.package).options(
                    selectinload(Package.images),
                    selectinload(Package.itinerary_items),
                    selectinload(Package.availability),
                    selectinload(Package.dest_metadata)
                ),
                selectinload(Booking.travelers),
                selectinload(Booking.user),
                selectinload(Booking.refund)
            )
            result = await db.execute(stmt)
            b = result.scalar()
            
            if not b:
                print("No bookings found.")
                return

            print(f"DEBUG: Booking {b.id}")
            # Try to see if any attribute access fails
            try:
                print(f"Ref: {b.booking_reference}")
                print(f"User Email: {b.user.email}")
                print(f"Package Title: {b.package.title if b.package else 'None'}")
                
                # Check User attributes expected in UserResponse
                u = b.user
                print(f"User Role: {u.role}")
                print(f"User Approval: {u.approval_status}")
                print(f"User Active: {u.is_active}")
                print(f"User Verified: {u.email_verified}")
                
            except Exception as e:
                print(f"Attribute access failed: {e}")

        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
