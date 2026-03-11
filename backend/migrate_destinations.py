from sqlalchemy.ext.asyncio import AsyncSession
import asyncio
import sys
import os

# Add the parent directory to sys.path to allow importing from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import AsyncSessionLocal, engine
from sqlalchemy import text

async def migrate():
    async with engine.begin() as conn:
        # Create table if it doesn't exist
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS popular_destinations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                country VARCHAR(255),
                description TEXT,
                image_url TEXT,
                is_popular BOOLEAN DEFAULT TRUE,
                is_active BOOLEAN DEFAULT TRUE,
                display_order INTEGER DEFAULT 999,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        # Check if columns exist, if not add them (for existing tables)
        await conn.execute(text("""
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popular_destinations' AND column_name='is_popular') THEN
                    ALTER TABLE popular_destinations ADD COLUMN is_popular BOOLEAN DEFAULT TRUE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popular_destinations' AND column_name='is_active') THEN
                    ALTER TABLE popular_destinations ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popular_destinations' AND column_name='display_order') THEN
                    ALTER TABLE popular_destinations ADD COLUMN display_order INTEGER DEFAULT 999;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popular_destinations' AND column_name='country') THEN
                    ALTER TABLE popular_destinations ADD COLUMN country VARCHAR(255);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popular_destinations' AND column_name='description') THEN
                    ALTER TABLE popular_destinations ADD COLUMN description TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popular_destinations' AND column_name='image_url') THEN
                    ALTER TABLE popular_destinations ADD COLUMN image_url TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popular_destinations' AND column_name='updated_at') THEN
                    ALTER TABLE popular_destinations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
                END IF;
            END $$;
        """))
        print("Migration completed: created/updated popular_destinations table.")

if __name__ == "__main__":
    asyncio.run(migrate())
