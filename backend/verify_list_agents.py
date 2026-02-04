import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import AsyncSessionLocal
from app.models import User, Agent, UserRole
from app.schemas import UserResponse

async def verify_list_agents():
    async with AsyncSessionLocal() as db:
        print("Querying agents...")
        stmt = select(User).join(Agent).where(User.role == UserRole.AGENT)
        stmt = stmt.order_by(User.created_at.desc()).options(
            selectinload(User.admin_profile),
            selectinload(User.agent_profile),
            selectinload(User.customer_profile)
        )
        
        result = await db.execute(stmt)
        agents = result.scalars().all()
        
        print(f"Found {len(agents)} agents in DB.")
        
        for agent in agents:
            print(f"\nUser: {agent.email}")
            print(f"  Profile loaded: {agent.agent_profile is not None}")
            if agent.agent_profile:
                print(f"  First Name (model): {agent.first_name}")
                print(f"  Agency Name (model): {agent.agency_name}")
            
            try:
                # Validate with Pydantic Schema (simulating API response)
                response_model = UserResponse.model_validate(agent)
                print(f"  Pydantic Validation: SUCCESS")
                print(f"  Response Agency: {response_model.agency_name}")
            except Exception as e:
                print(f"  Pydantic Validation: FAILED - {e}")

if __name__ == "__main__":
    asyncio.run(verify_list_agents())
