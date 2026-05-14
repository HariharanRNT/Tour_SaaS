import asyncio
import logging
from sqlalchemy import text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def fix_google_id_constraint():
    """
    Drop the global unique constraint on google_id and create scoped indexes.
    """
    from app.database import engine
    
    logger.info("Starting database schema update for google_id constraint...")
    
    async with engine.begin() as conn:
        # 1. Drop the existing unique constraint/index
        try:
            await conn.execute(text("DROP INDEX IF EXISTS ix_users_google_id;"))
            logger.info("Dropped index ix_users_google_id.")
        except Exception as e:
            logger.error(f"Error dropping index ix_users_google_id: {e}")

        try:
            await conn.execute(text("DROP INDEX IF EXISTS idx_users_google_id;"))
            logger.info("Dropped index idx_users_google_id.")
        except Exception as e:
            logger.error(f"Error dropping index idx_users_google_id: {e}")

        # Also drop the constraint if it was created by UNIQUE keyword
        try:
            await conn.execute(text("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_google_id_key;"))
            logger.info("Dropped constraint users_google_id_key.")
        except Exception as e:
            logger.error(f"Error dropping constraint users_google_id_key: {e}")

        # 2. Create new scoped indexes
        try:
            await conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_user_google_id_agent 
                ON users (google_id, agent_id) 
                WHERE role = 'CUSTOMER';
            """))
            logger.info("Created scoped unique index uq_user_google_id_agent.")
        except Exception as e:
            logger.error(f"Error creating index uq_user_google_id_agent: {e}")

        try:
            await conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_user_google_id_global 
                ON users (google_id) 
                WHERE role != 'CUSTOMER';
            """))
            logger.info("Created scoped unique index uq_user_google_id_global.")
        except Exception as e:
            logger.error(f"Error creating index uq_user_google_id_global: {e}")

    logger.info("Database schema update completed.")
    await engine.dispose()

if __name__ == "__main__":
    import sys
    import os
    from dotenv import load_dotenv
    
    # Add the parent directory to sys.path to allow importing app modules
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # Load environment variables
    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

    try:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(fix_google_id_constraint())
    except Exception as e:
        logger.error(f"Migration failed: {e}")
