import asyncio
import json
import sys
import os

# Ensure the root directory is in the python path
sys.path.append(os.getcwd())

from app.database import AsyncSessionLocal
from sqlalchemy import text
import logging

# Disable SQL logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

async def check():
    output = []
    async with AsyncSessionLocal() as db:
        res = await db.execute(text('SELECT id, domain, agency_name, homepage_settings FROM agents'))
        rows = res.all()
        if not rows:
            output.append("No agents found in database.")
        else:
            for row in rows:
                output.append(f"ID: {row.id}")
                output.append(f"Domain: {row.domain}")
                output.append(f"Agency: {row.agency_name}")
                output.append("Settings JSON:")
                output.append(json.dumps(row.homepage_settings, indent=2))
                output.append("-" * 20)
    
    with open('db_check_results.txt', 'w') as f:
        f.write("\n".join(output))
    print("Results written to db_check_results.txt")

if __name__ == "__main__":
    asyncio.run(check())
