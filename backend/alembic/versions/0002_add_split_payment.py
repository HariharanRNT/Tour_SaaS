"""
Split Payment: Add new columns to packages, bookings, booking_refunds,
and create the booking_payments ledger table.

All new columns use ADD COLUMN IF NOT EXISTS (PostgreSQL) via batch_alter_table.
The booking_payments table creation is guarded by _table_exists().
This migration is safe to re-run on an already-updated database.

Revision ID: 0002
Revises:     0001
Create Date: 2026-06-11
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# ── Alembic identifiers ────────────────────────────────────────────────────────
revision: str = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


# ── Helpers ────────────────────────────────────────────────────────────────────

def _column_exists(table: str, column: str) -> bool:
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
    # ── 1. packages: split payment configuration columns ──────────────────────
    with op.batch_alter_table("packages") as batch_op:
        if not _column_exists("packages", "split_payment_enabled"):
            batch_op.add_column(sa.Column("split_payment_enabled", sa.Boolean(), nullable=True, server_default="false"))
        if not _column_exists("packages", "split_payment_mode"):
            batch_op.add_column(sa.Column("split_payment_mode", sa.String(length=20), nullable=True))
        if not _column_exists("packages", "advance_payment_type"):
            batch_op.add_column(sa.Column("advance_payment_type", sa.String(length=15), nullable=True))
        if not _column_exists("packages", "advance_payment_value"):
            batch_op.add_column(sa.Column("advance_payment_value", sa.Numeric(10, 2), nullable=True))
        if not _column_exists("packages", "final_payment_due_days"):
            batch_op.add_column(sa.Column("final_payment_due_days", sa.Integer(), nullable=True))
        if not _column_exists("packages", "final_payment_due_direction"):
            batch_op.add_column(sa.Column("final_payment_due_direction", sa.String(length=20), nullable=True))

    # ── 2. bookings: split payment tracking columns ────────────────────────────
    with op.batch_alter_table("bookings") as batch_op:
        if not _column_exists("bookings", "is_split_payment"):
            batch_op.add_column(sa.Column("is_split_payment", sa.Boolean(), nullable=True, server_default="false"))
        if not _column_exists("bookings", "split_payment_mode"):
            batch_op.add_column(sa.Column("split_payment_mode", sa.String(length=20), nullable=True))
        if not _column_exists("bookings", "advance_amount"):
            batch_op.add_column(sa.Column("advance_amount", sa.Numeric(10, 2), nullable=True))
        if not _column_exists("bookings", "final_amount"):
            batch_op.add_column(sa.Column("final_amount", sa.Numeric(10, 2), nullable=True))
        if not _column_exists("bookings", "final_payment_due_date"):
            batch_op.add_column(sa.Column("final_payment_due_date", sa.Date(), nullable=True))
        if not _column_exists("bookings", "advance_payment_status"):
            batch_op.add_column(sa.Column("advance_payment_status", sa.String(length=20), nullable=True, server_default="'NOT_APPLICABLE'"))
        if not _column_exists("bookings", "final_payment_status"):
            batch_op.add_column(sa.Column("final_payment_status", sa.String(length=20), nullable=True, server_default="'NOT_APPLICABLE'"))

    # ── 3. booking_refunds: refund_basis column ────────────────────────────────
    with op.batch_alter_table("booking_refunds") as batch_op:
        if not _column_exists("booking_refunds", "refund_basis"):
            batch_op.add_column(sa.Column("refund_basis", sa.String(length=20), nullable=True))

    # ── 4. booking_payments table ──────────────────────────────────────────────
    if not _table_exists("booking_payments"):
        op.create_table(
            "booking_payments",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False,
                      server_default=sa.text("gen_random_uuid()")),
            sa.Column("booking_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("payment_type", sa.String(length=20), nullable=False),   # FULL | ADVANCE | FINAL
            sa.Column("amount", sa.Numeric(10, 2), nullable=False),
            sa.Column("payment_status", sa.String(length=20), nullable=True, server_default="'PENDING'"),
            sa.Column("razorpay_order_id", sa.String(length=100), nullable=True),
            sa.Column("razorpay_payment_id", sa.String(length=100), nullable=True),
            sa.Column("razorpay_link_id", sa.String(length=100), nullable=True),
            sa.Column("razorpay_link_url", sa.String(length=500), nullable=True),
            sa.Column("payment_date", sa.DateTime(timezone=True), nullable=True),
            sa.Column("due_date", sa.Date(), nullable=True),
            sa.Column("link_sent_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("link_expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("triggered_by", sa.String(length=10), nullable=True),
            sa.Column("triggered_by_name", sa.String(length=100), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_booking_payments_booking_id", "booking_payments", ["booking_id"])


# ── Downgrade ──────────────────────────────────────────────────────────────────

def downgrade() -> None:
    # Drop booking_payments table
    if _table_exists("booking_payments"):
        if _index_exists("ix_booking_payments_booking_id", "booking_payments"):
            op.drop_index("ix_booking_payments_booking_id", table_name="booking_payments")
        op.drop_table("booking_payments")

    # Remove booking_refunds columns
    with op.batch_alter_table("booking_refunds") as batch_op:
        if _column_exists("booking_refunds", "refund_basis"):
            batch_op.drop_column("refund_basis")

    # Remove bookings columns
    with op.batch_alter_table("bookings") as batch_op:
        for col in ["final_payment_status", "advance_payment_status",
                    "final_payment_due_date", "final_amount", "advance_amount",
                    "split_payment_mode", "is_split_payment"]:
            if _column_exists("bookings", col):
                batch_op.drop_column(col)

    # Remove packages columns
    with op.batch_alter_table("packages") as batch_op:
        for col in ["final_payment_due_direction", "final_payment_due_days",
                    "advance_payment_value", "advance_payment_type",
                    "split_payment_mode", "split_payment_enabled"]:
            if _column_exists("packages", col):
                batch_op.drop_column(col)
