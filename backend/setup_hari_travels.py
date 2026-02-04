import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User, Agent, UserRole
from app.core.security import get_password_hash

async def setup_hari_travels():
    domain = "haritravels.local"
    email = "hari@haritravels.local"
    
    async with AsyncSessionLocal() as db:
        # Check if exists
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"Creating user {email}...")
            user = User(
                email=email,
                password_hash=get_password_hash("password123"),
                role=UserRole.AGENT,
                is_active=True
            )
            db.add(user)
            await db.flush()
            
            agent = Agent(
                user_id=user.id,
                first_name="Hari",
                last_name="Travels",
                domain=domain,
                agency_name="Hari Travels",
                currency="INR"
            )
            db.add(agent)
            await db.commit()
            print(f"[SUCCESS] Created agent 'Hari Travels' with domain '{domain}'")
        else:
            print(f"[INFO] User {email} already exists.")
            # Ensure profile exists and domain is correct
            if not user.agent_profile:
                 print("Creating missing agent profile...")
                 agent = Agent(
                    user_id=user.id,
                    first_name="Hari",
                    last_name="Travels",
                    domain=domain,
                    agency_name="Hari Travels",
                    currency="INR"
                )
                 db.add(agent)
                 await db.commit()
            elif user.agent_profile.domain != domain:
                 print(f"Updating domain from {user.agent_profile.domain} to {domain}")
                 user.agent_profile.domain = domain
                 await db.commit()
            
            print(f"[SUCCESS] Agent 'Hari Travels' is ready with domain '{domain}'")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(setup_hari_travels())
