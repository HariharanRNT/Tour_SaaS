import asyncio
import os
import sys
import json

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models import Package

async def check_destinations():
    output_file = "tmp/pkg_destinations_output.txt"
    os.makedirs("tmp", exist_ok=True)
    with open(output_file, "w") as f:
        async with AsyncSessionLocal() as db:
            query = select(Package)
            result = await db.execute(query)
            packages = result.scalars().all()
            
            f.write(f"Found {len(packages)} packages.\n")
            for pkg in packages:
                f.write(f"ID: {pkg.id}, Title: {pkg.title}, Mode: {pkg.package_mode}\n")
                f.write(f"  Destination: {pkg.destination}\n")
                f.write(f"  Destinations (JSON string): {pkg.destinations}\n")
                try:
                    dest_data = json.loads(pkg.destinations) if pkg.destinations else []
                    f.write(f"  Parsed: {json.dumps(dest_data, indent=2)}\n")
                except Exception as e:
                    f.write(f"  Error parsing JSON: {e}\n")
                f.write("-" * 20 + "\n")
    print(f"Results written to {output_file}")

if __name__ == "__main__":
    asyncio.run(check_destinations())
