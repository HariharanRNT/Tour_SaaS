import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User, Agent, UserRole

async def check_latest_agent():
    async with AsyncSessionLocal() as session:
        stmt = select(User).where(User.role == UserRole.AGENT).order_by(User.created_at.desc()).limit(1)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if user:
            print(f"Latest Agent: {user.email} | Created at: {user.created_at} | Status: {user.approval_status}")
            with open("latest_agent.txt", "w") as f:
                f.write(f"Email: {user.email}\nCreated at: {user.created_at}\nStatus: {user.approval_status}\n")
        else:
            print("No agents found.")
            with open("latest_agent.txt", "w") as f:
                f.write("No agents found.\n")

if __name__ == "__main__":
    asyncio.run(check_latest_agent())
