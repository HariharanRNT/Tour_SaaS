
import asyncio
import sys
import os
import uuid

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Load .env file manually
def load_env():
    env_path = os.path.join(os.getcwd(), 'backend', '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value

load_env()

from app.database import AsyncSessionLocal
from app.models import User, Package, PackageStatus, ItineraryItem, UserRole
from sqlalchemy import select

async def validate():
    async with AsyncSessionLocal() as db:
        print("Starting Validation...")
        
        # 1. Find Agents
        stmt = select(User).where(User.role == UserRole.AGENT).limit(1)
        result = await db.execute(stmt)
        agent = result.scalar()
        
        # Fallback if no specific agent found, use first user
        if not agent:
             stmt = select(User).limit(1)
             result = await db.execute(stmt)
             agent = result.scalar()

        if not agent:
            print("No users found at all. Cannot proceed.")
            return

        print(f"Using Creator ID: {agent.id}")

        # 2. Create Test Package
        pkg_id = uuid.uuid4()
        pkg = Package(
            id=pkg_id,
            title="Temp Test Package",
            slug=f"temp-test-{str(pkg_id)[:8]}",
            destination="Testland",
            duration_days=3,
            duration_nights=2,
            price_per_person=1000,
            created_by=agent.id,
            description="Temp"
        )
        db.add(pkg)
        await db.commit()
        print(f"Created Package: {pkg_id}")

        try:
            # 3. Add Activity 1 (Morning)
            item1 = ItineraryItem(
                package_id=pkg_id,
                day_number=1,
                time_slot="morning",
                title="Activity 1",
                description="Desc 1"
            )
            db.add(item1)
            await db.commit()
            print("Added Activity 1")

            # 4. Add Activity 2 (Morning) - same slot
            item2 = ItineraryItem(
                package_id=pkg_id,
                day_number=1,
                time_slot="morning",
                title="Activity 2",
                description="Desc 2"
            )
            db.add(item2)
            await db.commit()
            print("Added Activity 2")

            # 5. Add Activity 3 (Evening)
            item3 = ItineraryItem(
                package_id=pkg_id,
                day_number=1,
                time_slot="evening",
                title="Activity 3",
                description="Desc 3"
            )
            db.add(item3)
            await db.commit()
            print("Added Activity 3")

            # 6. Verify
            stmt = select(ItineraryItem).where(ItineraryItem.package_id == pkg_id).order_by(ItineraryItem.time_slot)
            result = await db.execute(stmt)
            items = result.scalars().all()
            
            print(f"Total Items: {len(items)}")
            for i in items:
                print(f" - Day {i.day_number} {i.time_slot}: {i.title}")

            if len(items) == 3:
                morning_count = len([i for i in items if i.time_slot == "morning"])
                if morning_count == 2:
                    print("\nSUCCESS: Backend supports multiple activities per slot.")
                else:
                    print("\nFAILURE: Count matched but slots mismatched?")
            else:
                print(f"\nFAILURE: Expected 3 items, found {len(items)}")

        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            # Cleanup
            print("Cleaning up...")
            await db.delete(pkg)
            await db.commit()

if __name__ == "__main__":
    asyncio.run(validate())
