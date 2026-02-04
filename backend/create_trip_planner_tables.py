"""Create trip planner tables using SQLAlchemy models"""
import asyncio
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Date, UUID, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func, text
from app.database import Base, engine
import uuid

# Define models inline for migration
from sqlalchemy.ext.declarative import declarative_base

async def create_tables():
    """Create trip planner tables"""
    async with engine.begin() as conn:
        # Create trip_planning_sessions table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS trip_planning_sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) NULL,
                destination VARCHAR(255) NOT NULL,
                duration_days INT NOT NULL,
                duration_nights INT NOT NULL,
                start_date DATE,
                travelers JSONB DEFAULT '{"adults": 2, "children": 0, "infants": 0}',
                preferences JSONB DEFAULT '{}',
                matched_package_id UUID REFERENCES packages(id) NULL,
                itinerary JSONB NOT NULL DEFAULT '[]',
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours'
            )
        """))
        print("Created trip_planning_sessions table")
        
        # Create indexes
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_sessions_user ON trip_planning_sessions(user_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_sessions_expires ON trip_planning_sessions(expires_at)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_sessions_status ON trip_planning_sessions(status)"))
        print("Created indexes for trip_planning_sessions")
        
        # Create popular_destinations table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS popular_destinations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) UNIQUE NOT NULL,
                country VARCHAR(255),
                description TEXT,
                image_url TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                display_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        print("Created popular_destinations table")
        
        # Create index
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_popular_destinations_active ON popular_destinations(is_active, display_order)"))
        print("Created index for popular_destinations")
        
        # Add column to packages
        await conn.execute(text("ALTER TABLE packages ADD COLUMN IF NOT EXISTS is_popular_destination BOOLEAN DEFAULT FALSE"))
        print("Added is_popular_destination column to packages")
        
        # Seed popular destinations
        await conn.execute(text("""
            INSERT INTO popular_destinations (name, country, description, display_order) VALUES
            ('Tokyo', 'Japan', 'Modern metropolis meets ancient tradition', 1),
            ('Paris', 'France', 'City of lights and romance', 2),
            ('Bali', 'Indonesia', 'Tropical paradise with rich culture', 3),
            ('New York', 'USA', 'The city that never sleeps', 4),
            ('London', 'UK', 'Historic capital with modern flair', 5),
            ('Dubai', 'UAE', 'Luxury and innovation in the desert', 6),
            ('Barcelona', 'Spain', 'Art, architecture, and Mediterranean charm', 7),
            ('Singapore', 'Singapore', 'Garden city of the future', 8),
            ('Rome', 'Italy', 'Eternal city of history and culture', 9),
            ('Bangkok', 'Thailand', 'Vibrant street life and golden temples', 10)
            ON CONFLICT (name) DO NOTHING
        """))
        print("Seeded popular destinations")
        
        # Mark existing packages
        await conn.execute(text("""
            UPDATE packages 
            SET is_popular_destination = TRUE 
            WHERE destination IN (
                SELECT name FROM popular_destinations WHERE is_active = TRUE
            )
        """))
        print("Marked existing packages as popular destinations")
        
        print("\nMigration completed successfully!")

if __name__ == "__main__":
    asyncio.run(create_tables())
