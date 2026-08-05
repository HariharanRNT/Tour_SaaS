import asyncio
import sys
import os

sys.path.append(os.path.abspath('backend'))

from app.db.session import SessionLocal
from app.models import Package
from app.schemas.packages import PackageUpdate
from app.api.v1.agent_packages import update_agent_package
from sqlalchemy import select

async def main():
    async with SessionLocal() as db:
        # Find any package
        stmt = select(Package).limit(1)
        result = await db.execute(stmt)
        package = result.scalar_one_or_none()
        
        if not package:
            print("No packages found.")
            return

        print(f"Original advance_payment_type: {package.advance_payment_type}")
        print(f"Original advance_payment_value: {package.advance_payment_value}")

        # Update it
        update_data = PackageUpdate(
            advance_payment_type="fixed",
            advance_payment_value=500.0,
            split_payment_enabled=True
        )

        try:
            # We don't have a user here so we'll mock current_user? update_agent_package expects current_user.id
            # Let's just do what update_agent_package does directly.
            update_dict = update_data.dict(exclude_unset=True)
            for field, value in update_dict.items():
                setattr(package, field, value)
            
            await db.commit()
            print(f"Updated advance_payment_type: {package.advance_payment_type}")
            print(f"Updated advance_payment_value: {package.advance_payment_value}")

            # Now update to percentage
            package.advance_payment_type = "percentage"
            package.advance_payment_value = 30.0
            await db.commit()
            print(f"Re-Updated advance_payment_type: {package.advance_payment_type}")
            print(f"Re-Updated advance_payment_value: {package.advance_payment_value}")

        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
