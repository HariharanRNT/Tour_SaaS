"""Script to create PostgreSQL database"""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def create_database():
    """Create PostgreSQL database"""
    try:
        # Connect to PostgreSQL server (default postgres database)
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            user="postgres",
            password="1243",
            database="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname='tour_saas'")
        exists = cursor.fetchone()
        
        if exists:
            print("[INFO] Database 'tour_saas' already exists. Dropping and recreating...")
            # Terminate existing connections
            cursor.execute("""
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = 'tour_saas'
                AND pid <> pg_backend_pid()
            """)
            cursor.execute("DROP DATABASE tour_saas")
            print("[OK] Dropped existing database")
        
        # Create database
        cursor.execute("CREATE DATABASE tour_saas")
        print("[OK] Database 'tour_saas' created successfully!")
        
        cursor.close()
        conn.close()
        
        print("\nNext steps:")
        print("1. Run: python init_db.py")
        print("2. Run: python create_admin.py")
        print("3. Restart the server")
        
    except psycopg2.Error as e:
        print(f"[ERROR] Failed to create database: {e}")
        print("\nPlease ensure:")
        print("1. PostgreSQL is installed and running")
        print("2. PostgreSQL is accessible on localhost:5432")
        print("3. Username 'postgres' with password 'postgres' exists")
        print("4. Or update the credentials in this script")

if __name__ == "__main__":
    create_database()
