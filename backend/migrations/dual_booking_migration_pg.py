import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Add the backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load .env if it exists
load_dotenv()

def get_db_url():
    # Try to get from environment first
    url = os.getenv("DATABASE_URL")
    if not url:
        # Fallback to a default or import from config
        try:
            from app.config import settings
            url = settings.DATABASE_URL
        except ImportError:
            url = "sqlite:///./tour_saas.db"
    
    # Convert async URLs to sync for this script
    if "asyncpg" in url:
        url = url.replace("postgresql+asyncpg://", "postgresql://")
    elif "aiosqlite" in url:
        url = url.replace("sqlite+aiosqlite:///", "sqlite:///")
    
    return url

def run_migration():
    url = get_db_url()
    print(f"Connecting to database (sync mode)...")
    
    engine = create_engine(url)
    
    with engine.connect() as conn:
        print("Checking/Updating tables...")
        
        # 1. Update packages table
        print("Updating packages table...")
        columns = [
            ("booking_type", "VARCHAR DEFAULT 'INSTANT' NOT NULL"),
            ("price_label", "VARCHAR"),
            ("enquiry_payment", "VARCHAR DEFAULT 'OFFLINE' NOT NULL")
        ]
        
        for col, col_def in columns:
            try:
                conn.execute(text(f"ALTER TABLE packages ADD COLUMN {col} {col_def}"))
                conn.commit()
                print(f"  Added {col} to packages")
            except Exception as e:
                # Most likely column already exists
                print(f"  Notice processing {col}: {str(e).splitlines()[0]}")

        # 2. Update bookings table
        print("Updating bookings table...")
        try:
            # PostgreSQL uses UUID type usually, but the app might use VARCHAR or UUID
            # We'll try to detect or just use VARCHAR for compatibility if not sure, 
            # but usually it's UUID in this app.
            conn.execute(text("ALTER TABLE bookings ADD COLUMN enquiry_id UUID"))
            conn.commit()
            print("  Added enquiry_id to bookings")
        except Exception as e:
            print(f"  Notice processing enquiry_id: {str(e).splitlines()[0]}")

        # Add index
        try:
            conn.execute(text("CREATE UNIQUE INDEX ix_bookings_enquiry_id ON bookings(enquiry_id) WHERE enquiry_id IS NOT NULL"))
            conn.commit()
            print("  Created index on bookings(enquiry_id)")
        except Exception as e:
            print(f"  Notice processing index: {str(e).splitlines()[0]}")

        # 3. Create enquiries table
        print("Creating enquiries table...")
        # Note: We use the most compatible SQL here. 
        # For PostgreSQL, we use SERIAL/UUID, for SQLite it differs.
        # But we'll use SQLAlchemy's declarative if we want perfection.
        # Since we're in a hurry to fix a 500, let's use a robust CREATE TABLE.
        
        is_postgres = "postgresql" in url
        id_type = "UUID PRIMARY KEY" if is_postgres else "CHAR(32) PRIMARY KEY"
        
        create_table_sql = f"""
        CREATE TABLE IF NOT EXISTS enquiries (
            id {id_type},
            package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
            package_name_snapshot VARCHAR NOT NULL,
            agent_id UUID NOT NULL REFERENCES users(id),
            customer_id UUID REFERENCES users(id),
            customer_name VARCHAR NOT NULL,
            email VARCHAR NOT NULL,
            phone VARCHAR NOT NULL,
            travel_date DATE NOT NULL,
            travellers INTEGER NOT NULL CHECK (travellers > 0),
            message TEXT,
            status VARCHAR DEFAULT 'NEW' NOT NULL,
            source VARCHAR DEFAULT 'WEB' NOT NULL,
            agent_notes TEXT,
            agent_notified BOOLEAN DEFAULT { 'TRUE' if is_postgres else '1' },
            notification_count INTEGER DEFAULT 1,
            last_contacted_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
        """
        if not is_postgres:
            # SQLite doesn't support UUID or WITH TIME ZONE as well
            create_table_sql = create_table_sql.replace("UUID", "CHAR(32)").replace("WITH TIME ZONE", "")
            
        try:
            conn.execute(text(create_table_sql))
            conn.commit()
            print("  Enquiries table created/verified")
        except Exception as e:
            print(f"  Error creating enquiries table: {e}")

        # Create indexes for enquiries
        indexes = [
            "CREATE INDEX IF NOT EXISTS ix_enquiries_agent_id ON enquiries(agent_id)",
            "CREATE INDEX IF NOT EXISTS ix_enquiries_status ON enquiries(status)",
            "CREATE INDEX IF NOT EXISTS ix_enquiries_package_id ON enquiries(package_id)"
        ]
        for idx_sql in indexes:
            try:
                conn.execute(text(idx_sql))
                conn.commit()
            except Exception as e:
                print(f"  Notice creating index: {str(e).splitlines()[0]}")

    print("Migration completed.")

if __name__ == "__main__":
    run_migration()
