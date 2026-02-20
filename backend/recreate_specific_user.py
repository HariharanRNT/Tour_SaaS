import asyncio
from app.database import AsyncSessionLocal
from app.models import User, Agent, UserRole
from app.core.security import get_password_hash
from uuid import uuid4

async def recreate_test_user():
    async with AsyncSessionLocal() as session:
        # User details from your request
        email = "hariharanrntgemini@gmail.com"
        password = "Hari@123"
        
        print(f"Creating user: {email}...")
        
        # Create User
        user = User(
            email=email,
            password_hash=get_password_hash(password),
            role=UserRole.AGENT,
            email_verified=True,
            is_active=True
        )
        session.add(user)
        await session.flush()
        
        # Create Agent Profile
        agent = Agent(
            user_id=user.id,
            first_name="Hari",
            last_name="Haran",
            agency_name="RNT Gemini Agency",
            domain="hello.local", # Standard test domain
            phone="+911234567890"
        )
        session.add(agent)
        
        await session.commit()
        print(f"Successfully recreated user {email} and linked Agent profile.")

if __name__ == "__main__":
    asyncio.run(recreate_test_user())
