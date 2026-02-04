import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import AsyncSessionLocal
from app.models import User, Customer

async def debug_customer_link():
    # Only suspect: customer_domain_test@example.com from previous context
    # But user might be using a different one. I'll check 'customer_domain_test@example.com' first.
    email = "customer_domain_test@example.com" 
    
    print(f"Inspecting user: {email}")
    
    async with AsyncSessionLocal() as db:
        # Load user with customer profile
        stmt = select(User).where(User.email == email).options(selectinload(User.customer_profile))
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            print("❌ User not found.")
            return

        print(f"User ID: {user.id}")
        print(f"Role: {user.role}")
        
        if not user.customer_profile:
            print("❌ Customer Profile: MISSING (This is the issue!)")
        else:
            print(f"✅ Customer Profile ID: {user.customer_profile.id}")
            print(f"   Agent ID in Profile: {user.customer_profile.agent_id}")
            
            if not user.customer_profile.agent_id:
                print("❌ Agent ID is None. The customer is not linked to any agent.")
            else:
                print("✅ Agent ID is present. The issue might be in how it's loaded in deps.py")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(debug_customer_link())
