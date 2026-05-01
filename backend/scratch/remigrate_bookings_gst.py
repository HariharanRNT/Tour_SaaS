import asyncio
from sqlalchemy import select
from app.database import engine, AsyncSession
from app.models import Booking, Agent, Package

async def migrate_existing_bookings():
    async with AsyncSession(engine) as db:
        print("Re-migrating existing bookings to update GST logic...")
        # We update all bookings to ensure they use the new formula
        stmt = select(Booking)
        result = await db.execute(stmt)
        bookings = result.scalars().all()
        
        print(f"Found {len(bookings)} bookings to check.")
        
        for b in bookings:
            # 1. Resolve Agent Settings
            agent_stmt = select(Agent).where(Agent.user_id == b.agent_id)
            agent_result = await db.execute(agent_stmt)
            agent_obj = agent_result.scalar_one_or_none()
            
            default_gst = 18.0
            default_inclusive = False
            default_gst_applicable = False
            if agent_obj:
                default_gst = float(agent_obj.gst_percentage or 18.0)
                default_inclusive = agent_obj.gst_inclusive or False
                default_gst_applicable = agent_obj.gst_applicable or False
            
            # 2. Package Settings
            pkg_stmt = select(Package).where(Package.id == b.package_id)
            pkg_result = await db.execute(pkg_stmt)
            pkg = pkg_result.scalar_one_or_none()
            
            gst_applicable = default_gst_applicable
            gst_percentage = default_gst
            is_inclusive = default_inclusive
            
            if pkg:
                if pkg.gst_applicable is not None:
                    gst_applicable = pkg.gst_applicable
                if gst_applicable:
                    if pkg.gst_percentage is not None:
                        gst_percentage = float(pkg.gst_percentage)
                    if pkg.gst_mode:
                        is_inclusive = (pkg.gst_mode == 'inclusive')
            
            if not gst_applicable:
                gst_percentage = 0
                gst_amount = 0
                base_amount = float(b.total_amount)
            else:
                amount = float(b.total_amount)
                if is_inclusive:
                    # New logic: GST is flat percentage of total (Tax on Gross)
                    gst_amount = amount * (gst_percentage / 100)
                else:
                    # Exclusive logic: GST is extracted from total (since total includes it)
                    gst_amount = amount - (amount / (1 + (gst_percentage / 100)))
                base_amount = amount - gst_amount
            
            b.gst_percentage = gst_percentage
            b.gst_amount = gst_amount
            b.is_gst_inclusive = is_inclusive
            b.base_amount = base_amount
            
        await db.commit()
        print("Re-migration completed.")

if __name__ == "__main__":
    asyncio.run(migrate_existing_bookings())
