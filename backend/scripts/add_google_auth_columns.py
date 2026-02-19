
import asyncio
import logging
from sqlalchemy import text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def add_google_auth_columns():
    """
    Add google_id and profile_picture_url columns to the users table
    if they don't already exist.
    """
    # Import engine INSIDE function after sys.path is set
    from app.database import engine
    
    logger.info("Starting database schema update for Google Auth...")
    
    async with engine.begin() as conn:
        # Check if columns exist
        # This is a basic check; for production, use Alembic
        
        # 1. Add google_id
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN google_id VARCHAR UNIQUE;"))
            logger.info("Added google_id column.")
        except Exception as e:
            if "already exists" in str(e):
                logger.info("google_id column already exists.")
            else:
                logger.error(f"Error adding google_id: {e}")

        # 2. Add google_id index
        try:
            await conn.execute(text("CREATE INDEX idx_users_google_id ON users (google_id);"))
            logger.info("Added index for google_id.")
        except Exception as e:
            if "already exists" in str(e):
                 logger.info("Index for google_id already exists.")
            else:
                logger.error(f"Error adding index for google_id: {e}")

        # 3. Add profile_picture_url
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN profile_picture_url VARCHAR;"))
            logger.info("Added profile_picture_url column.")
        except Exception as e:
            if "already exists" in str(e):
                logger.info("profile_picture_url column already exists.")
            else:
                 logger.error(f"Error adding profile_picture_url: {e}")

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
        loop.run_until_complete(add_google_auth_columns())
    except Exception as e:
        logger.error(f"Migration failed: {e}")
