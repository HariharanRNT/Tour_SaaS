
import asyncio
import os
import sys
from uuid import UUID

# Add the backend to sys.path
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'backend')))

from app.database import AsyncSessionLocal
from app.models import Traveler, User, ApprovalStatus
from sqlalchemy import select, update, func

async def fix_data():
    async with AsyncSessionLocal() as db:
        try:
            print("--- Starting Data Integrity Fix ---")
            
            # 1. Fix Travelers with too long names
            print("Checking for overly long traveler names...")
            # stmt = select(Traveler).where((func.length(Traveler.first_name) > 100) | (func.length(Traveler.last_name) > 100))
            
            # Using raw SQL if func.length is problematic, or just fetch all and check
            result = await db.execute(select(Traveler))
            all_travelers = result.scalars().all()
            
            count = 0
            for t in all_travelers:
                if (t.first_name and len(t.first_name) > 100) or (t.last_name and len(t.last_name) > 100):
                    print(f"Truncating traveler {t.id}: {t.first_name[:10]}... / {t.last_name[:10]}...")
                    t.first_name = t.first_name[:100]
                    t.last_name = t.last_name[:100]
                    count += 1
            
            if count > 0:
                print(f"Truncated {count} travelers.")
            else:
                print("No long names found.")

            # 2. Fix User NULL fields
            print("\nChecking for NULL fields in User records...")
            # Update approval_status
            await db.execute(
                update(User)
                .where(User.approval_status == None)
                .values(approval_status=ApprovalStatus.PENDING)
            )
            # Update email_verified
            await db.execute(
                update(User)
                .where(User.email_verified == None)
                .values(email_verified=False)
            )
            # Update is_active
            await db.execute(
                update(User)
                .where(User.is_active == None)
                .values(is_active=True)
            )
            print("Fixed NULL fields in User records.")

            await db.commit()
            print("\n--- Data Integrity Fix Completed Successfully ---")
            
        except Exception as e:
            await db.rollback()
            print(f"Error during data fix: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(fix_data())
