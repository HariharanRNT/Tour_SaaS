import asyncio
from app.database import AsyncSessionLocal
from app.models import User, UserRole
from sqlalchemy import select

async def check_admins():
    async with AsyncSessionLocal() as session:
        stmt = select(User).where(User.role == UserRole.ADMIN)
        result = await session.execute(stmt)
        admins = result.scalars().all()
        
        if not admins:
            print("No admin users found in the database.")
            return

        print(f"Admin Users:")
        for admin in admins:
            print(f"ID: {admin.id}, Email: {admin.email}")

if __name__ == "__main__":
    asyncio.run(check_admins())
