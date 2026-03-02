"""
Add notification_emails column to business_settings if missing.
Run from backend root: python -m scripts.add_notification_emails_column
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import engine


def run():
    dialect = engine.dialect.name
    if dialect == "sqlite":
        stmt = "ALTER TABLE business_settings ADD COLUMN notification_emails TEXT DEFAULT '[]' NOT NULL"
    else:
        stmt = "ALTER TABLE business_settings ADD COLUMN notification_emails TEXT DEFAULT '[]' NOT NULL"
    try:
        with engine.begin() as conn:
            conn.execute(text(stmt))
        print("Added column notification_emails.")
    except Exception as e:
        if "duplicate" in str(e).lower() or "already exists" in str(e).lower():
            print("Column notification_emails already exists.")
        else:
            raise
    print("Done.")


if __name__ == "__main__":
    run()
