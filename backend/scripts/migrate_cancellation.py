"""
Migration: Add cancellation policy to packages table,
           add refund columns to bookings table,
           and create booking_refunds table.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

# Use sync engine for migration
sync_url = settings.DATABASE_URL
if sync_url.startswith("postgresql+asyncpg://"):
    sync_url = sync_url.replace("postgresql+asyncpg://", "postgresql://")

engine = create_engine(sync_url)


def migrate():
    with engine.connect() as conn:

        # ── 1. packages table ──────────────────────────────────────────────
        package_columns = [
            ("cancellation_enabled", "BOOLEAN DEFAULT FALSE"),
            ("cancellation_rules",   "JSON DEFAULT '[]'"),
        ]
        for col_name, col_def in package_columns:
            try:
                conn.execute(text(f"ALTER TABLE packages ADD COLUMN {col_name} {col_def}"))
                print(f"✅ packages.{col_name} added")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    print(f"⏭️  packages.{col_name} already exists")
                else:
                    print(f"❌ Error adding packages.{col_name}: {e}")

        # ── 2. bookings table ──────────────────────────────────────────────
        booking_columns = [
            ("refund_amount", "NUMERIC(10, 2)"),
            ("cancelled_at",  "TIMESTAMP WITH TIME ZONE"),
        ]
        for col_name, col_def in booking_columns:
            try:
                conn.execute(text(f"ALTER TABLE bookings ADD COLUMN {col_name} {col_def}"))
                print(f"✅ bookings.{col_name} added")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    print(f"⏭️  bookings.{col_name} already exists")
                else:
                    print(f"❌ Error adding bookings.{col_name}: {e}")

        # ── 3. booking_refunds table ───────────────────────────────────────
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS booking_refunds (
                    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    booking_id          UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
                    razorpay_payment_id VARCHAR,
                    razorpay_refund_id  VARCHAR,
                    refund_amount       NUMERIC(10, 2) NOT NULL,
                    refund_percentage   NUMERIC(5, 2),
                    days_before         INTEGER,
                    status              VARCHAR DEFAULT 'initiated',
                    failure_reason      TEXT,
                    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at          TIMESTAMP WITH TIME ZONE
                )
            """))
            print("✅ booking_refunds table created (or already exists)")
        except Exception as e:
            print(f"❌ Error creating booking_refunds: {e}")

        conn.commit()

    print("\n✅ Cancellation migration complete.")


if __name__ == "__main__":
    migrate()
