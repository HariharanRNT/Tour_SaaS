import asyncio
import asyncpg
import json

async def run():
    # Extracted from .env
    dsn = "postgresql://postgres:1243@localhost:5432/tour_saas"
    conn = await asyncpg.connect(dsn)
    try:
        rows = await conn.fetch("SELECT id, domain, agency_name, homepage_settings FROM agents")
        output = [f"Found {len(rows)} agents.\n"]
        for row in rows:
            settings = row['homepage_settings']
            if isinstance(settings, str):
                try:
                    settings = json.loads(settings)
                except:
                    settings = {}
            
            output.append(f"--- Agent ---")
            output.append(f"ID: {row['id']}")
            output.append(f"Domain: {row['domain']}")
            output.append(f"Agency: {row['agency_name']}")
            if settings:
                output.append(f"Headline 1: {settings.get('headline1')}")
                output.append(f"Headline 2: {settings.get('headline2')}")
            else:
                output.append("No homepage settings found.")
            output.append("-" * 20)
        
        with open("agents_dump.txt", "w", encoding="utf-8") as f:
            f.write("\n".join(output))
        print("Agents dumped to agents_dump.txt")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run())
