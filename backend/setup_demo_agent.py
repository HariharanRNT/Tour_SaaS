import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User, UserRole
from app.core.security import get_password_hash

async def setup_demo_agent():
    print("Setting up Demo Agent...")
    async with AsyncSessionLocal() as session:
        # Check if exists
        result = await session.execute(select(User).where(User.email == "agent@toursaas.com"))
        existing_agent = result.scalar_one_or_none()
        
        if existing_agent:
            print("Demo Agent already exists.")
            # Ensure it's active and has correct role
            existing_agent.role = UserRole.AGENT
            existing_agent.is_active = True
            # Optional: Reset password if needed, but let's assume it's fine or update it
            existing_agent.password_hash = get_password_hash("agent123")
            await session.commit()
            print("Updated existing agent.")
        else:
            new_agent = User(
                email="agent@toursaas.com",
                password_hash=get_password_hash("agent123"),
                first_name="Demo",
                last_name="Agent",
                phone="9876543210",
                role=UserRole.AGENT,
                email_verified=True,
                is_active=True
            )
            session.add(new_agent)
            await session.commit()
            print("Created new Demo Agent.")
        
        print("\n Credentials:")
        print(" Email: agent@toursaas.com")
        print(" Password: agent123")

if __name__ == "__main__":
    asyncio.run(setup_demo_agent())
