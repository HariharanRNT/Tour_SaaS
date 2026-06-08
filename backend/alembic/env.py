"""
Alembic environment configuration for Tour SaaS.

Uses async SQLAlchemy (asyncpg / aiosqlite) and reads the DATABASE_URL
from app.config.settings so credentials are never hardcoded here.

Usage:
  # Generate a new migration (auto-detect changes from models):
  alembic revision --autogenerate -m "description of change"

  # Apply all pending migrations:
  alembic upgrade head

  # Roll back one step:
  alembic downgrade -1

  # Show current revision:
  alembic current

  # Show history:
  alembic history --verbose
"""
import asyncio
import re
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# ── Load project settings ──────────────────────────────────────────────────────
# This imports the same settings object used by the running application, so
# DATABASE_URL is always kept in sync with the .env file.
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.config import settings

# ── Load all SQLAlchemy models so autogenerate can detect changes ──────────────
# Import Base FIRST, then every model module so their tables are registered.
from app.database import Base  # noqa: F401
import app.models  # noqa: F401  — registers all ORM models on Base.metadata

# ── Alembic Config object ──────────────────────────────────────────────────────
config = context.config

# Inject the DATABASE_URL from settings (overrides any value in alembic.ini)
# asyncpg / aiosqlite URLs must be converted to sync equivalents for Alembic.
db_url = settings.DATABASE_URL
# Convert async driver prefixes to sync equivalents for Alembic's DDL operations
db_url = re.sub(r"^postgresql\+asyncpg://", "postgresql+psycopg2://", db_url)
db_url = re.sub(r"^sqlite\+aiosqlite://", "sqlite://", db_url)
config.set_main_option("sqlalchemy.url", db_url)

# Interpret the config file for Python logging (if present)
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata for autogenerate support
target_metadata = Base.metadata


# ── Offline mode ───────────────────────────────────────────────────────────────

def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.
    Generates SQL scripts without a live database connection.
    Useful for generating migration SQL to review before applying.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # Render 'IF NOT EXISTS' for CREATE TABLE so offline scripts are idempotent
        render_as_batch=True,  # needed for SQLite ALTER TABLE support
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# ── Online mode ────────────────────────────────────────────────────────────────

def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        render_as_batch=True,     # SQLite requires batch mode for ALTER TABLE
        compare_type=True,        # detect column type changes
        compare_server_default=True,  # detect default value changes
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations using an async engine (matches the app's runtime engine)."""
    # Re-use the original async URL (not the sync conversion above) so the
    # engine can actually connect during `alembic upgrade head`.
    async_url = settings.DATABASE_URL
    # Alembic's async helper expects the async driver prefix to stay
    connectable = async_engine_from_config(
        {"sqlalchemy.url": async_url},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Entry point for online (connected) migrations."""
    asyncio.run(run_async_migrations())


# ── Entry point ────────────────────────────────────────────────────────────────
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
