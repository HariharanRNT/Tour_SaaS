import asyncio
import sys
import os
from sqlalchemy import text

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal

async def check_logs():
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("SELECT id, booking_id, type, status, error, created_at FROM notification_logs ORDER BY created_at DESC LIMIT 10"))
        rows = [dict(row._mapping) for row in result.fetchall()]
        import json
        def json_serial(obj):
            from datetime import datetime
            if isinstance(obj, datetime):
                return obj.isoformat()
            return str(obj)
        print(json.dumps(rows, default=json_serial, indent=2))

if __name__ == "__main__":
    asyncio.run(check_logs())
