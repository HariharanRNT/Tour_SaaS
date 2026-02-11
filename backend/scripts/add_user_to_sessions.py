import sys
import os
import asyncio
import logging
from dotenv import load_dotenv

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables from .env file
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

from sqlalchemy import text
from app.database import engine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def add_user_id_column():
    """
    Add user_id column to trip_planning_sessions table if it doesn't exist
    """
    try:
        async with engine.begin() as conn:
            # Check if column exists
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='trip_planning_sessions' AND column_name='user_id'
            """)
            result = await conn.execute(check_query)
            exists = result.scalar()
            
            if not exists:
                logger.info("Adding user_id column to trip_planning_sessions table...")
                # Add user_id column (UUID, nullable, with foreign key)
                # Note: We're making it nullable for existing sessions
                await conn.execute(text("""
                    ALTER TABLE trip_planning_sessions 
                    ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL
                """))
                
                # Create index for faster lookups
                await conn.execute(text("""
                    CREATE INDEX idx_trip_planning_sessions_user_id 
                    ON trip_planning_sessions(user_id)
                """))
                
                logger.info("Successfully added user_id column and index.")
            else:
                logger.info("Column user_id already exists in trip_planning_sessions.")
                
    except Exception as e:
        logger.error(f"Error adding column: {e}")
        raise
    finally:
        await engine.dispose()

if __name__ == "__main__":
    print("Running migration to add user_id to trip_planning_sessions...")
    asyncio.run(add_user_id_column())
    print("Migration completed.")
