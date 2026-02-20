"""
Миграция: приведение status бронирований к новому enum (booked, completed, cancelled),
добавление колонок marketing_consent/marketing_consent_at, удаление таблиц checkin_forms, payments.
Запуск: из корня backend: python -m scripts.migrate_booking_status
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import engine

def run():
    dialect = engine.dialect.name

    # PostgreSQL: ADD VALUE нельзя внутри транзакции — выполняем в autocommit
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
        # Нормализация статусов (для существующих строк)
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

        # Добавить колонки DSGVO (игнорируем ошибку если уже есть)
        dialect = engine.dialect.name
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
                conn.execute(text(stmt))
                print("Added column.")
            except Exception as e:
                if "duplicate" in str(e).lower() or "already exists" in str(e).lower():
                    print("Column already exists.")
                else:
                    raise

        # Удаление таблиц checkin_forms и payments (если есть)
        for table in ("checkin_forms", "payments"):
            try:
                conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
                print(f"Dropped table {table}.")
            except Exception as e:
                print(f"Note: {table} - {e}")
    print("Done.")

if __name__ == "__main__":
    run()
