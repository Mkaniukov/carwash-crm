"""
One-time script to create owner and worker users.
Password for owner: OWNER_INITIAL_PASSWORD env or default admin123 (local only).
Run from backend dir: python -m scripts.create_users
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import hash_password


def ensure_user(db, username: str, password: str, role: str) -> None:
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        print(f"User '{username}' already exists (role={existing.role}), skipping.")
        return
    user = User(
        username=username,
        password_hash=hash_password(password),
        role=role,
    )
    db.add(user)
    print(f"Created user: username={username}, role={role}")


def main():
    owner_password = os.getenv("OWNER_INITIAL_PASSWORD", "").strip() or "admin123"
    db = SessionLocal()
    try:
        ensure_user(db, "owner", owner_password, "owner")
        ensure_user(db, "worker1", os.getenv("WORKER1_PASSWORD", "worker123"), "worker")
        db.commit()
        print("Done. Log in as owner (password from OWNER_INITIAL_PASSWORD or set in Einstellungen).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
