"""
Script to set PostgreSQL password and create database

Run this script to:
1. Set PostgreSQL password to 'postgres'
2. Create the tour_saas database
"""

print("PostgreSQL Password Setup")
print("=" * 50)
print()
print("OPTION 1: Set password using psql")
print("-" * 50)
print("Run these commands in Command Prompt:")
print()
print("1. Open Command Prompt as Administrator")
print("2. Run: psql -U postgres")
print("3. When prompted for password, press Enter (if no password set)")
print("4. Run: ALTER USER postgres PASSWORD 'postgres';")
print("5. Run: CREATE DATABASE tour_saas;")
print("6. Run: \\q")
print()
print("=" * 50)
print()
print("OPTION 2: Use pgAdmin")
print("-" * 50)
print("1. Open pgAdmin")
print("2. Connect to PostgreSQL server")
print("3. Right-click on 'Databases' -> Create -> Database")
print("4. Name: tour_saas")
print("5. Click Save")
print()
print("=" * 50)
print()
print("After setting up the database, run:")
print("  python init_db.py")
print("  python create_admin.py")
print()
