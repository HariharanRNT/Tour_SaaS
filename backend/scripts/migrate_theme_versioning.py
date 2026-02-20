import asyncio
import os
import re
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

def get_db_url():
    # Try to find .env file
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            content = f.read()
            match = re.search(r'DATABASE_URL=(.+)', content)
            if match:
                return match.group(1).strip()
    return "postgresql+asyncpg://postgres:1243@localhost:5432/tour_saas"

async def migrate():
    db_url = get_db_url()
    print(f"Connecting to: {db_url}")
    engine = create_async_engine(db_url)
    
    async with engine.begin() as conn:
        print("Starting theme versioning migration...")
        
        # 1. Add version_type column if it doesn't exist
        await conn.execute(text("""
            ALTER TABLE agent_themes 
            ADD COLUMN IF NOT EXISTS version_type VARCHAR DEFAULT 'live' NOT NULL;
        """))
        print("Added version_type column.")
        
        # 2. Add UniqueConstraint (agent_id, version_type)
        # First, we need to drop the old unique constraint on agent_id
        # In PostgreSQL/SQLAlchemy, this is often named 'agent_themes_agent_id_key'
        try:
            # Try to drop the default unique constraint if it exists
            await conn.execute(text("ALTER TABLE agent_themes DROP CONSTRAINT IF EXISTS agent_themes_agent_id_key;"))
            print("Dropped old unique constraint on agent_id (if existed).")
        except Exception as e:
            print(f"Note: Could not drop constraint 'agent_themes_agent_id_key': {e}")

        # Drop any other potential unique index on agent_id
        try:
            await conn.execute(text("DROP INDEX IF EXISTS ix_agent_themes_agent_id;"))
            await conn.execute(text("DROP INDEX IF EXISTS agent_themes_agent_id_key;"))
        except: pass

        # Add the new unique constraint
        await conn.execute(text("""
            ALTER TABLE agent_themes 
            ADD CONSTRAINT uix_agent_version UNIQUE (agent_id, version_type);
        """))
        print("Added new unique constraint uix_agent_version (agent_id, version_type).")
        
        print("Migration completed successfully.")

if __name__ == "__main__":
    asyncio.run(migrate())
