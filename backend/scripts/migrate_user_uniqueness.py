
import asyncio
from sqlalchemy import text
from app.database import engine
from app.models import User, UserRole, Customer, SubUser, Agent
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

async def migrate():
    async with engine.begin() as conn:
        # 1. Add agent_id column if not exists
        print("Checking for agent_id column...")
        result = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='agent_id'"))
        if not result.fetchone():
            print("Adding agent_id column to users table...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN agent_id UUID REFERENCES users(id) ON DELETE CASCADE"))
            await conn.execute(text("CREATE INDEX ix_users_agent_id ON users (agent_id)"))
        else:
            print("agent_id column already exists.")

    async with AsyncSession(engine) as session:
        # 2. Populate agent_id for SubUsers
        print("Populating agent_id for SubUsers...")
        sub_users = await session.execute(
            select(User, SubUser.agent_id)
            .join(SubUser, User.id == SubUser.user_id)
            .where(User.role == UserRole.SUB_USER, User.agent_id == None)
        )
        count = 0
        for user, agent_id in sub_users:
            user.agent_id = agent_id
            count += 1
        print(f"Updated {count} sub-users.")

        # 3. Populate agent_id for Customers
        print("Populating agent_id for Customers...")
        customers = await session.execute(
            select(User, Customer.agent_id)
            .join(Customer, User.id == Customer.user_id)
            .where(User.role == UserRole.CUSTOMER, User.agent_id == None)
        )
        count = 0
        for user, agent_id in customers:
            user.agent_id = agent_id
            count += 1
        print(f"Updated {count} customers.")
        
        await session.commit()

    async with engine.begin() as conn:
        # 4. Remove old unique constraint on email
        print("Removing old unique constraint on email...")
        # Find the constraint name (it might vary, but usually users_email_key)
        result = await conn.execute(text("""
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = 'users'::regclass AND contype = 'u' AND conkey @> (SELECT array_agg(attnum) FROM pg_attribute WHERE attrelid = 'users'::regclass AND attname = 'email');
        """))
        constraints = result.fetchall()
        for row in constraints:
            print(f"Dropping constraint: {row[0]}")
            await conn.execute(text(f"ALTER TABLE users DROP CONSTRAINT {row[0]}"))

        # Also check for unique index
        await conn.execute(text("DROP INDEX IF EXISTS ix_users_email"))

        # 5. Create new partial unique indexes
        print("Creating new partial unique indexes...")
        await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_user_email_global ON users (email) WHERE agent_id IS NULL"))
        await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_user_email_scoped ON users (email, agent_id) WHERE agent_id IS NOT NULL"))
        
        print("Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(migrate())
