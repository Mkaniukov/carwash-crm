"""
Migration: normalize booking status to new enum (booked, completed, cancelled),
add marketing_consent/marketing_consent_at columns, drop checkin_forms and payments tables.
Run from backend root: python -m scripts.migrate_booking_status
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import engine

def run():
    dialect = engine.dialect.name

    # PostgreSQL: ADD VALUE cannot run inside a transaction — run in autocommit
    if dialect == "postgresql":
        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            try:
                conn.execute(text("ALTER TYPE bookingstatus ADD VALUE IF NOT EXISTS 'cancelled'"))
                print("Added enum value 'cancelled'.")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print("Enum value 'cancelled' already exists.")
                else:
                    raise
        import time
        time.sleep(0.3)

    with engine.begin() as conn:
        # Normalize statuses (for existing rows)
        conn.execute(text("""
            UPDATE bookings
            SET status = 'completed'
            WHERE status IN ('paid', 'checked_in', 'confirmed')
        """))
        conn.execute(text("""
            UPDATE bookings
            SET status = 'cancelled'
            WHERE status IN ('canceled_by_client', 'canceled_by_staff', 'no_show')
        """))
        print("Booking statuses updated.")

    # ADD COLUMN — each in its own transaction (PostgreSQL aborts transaction on "column already exists")
    if dialect == "sqlite":
        stmts = [
            "ALTER TABLE bookings ADD COLUMN marketing_consent BOOLEAN DEFAULT 0 NOT NULL",
            "ALTER TABLE bookings ADD COLUMN marketing_consent_at DATETIME",
        ]
    else:
        stmts = [
            "ALTER TABLE bookings ADD COLUMN marketing_consent BOOLEAN DEFAULT FALSE NOT NULL",
            "ALTER TABLE bookings ADD COLUMN marketing_consent_at TIMESTAMP",
        ]
    for stmt in stmts:
        try:
            with engine.begin() as conn:
                conn.execute(text(stmt))
            print("Added column.")
        except Exception as e:
            if "duplicate" in str(e).lower() or "already exists" in str(e).lower():
                print("Column already exists.")
            else:
                raise

    with engine.begin() as conn:
        # Drop checkin_forms and payments tables if they exist
        for table in ("checkin_forms", "payments"):
            try:
                conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
                print(f"Dropped table {table}.")
            except Exception as e:
                print(f"Note: {table} - {e}")
    print("Done.")

if __name__ == "__main__":
    run()
