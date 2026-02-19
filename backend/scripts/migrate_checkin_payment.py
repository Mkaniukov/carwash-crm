"""
Миграция: 1) новые значения enum status в PostgreSQL; 2) колонки в checkin_forms; 3) таблица payments через create_all.
Запуск из корня backend: python -m scripts.migrate_checkin_payment
На Render: в Dashboard → Shell или One-off job: установить DATABASE_URL и выполнить этот скрипт.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import engine, Base
from sqlalchemy import text

DATABASE_URL = os.getenv("DATABASE_URL", "")


def run():
    is_pg = "postgresql" in DATABASE_URL or DATABASE_URL.startswith("postgres://")

    with engine.connect() as conn:
        if is_pg:
            # PostgreSQL: добавить новые значения в enum (имя типа обычно lowercase от имени класса)
            for val in ("booked", "checked_in", "paid"):
                try:
                    conn.execute(text(f"ALTER TYPE bookingstatus ADD VALUE IF NOT EXISTS '{val}'"))
                    conn.commit()
                    print(f"Enum bookingstatus: added value {val}")
                except Exception as e:
                    if "already exists" in str(e).lower():
                        print(f"Enum value {val} already exists, skip")
                    else:
                        print(f"Enum {val}: {e}")

        # Колонки в checkin_forms (SQLite и PostgreSQL)
        for col, sql in [
            ("service_id", "ALTER TABLE checkin_forms ADD COLUMN service_id INTEGER REFERENCES services(id)"),
            ("car_size", "ALTER TABLE checkin_forms ADD COLUMN car_size VARCHAR(16)"),
            ("extra_glanz", "ALTER TABLE checkin_forms ADD COLUMN extra_glanz BOOLEAN DEFAULT 0 NOT NULL"),
            ("regie_price", "ALTER TABLE checkin_forms ADD COLUMN regie_price NUMERIC(10,2)"),
            ("final_price", "ALTER TABLE checkin_forms ADD COLUMN final_price NUMERIC(10,2)"),
        ]:
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"Added column {col}")
            except Exception as e:
                if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                    print(f"Column {col} already exists, skip")
                else:
                    raise

    # Таблица payments создаётся при старте приложения (create_all). При необходимости:
    from app.models.payment import Payment
    Base.metadata.create_all(bind=engine, tables=[Payment.__table__])
    print("Migration done.")


if __name__ == "__main__":
    run()
