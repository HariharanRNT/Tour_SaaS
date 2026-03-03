import os
import sys
import psycopg2

# Add the backend directory to sys.path if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
# Convert postgresql+asyncpg to postgresql for psycopg2
if DATABASE_URL and DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

def run_migration():
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found in environment.")
        return

    try:
        print(f"Connecting to database...")
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        # Rename category to trip_style
        try:
            cur.execute("ALTER TABLE packages RENAME COLUMN category TO trip_style;")
            print("Successfully renamed 'category' to 'trip_style'")
        except psycopg2.errors.UndefinedColumn:
            print("Column 'category' does not exist or has already been renamed.")
            # Rollback the failed transaction within the connection
            # But we're in autocommit, so it's fine, psycopg2 just raises exception
        
        # Rename tour_types to activities
        try:
            cur.execute("ALTER TABLE packages RENAME COLUMN tour_types TO activities;")
            print("Successfully renamed 'tour_types' to 'activities'")
        except psycopg2.errors.UndefinedColumn:
            print("Column 'tour_types' does not exist or has already been renamed.")

        cur.close()
        conn.close()
        print("Migration compelted successfully.")
        
    except Exception as e:
        print(f"Error executing migration: {e}")

if __name__ == "__main__":
    run_migration()
