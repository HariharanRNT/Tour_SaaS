"""
Baseline: Consolidate all pre-Alembic schema changes.

This migration documents every schema change that was previously applied
via manual scripts (update_schema.py, force_db_fix_reviews.py,
migrations/add_review_system.py, etc.).

IMPORTANT: This migration is IDEMPOTENT. All DDL uses ADD COLUMN IF NOT EXISTS
(PostgreSQL) or is wrapped in a batch operation (SQLite) so re-running it on an
already-up-to-date database is safe.

To stamp an existing database WITHOUT running any DDL (i.e. the DB is already
current), run:

    alembic stamp head

To apply this migration to a fresh database, run:

    alembic upgrade head

Revision ID: 0001
Revises:     (none — initial baseline)
Create Date: 2026-06-04
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# ── Alembic identifiers ────────────────────────────────────────────────────────
revision: str = "0001"
down_revision = None          # This is the first revision
branch_labels = None
depends_on = None


# ── Helpers ────────────────────────────────────────────────────────────────────

def _is_sqlite() -> bool:
    """Return True when running against SQLite (dev/test)."""
    return op.get_bind().dialect.name == "sqlite"


def _column_exists(table: str, column: str) -> bool:
    """Check if a column exists in the given table (PostgreSQL & SQLite safe)."""
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = [c["name"] for c in insp.get_columns(table)]
    return column in cols


def _table_exists(table: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return table in insp.get_table_names()


def _index_exists(index: str, table: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return any(ix["name"] == index for ix in insp.get_indexes(table))


# ── Upgrade ────────────────────────────────────────────────────────────────────

def upgrade() -> None:
    """
    Apply all schema changes from the pre-Alembic era.

    Sources consolidated:
      - update_schema.py                  (review columns on packages & bookings)
      - force_db_fix_reviews.py           (review columns on bookings)
      - migrations/add_review_system.py   (review system: columns + table + indexes)
      - migrations/add_master_data_tables.py (master data tables)
    """

    # ── 1. Packages: review aggregate columns ─────────────────────────────────
    with op.batch_alter_table("packages") as batch_op:
        if not _column_exists("packages", "average_rating"):
            batch_op.add_column(
                sa.Column("average_rating", sa.Float(), nullable=True)
            )
        if not _column_exists("packages", "review_count"):
            batch_op.add_column(
                sa.Column("review_count", sa.Integer(), nullable=False, server_default="0")
            )

    # ── 2. Bookings: review tracking columns ──────────────────────────────────
    with op.batch_alter_table("bookings") as batch_op:
        if not _column_exists("bookings", "review_status"):
            batch_op.add_column(
                sa.Column(
                    "review_status",
                    sa.String(length=20),
                    nullable=False,
                    server_default="PENDING",
                )
            )
        if not _column_exists("bookings", "review_sent_at"):
            batch_op.add_column(
                sa.Column("review_sent_at", sa.DateTime(timezone=True), nullable=True)
            )
        if not _column_exists("bookings", "review_submitted_at"):
            batch_op.add_column(
                sa.Column(
                    "review_submitted_at", sa.DateTime(timezone=True), nullable=True
                )
            )
        if not _column_exists("bookings", "review_token"):
            batch_op.add_column(
                sa.Column("review_token", sa.String(length=512), nullable=True)
            )
        if not _column_exists("bookings", "review_count"):
            batch_op.add_column(
                sa.Column(
                    "review_count", sa.Integer(), nullable=False, server_default="0"
                )
            )
        if not _column_exists("bookings", "review_message"):
            batch_op.add_column(
                sa.Column("review_message", sa.Text(), nullable=True)
            )

    # ── 3. Unique index on bookings.review_token ──────────────────────────────
    if not _index_exists("ix_bookings_review_token", "bookings"):
        op.create_index(
            "ix_bookings_review_token",
            "bookings",
            ["review_token"],
            unique=True,
            # PostgreSQL partial index — only index non-null tokens
            postgresql_where=sa.text("review_token IS NOT NULL"),
        )

    # ── 4. booking_reviews table ──────────────────────────────────────────────
    if not _table_exists("booking_reviews"):
        op.create_table(
            "booking_reviews",
            sa.Column(
                "id",
                sa.String(length=36),
                nullable=False,
                server_default=sa.text("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))")
                # Note: PostgreSQL uses gen_random_uuid() — handled by model default
            ),
            sa.Column("booking_id", sa.String(length=36), nullable=False),
            sa.Column("package_id", sa.String(length=36), nullable=True),
            sa.Column("agent_id", sa.String(length=36), nullable=True),
            sa.Column("customer_id", sa.String(length=36), nullable=True),
            sa.Column("rating", sa.Integer(), nullable=False),
            sa.Column("review_message", sa.Text(), nullable=True),
            sa.Column(
                "submitted_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_rating_range"),
            sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["package_id"], ["packages.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["agent_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["customer_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("booking_id", name="uq_booking_review"),
        )
        op.create_index("ix_booking_reviews_booking_id", "booking_reviews", ["booking_id"])
        op.create_index("ix_booking_reviews_package_id", "booking_reviews", ["package_id"])
        op.create_index("ix_booking_reviews_agent_id", "booking_reviews", ["agent_id"])


# ── Downgrade ──────────────────────────────────────────────────────────────────

def downgrade() -> None:
    """
    Remove all changes introduced by the baseline migration.

    WARNING: This will drop the booking_reviews table and review-related
    columns. Only run this if you are intentionally reverting to a pre-review
    schema state (e.g. during development).
    """
    # Drop booking_reviews table and its indexes
    if _table_exists("booking_reviews"):
        op.drop_index("ix_booking_reviews_agent_id", table_name="booking_reviews")
        op.drop_index("ix_booking_reviews_package_id", table_name="booking_reviews")
        op.drop_index("ix_booking_reviews_booking_id", table_name="booking_reviews")
        op.drop_table("booking_reviews")

    # Drop review_token unique index
    if _index_exists("ix_bookings_review_token", "bookings"):
        op.drop_index("ix_bookings_review_token", table_name="bookings")

    # Remove review columns from bookings
    with op.batch_alter_table("bookings") as batch_op:
        for col in ["review_message", "review_count", "review_token",
                    "review_submitted_at", "review_sent_at", "review_status"]:
            if _column_exists("bookings", col):
                batch_op.drop_column(col)

    # Remove review aggregate columns from packages
    with op.batch_alter_table("packages") as batch_op:
        for col in ["review_count", "average_rating"]:
            if _column_exists("packages", col):
                batch_op.drop_column(col)
