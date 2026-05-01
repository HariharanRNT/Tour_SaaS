import asyncio
from sqlalchemy import text
from app.database import engine

async def update_schema():
    async with engine.begin() as conn:
        print("Adding agent_id column to users table...")
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN agent_id UUID REFERENCES users(id) ON DELETE CASCADE"))
            print("Column added.")
        except Exception as e:
            print(f"Note: {e}")

        print("Removing old unique index on email if it exists...")
        try:
            # Drop the old unique index/constraint
            await conn.execute(text("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key"))
            await conn.execute(text("DROP INDEX IF EXISTS ix_users_email"))
            print("Old constraint/index removed.")
        except Exception as e:
            print(f"Note: {e}")

        print("Creating new domain-scoped indexes...")
        try:
            await conn.execute(text("""
                CREATE UNIQUE INDEX uq_user_email_global 
                ON users (email) 
                WHERE role != 'CUSTOMER'
            """))
            await conn.execute(text("""
                CREATE UNIQUE INDEX uq_user_email_agent 
                ON users (email, agent_id) 
                WHERE role = 'CUSTOMER'
            """))
            # Re-create the non-unique index for performance if needed, 
            # but the unique ones already cover it.
            print("New indexes created.")
        except Exception as e:
            print(f"Note: {e}")

if __name__ == "__main__":
    asyncio.run(update_schema())
