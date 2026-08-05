import asyncio
import sys
sys.path.append('.')
from app.database import AsyncSessionLocal
from sqlalchemy import text

async def fix():
    async with AsyncSessionLocal() as s:
        await s.execute(text("UPDATE email_logs SET status = 'PENDING' WHERE status = 'pending'"))
        await s.commit()
    print('Fixed')

asyncio.run(fix())
