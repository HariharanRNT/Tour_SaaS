import asyncio
import uuid
from sqlalchemy import select, update
from app.database import AsyncSessionLocal
from app.models import User, UserRole, Agent, SubUser, Customer

async def migrate_users():
    async with AsyncSessionLocal() as db:
        print("Starting user migration...")
        
        # 1. Migrate Agents
        agents_stmt = select(User).where(User.role == UserRole.AGENT)
        result = await db.execute(agents_stmt)
        agents = result.scalars().all()
        for agent in agents:
            agent.agent_id = agent.id
        print(f"Migrated {len(agents)} agents.")

        # 2. Migrate SubUsers
        subusers_stmt = select(User, SubUser.agent_id).join(SubUser, User.id == SubUser.user_id).where(User.role == UserRole.SUB_USER)
        result = await db.execute(subusers_stmt)
        for user, agent_id in result.all():
            user.agent_id = agent_id
        print("Migrated subusers.")

        # 3. Migrate Customers
        customers_stmt = select(User, Customer.agent_id).join(Customer, User.id == Customer.user_id).where(User.role == UserRole.CUSTOMER)
        result = await db.execute(customers_stmt)
        for user, agent_id in result.all():
            user.agent_id = agent_id
        print("Migrated customers.")

        await db.commit()
        print("Migration completed successfully.")

if __name__ == "__main__":
    asyncio.run(migrate_users())
