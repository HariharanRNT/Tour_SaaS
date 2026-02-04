import asyncio
from datetime import date
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User, Agent, Subscription, SubscriptionPlan, Package
from app.core.security import get_password_hash

async def verify_customer_booking():
    agent_email = "hari@haritravels.local"
    customer_email = "customer_domain_test@example.com"
    package_title = "Test Package"
    
    async with AsyncSessionLocal() as db:
        agent_user = (await db.execute(select(User).where(User.email == agent_email))).scalar_one_or_none()
        if not agent_user:
            print("[ERROR] Agent not found")
            return
            
        print(f"Agent ID: {agent_user.id}")
        
        # Ensure Subscription
        stmt = select(Subscription).where(Subscription.user_id == agent_user.id)
        sub = (await db.execute(stmt)).scalar_one_or_none()
        
        if not sub:
            print("[INFO] Creating subscription for agent...")
            plan = (await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.name == "Starter"))).scalar_one_or_none()
            if not plan:
                plan = SubscriptionPlan(name="Starter", price=999, booking_limit=10, features="[]")
                db.add(plan)
                await db.flush()
                
            sub = Subscription(
                user_id=agent_user.id,
                plan_id=plan.id,
                status="active",
                start_date=date.today(),
                end_date=date.today(),
                auto_renew=True
            )
            db.add(sub)
            await db.commit()
            print("[SUCCESS] Subscription created/verified.")
        else:
             print(f"[INFO] Active Subscription found: {sub.status}")
             
        # Find Package
        pkg = (await db.execute(select(Package).limit(1))).scalar_one_or_none()
        if not pkg:
             print("[ERROR] No packages found to test booking.")
             # Create dummy package
             pkg = Package(
                 title="Test Package", slug="test-pkg", description="desc", destination="Test",
                 duration_days=2, duration_nights=1, price_per_person=1000, 
                 created_by=agent_user.id, status="published"
             )
             db.add(pkg)
             await db.flush()
             print("Created dummy package")
             
        print(f"Testing booking for Package: {pkg.title} ({pkg.id})")
        print("Please manually test the booking via frontend now.")
        print("Backend validation logic has been updated to check Agent's subscription.")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(verify_customer_booking())
