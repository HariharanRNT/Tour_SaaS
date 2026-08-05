"""
Fix 3 – Enforce UNIQUE constraint on payments.razorpay_payment_id.

The SQLAlchemy model already declares unique=True on this column, but earlier
databases that were created before Alembic tracking started (or whose schema
was applied via raw SQLite CREATE TABLE) may be missing the index/constraint.

This migration is IDEMPOTENT: it checks for the index before creating it so it
is safe to run on databases that already have the constraint.

Revision ID : 0004
Revises     : 20260612_1630-b6e4ba77ebdb_add_advance_cancellation_enabled
Create Date : 2026-06-25
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# ── Alembic identifiers ────────────────────────────────────────────────────────
revision: str = "0004"
down_revision: str = "20260612_1630-b6e4ba77ebdb_add_advance_cancellation_enabled"
branch_labels = None
depends_on = None

# ── Helpers ────────────────────────────────────────────────────────────────────

def _index_exists(index_name: str, table_name: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return any(ix["name"] == index_name for ix in insp.get_indexes(table_name))


# ── Upgrade ────────────────────────────────────────────────────────────────────

def upgrade() -> None:
    """
    Ensure payments.razorpay_payment_id has a UNIQUE index.

    This is the database-level guard for the replay-attack prevention fix
    (Fix 3). Even if two concurrent API requests both pass the application-level
    idempotency check before either commits, the database will reject the second
    INSERT with an IntegrityError, preventing a duplicate activation.
    """

    # SQLite requires batch mode to modify indexes
    # The unique index name mirrors what SQLAlchemy auto-generates
    index_name = "ix_payments_razorpay_payment_id"

    if not _index_exists(index_name, "payments"):
        with op.batch_alter_table("payments", recreate="auto") as batch_op:
            batch_op.create_index(
                index_name,
                ["razorpay_payment_id"],
                unique=True,
            )


# ── Downgrade ──────────────────────────────────────────────────────────────────

def downgrade() -> None:
    """Remove the unique index (reverts Fix 3)."""

    index_name = "ix_payments_razorpay_payment_id"

    if _index_exists(index_name, "payments"):
        with op.batch_alter_table("payments") as batch_op:
            batch_op.drop_index(index_name)
