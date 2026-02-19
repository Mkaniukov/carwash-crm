"""
One-time reset owner password to OWNER_INITIAL_PASSWORD.
Use when you can't log in (e.g. owner was created with old password).
Run from project root or backend dir with env vars set:

  set OWNER_INITIAL_PASSWORD=YourNewPassword
  set DATABASE_URL=postgresql://...   (copy from Render → carwash-crm-db → Connection string)

  cd backend
  python -m scripts.reset_owner_password
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import hash_password


def main():
    password = (os.getenv("OWNER_INITIAL_PASSWORD") or "").strip()
    if not password:
        print("Error: Set OWNER_INITIAL_PASSWORD environment variable.")
        sys.exit(1)

    db = SessionLocal()
    try:
        owner = db.query(User).filter(User.username == "owner").first()
        if not owner:
            print("Error: No user 'owner' found in database.")
            sys.exit(1)
        owner.password_hash = hash_password(password)
        db.commit()
        print("OK: Owner password updated. Log in with username 'owner' and your new password.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
