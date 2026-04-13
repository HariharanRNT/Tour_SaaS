import os
import sys
import asyncio
import sqlite3
from sqlalchemy import text

# Add the backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Use sqlite3 directly for local SQLite migration
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tour_saas.db")

def run_migration():
    print(f"Connecting to database at {DB_PATH}...")
    if not os.path.exists(DB_PATH):
        print("Database file not found. Run create_tables.py first.")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    try:
        # 1. Update packages table
        print("Updating packages table...")
        columns_to_add = [
            ("booking_type", "VARCHAR DEFAULT 'INSTANT' NOT NULL"),
            ("price_label", "VARCHAR"),
            ("enquiry_payment", "VARCHAR DEFAULT 'OFFLINE' NOT NULL")
        ]
        
        for col_name, col_def in columns_to_add:
            try:
                cur.execute(f"ALTER TABLE packages ADD COLUMN {col_name} {col_def}")
                print(f"Added column {col_name} to packages")
            except sqlite3.OperationalError:
                print(f"Column {col_name} already exists in packages")

        # 2. Update bookings table
        print("Updating bookings table...")
        try:
            cur.execute("ALTER TABLE bookings ADD COLUMN enquiry_id CHAR(32)")
            print("Added enquiry_id to bookings")
        except sqlite3.OperationalError:
            print("Column enquiry_id already exists in bookings")
            
        # Add index for enquiry_id
        try:
            cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_bookings_enquiry_id ON bookings(enquiry_id) WHERE enquiry_id IS NOT NULL")
            print("Created unique index on bookings(enquiry_id)")
        except sqlite3.OperationalError as e:
            print(f"Index notice: {e}")

        # 3. Create enquiries table
        print("Creating enquiries table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS enquiries (
                id CHAR(32) PRIMARY KEY,
                package_id CHAR(32),
                package_name_snapshot VARCHAR NOT NULL,
                agent_id CHAR(32) NOT NULL,
                customer_id CHAR(32),
                customer_name VARCHAR NOT NULL,
                email VARCHAR NOT NULL,
                phone VARCHAR NOT NULL,
                travel_date DATE NOT NULL,
                travellers INTEGER NOT NULL,
                message TEXT,
                status VARCHAR DEFAULT 'NEW' NOT NULL,
                source VARCHAR DEFAULT 'WEB' NOT NULL,
                agent_notes TEXT,
                agent_notified BOOLEAN DEFAULT 1,
                notification_count INTEGER DEFAULT 1,
                last_contacted_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL,
                FOREIGN KEY (agent_id) REFERENCES users(id),
                FOREIGN KEY (customer_id) REFERENCES users(id),
                CHECK (travellers > 0)
            )
        """)
        print("Enquiries table checked/created")

        # Create indexes for enquiries
        cur.execute("CREATE INDEX IF NOT EXISTS ix_enquiries_agent_id ON enquiries(agent_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS ix_enquiries_status ON enquiries(status)")
        cur.execute("CREATE INDEX IF NOT EXISTS ix_enquiries_package_id ON enquiries(package_id)")
        print("Indexes created for enquiries")

        conn.commit()
        print("Migration completed successfully.")
    except Exception as e:
        conn.rollback()
        print(f"Error during migration: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
