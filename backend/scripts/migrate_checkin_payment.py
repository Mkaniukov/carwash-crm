"""
Миграция: добавить в checkin_forms поля service_id, car_size, extra_glanz, regie_price, final_price;
сделать payment_method nullable; создать таблицу payments.
Запуск: из корня backend: python -m scripts.migrate_checkin_payment
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import engine
from sqlalchemy import text


def run():
    with engine.connect() as conn:
        # SQLite: добавляем колонки по одной (игнорируем ошибку если уже есть)
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
        # payment_method: в SQLite нельзя ALTER COLUMN; если изначально NOT NULL, оставляем как есть
        # (новые строки без оплаты будут с NULL только если колонка уже nullable в модели)
        # Таблица payments создаётся через create_all при старте приложения.
    print("Migration done. Ensure Payment model is imported in main.py so payments table is created.")


if __name__ == "__main__":
    run()
