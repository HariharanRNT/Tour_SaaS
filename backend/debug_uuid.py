
import asyncio
from sqlalchemy import text
from app.database import engine

async def find_uuid():
    uuid_to_find = 'cbd6dd8d-57fd-434b-a482-1c2b0988c746'
    tables = ['activities', 'packages', 'users', 'agents', 'popular_destinations']
    
    async with engine.connect() as conn:
        for table in tables:
            try:
                # Search in all columns of the table
                res = await conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'"))
                columns = [r[0] for r in res]
                
                for col in columns:
                    try:
                        query = text(f"SELECT * FROM {table} WHERE CAST({col} AS TEXT) = :val")
                        found = await conn.execute(query, {"val": uuid_to_find})
                        row = found.first()
                        if row:
                            print(f"FOUND UUID in table '{table}', column '{col}'")
                            print(f"Row data: {row}")
                    except Exception:
                        pass
            except Exception as e:
                print(f"Error checking table {table}: {e}")

if __name__ == "__main__":
    asyncio.run(find_uuid())
