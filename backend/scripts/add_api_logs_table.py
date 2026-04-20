"""
Migration: Align api_logs table with the new schema.
Adds missing columns if they don't already exist.
Safe to run multiple times.

Usage:
    cd backend
    python scripts/add_api_logs_table.py
"""
import asyncio
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import settings


CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS api_logs (
    id              TEXT PRIMARY KEY,
    method          TEXT NOT NULL,
    endpoint        TEXT NOT NULL,
    query_params    TEXT,
    request_body    TEXT,
    request_headers TEXT,
    response_body   TEXT,
    status_code     INTEGER NOT NULL,
    status          TEXT NOT NULL,
    duration_ms     REAL,
    error_type      TEXT,
    error_message   TEXT,
    stack_trace     TEXT,
    user_id         TEXT,
    user_role       TEXT,
    ip_address      TEXT,
    user_agent      TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

# ALTER TABLE statements to add missing columns (PostgreSQL syntax)
ADD_COLUMNS_SQL = [
    "ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS query_params    TEXT;",
    "ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS request_body    TEXT;",
    "ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS response_body   TEXT;",
    "ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS duration_ms     REAL;",
    "ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS user_role       TEXT;",
    "ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS user_agent      TEXT;",
]

CREATE_INDEXES_SQL = [
    "CREATE INDEX IF NOT EXISTS ix_api_logs_method      ON api_logs(method);",
    "CREATE INDEX IF NOT EXISTS ix_api_logs_endpoint    ON api_logs(endpoint);",
    "CREATE INDEX IF NOT EXISTS ix_api_logs_status      ON api_logs(status);",
    "CREATE INDEX IF NOT EXISTS ix_api_logs_status_code ON api_logs(status_code);",
    "CREATE INDEX IF NOT EXISTS ix_api_logs_error_type  ON api_logs(error_type);",
    "CREATE INDEX IF NOT EXISTS ix_api_logs_user_id     ON api_logs(user_id);",
    "CREATE INDEX IF NOT EXISTS ix_api_logs_created_at  ON api_logs(created_at);",
]


async def run_migration():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        print("Ensuring api_logs table exists...")
        await conn.execute(text(CREATE_TABLE_SQL))

        print("Adding any missing columns...")
        for sql in ADD_COLUMNS_SQL:
            try:
                await conn.execute(text(sql))
            except Exception as e:
                # Column may already exist under old name — skip
                print(f"  Skipped: {sql.strip()[:60]}... ({e})")

        print("Ensuring indexes...")
        for idx_sql in CREATE_INDEXES_SQL:
            try:
                await conn.execute(text(idx_sql))
            except Exception as e:
                print(f"  Index skipped: {e}")

        print("OK: api_logs table and indexes ready.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_migration())
