from sqlalchemy import create_engine, text
import os

DATABASE_URL = "postgresql://postgres:1243@localhost:5432/tour_saas"
engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print(f"✅ Connection successful: {result.fetchone()}")
except Exception as e:
    print(f"❌ Connection failed: {e}")
