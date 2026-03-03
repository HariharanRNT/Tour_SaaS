import os
import sys
import psycopg2
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    print("Error: DATABASE_URL not found in environment")
    sys.exit(1)

# Replace asyncpg with standard postgresql for psycopg2
db_url_sync = DB_URL.replace("postgresql+asyncpg://", "postgresql://")

def migrate():
    print(f"Connecting to database to add multi-destination columns to packages table...")
    try:
        conn = psycopg2.connect(db_url_sync)
        conn.autocommit = True
        cur = conn.cursor()

        # Add columns
        commands = [
            "ALTER TABLE packages ADD COLUMN IF NOT EXISTS package_mode VARCHAR DEFAULT 'single'",
            "ALTER TABLE packages ADD COLUMN IF NOT EXISTS destinations TEXT DEFAULT '[]'",
            "ALTER TABLE packages ADD COLUMN IF NOT EXISTS tour_types TEXT DEFAULT '[]'"
        ]

        for cmd in commands:
            print(f"Executing: {cmd}")
            cur.execute(cmd)

        print("Migration completed successfully!")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    migrate()
