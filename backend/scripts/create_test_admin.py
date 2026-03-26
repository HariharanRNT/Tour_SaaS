import asyncio
import sys
import os
from sqlalchemy import text
from passlib.context import CryptContext
import uuid

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from app.models import User, UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_test_admin():
    async with AsyncSessionLocal() as db:
        email = "testadmin@test.com"
        password = "password123"
        hashed_password = pwd_context.hash(password)
        
        # Check if user exists
        result = await db.execute(text(f"SELECT id FROM users WHERE email = '{email}'"))
        existing_id = result.scalar()
        if existing_id:
            await db.execute(text(f"DELETE FROM users WHERE email = '{email}'"))
            await db.commit()
            
        new_id = uuid.uuid4()
        # Use simple SQL with correct column names
        await db.execute(text(f"""
            INSERT INTO users (id, email, password_hash, role, is_active, email_verified, approval_status, created_at)
            VALUES ('{new_id}', '{email}', '{hashed_password}', 'ADMIN', true, true, 'APPROVED', now())
        """))
        await db.commit()
        print(f"TEST_ADMIN_CREATED: {email} / {password}")

if __name__ == "__main__":
    asyncio.run(create_test_admin())
