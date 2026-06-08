import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.models import Booking, Package, User, BookingStatus, BookingRefund
from uuid import UUID
import sys

async def test_repro():
    with open("repro_output.txt", "w") as f:
        agent_id = UUID('87f499f5-01f0-4499-b9c1-142e387d8994')
        status_filter = "COMPLETED" 
        
        async with AsyncSessionLocal() as db:
            try:
                f.write("Running Reproduction Study...\n")
                base_stmt = select(Booking).where(Booking.agent_id == agent_id)
                
                # Applying status filter like the API does
                f.write(f"Applying status filter: {status_filter}\n")
                base_stmt = base_stmt.where(Booking.status == BookingStatus(status_filter))
                
                # Count
                f.write("Getting total count...\n")
                count_stmt = select(func.count()).select_from(base_stmt.subquery())
                total = (await db.execute(count_stmt)).scalar() or 0
                f.write(f"Total: {total}\n")
                
                # Items
                f.write("Getting items with selectinload...\n")
                stmt = base_stmt.offset(0).limit(5).order_by(Booking.created_at.desc()).options(
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
                bookings = result.scalars().all()
                f.write(f"Fetched {len(bookings)} bookings.\n")
                
                for b in bookings:
                    f.write(f"Validating booking {b.id}...\n")
                    if b.package:
                        f.write(f"  Package: {b.package.title}\n")
                        if b.package.dest_metadata:
                            f.write(f"  Dest: {b.package.dest_metadata.name}\n")
                
                f.write("Reproduction SUCCESS (No error found in core logic).\n")
                
            except Exception as e:
                f.write(f"Reproduction FAILED with error: {e}\n")
                import traceback
                f.write(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(test_repro())
