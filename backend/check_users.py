import asyncio
import asyncpg

async def run():
    dsn = "postgresql://postgres:1243@localhost:5432/tour_saas"
    conn = await asyncpg.connect(dsn)
    try:
        rows = await conn.fetch("SELECT email, role, domain, agent_id FROM users")
        print(f"--- Users ---")
        for row in rows:
            print(f"Email: {row['email']}, Role: {row['role']}, Domain: {row['domain']}, AgentID: {row['agent_id']}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run())
