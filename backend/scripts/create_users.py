"""
One-time script to create owner and worker users.
Uses the same DB and hash_password as the app. Run from backend dir: python -m scripts.create_users
"""
import sys
from pathlib import Path

# Add app to path
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
    db = SessionLocal()
    try:
        ensure_user(db, "owner", "admin123", "owner")
        ensure_user(db, "worker1", "worker123", "worker")
        db.commit()
        print("Done. You can log in with username 'owner' / 'admin123' or 'worker1' / 'worker123'.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
