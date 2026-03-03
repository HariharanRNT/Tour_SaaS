import asyncio
from datetime import date
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.models import User, Agent
from sqlalchemy.orm import selectinload
from sqlalchemy import select

async def main():
    engine = create_async_engine('postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas')
    async with engine.connect() as conn:
        agent_id = "bb5b7f18-0955-4f31-bf89-7111b5d357dc"
        # Find user email for this agent_id
        res = await conn.execute(text("SELECT u.email, u.id FROM users u JOIN agents a ON u.id = a.user_id WHERE a.id = :id"), {"id": agent_id})
        user_row = res.fetchone()
        if not user_row:
            print(f"No user found for agent_id {agent_id}")
            return
            
        email = user_row[0]
        user_id = user_row[1]
        print(f"Found User: {email} (ID: {user_id})")
        
    # Now use a session to check model properties
    from app.database import SessionLocal
    async with SessionLocal() as session:
        stmt = select(User).where(User.id == user_id).options(selectinload(User.subscription))
        user = (await session.execute(stmt)).scalar_one_or_none()
        
        if user:
            print(f"--- Model Properties for {email} ---")
            print(f"Role: {user.role}")
            print(f"Has Active Sub (Property): {user.has_active_subscription}")
            print(f"Sub Status (Property): {user.subscription_status}")
            if user.subscription:
                print(f"Linked Sub ID: {user.subscription.id}")
                print(f"Linked Sub Status: {user.subscription.status}")
                print(f"Linked Sub End Date: {user.subscription.end_date}")
            else:
                print("No subscription linked via relationship")
                
            # Check all subs manually
            stmt_all = select(Subscription).where(Subscription.user_id == user_id)
            all_subs = (await session.execute(stmt_all)).scalars().all()
            print(f"--- All Subscriptions ({len(all_subs)}) ---")
            for s in all_subs:
                print(f"ID: {s.id} | Status: {s.status} | End: {s.end_date} | Created: {s.created_at}")
                
    await engine.dispose()

from app.models import Subscription # Ensure imported for script

if __name__ == "__main__":
    asyncio.run(main())
