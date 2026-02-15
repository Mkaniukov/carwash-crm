"""
One-time script: delete all services and seed with CAR SPA services.
Run from backend dir:
  python -m scripts.seed_services              # if you have no bookings
  python -m scripts.seed_services --clear-bookings   # if you have bookings (removes them)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.session import SessionLocal
from app.models.user import User  # load before Booking so relationship("User") resolves
from app.models.service import Service
from app.models.booking import Booking

SERVICES = {
    "car_spa": {
        "name": "CAR SPA®",
        "price": 24,
        "duration": 30,
        "description": (
            "Schnelle, günstige und schonende textile Außenwäsche. "
            "Manuelle Vorreinigung – Aktivschaum – Shampoowäsche – "
            "Radwäsche – maschinelles Trocknen."
        ),
    },
    "car_soft": {
        "name": "CAR SOFT",
        "price": 36,
        "duration": 30,
        "description": (
            "Intensive, schonende textile Außenwäsche mit Felgenreinigung extra. "
            "Manuelle Vorreinigung – händische Felgenreinigung – Aktivschaum – "
            "Shampoowäsche – Radwäsche – maschinelle Trocknung & zusätzliche "
            "manuelle Nachtrocknung."
        ),
    },
    "car_easy": {
        "name": "CAR EASY",
        "price": 74,
        "duration": 90,
        "description": (
            "Einfache Außen- und Innenreinigung (ohne Kofferraum oder Ladefläche). "
            "Manuelle Vorreinigung – händische Felgenreinigung – Aktivschaum – "
            "Shampoowäsche – Radwäsche – maschinelle Trocknung & zusätzliche "
            "manuelle Nachtrocknung – Reinigung von Fußmatten, Innenflächen "
            "(nur glatte Flächen) und Armaturen – Saugen von Teppichen, Sitzen, "
            "Seitenverkleidungen – Reinigung von Scheiben und Spiegeln – "
            "fachgerechte Endkontrolle."
        ),
    },
    "car_wellness": {
        "name": "CAR WELLNESS",
        "price": 86,
        "duration": 120,
        "description": (
            "Intensive Außen- und Innenreinigung (mit Kofferraum oder Ladefläche). "
            "Manuelle Vorreinigung – händische Felgenreinigung – Aktivschaum – "
            "Shampoowäsche – Radwäsche – maschinelle Trocknung & zusätzliche "
            "manuelle Nachtrocknung – Reinigung von Fußmatten, Innenflächen "
            "(nur glatte Flächen) und Armaturen – Saugen von Teppichen, Sitzen, "
            "Seitenverkleidungen – Reinigung von Scheiben und Spiegeln – "
            "fachgerechte Endkontrolle."
        ),
    },
    "car_intense": {
        "name": "CAR INTENSE (Innen)",
        "price": 68,
        "duration": 90,
        "description": (
            "Intensive Innenreinigung (mit Kofferraum oder Ladefläche). "
            "Reinigung von Fußmatten, Innenflächen (nur glatte Flächen) "
            "und Armaturen – Saugen von Teppichen, Sitzen, Seitenverkleidungen – "
            "Reinigung von Scheiben und Spiegeln – fachgerechte Endkontrolle."
        ),
    },
}


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Replace all services with CAR SPA list.")
    parser.add_argument(
        "--clear-bookings",
        action="store_true",
        help="Also delete all bookings (required if you have existing bookings).",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.clear_bookings:
            deleted_bookings = db.query(Booking).delete()
            db.commit()
            print(f"Deleted {deleted_bookings} booking(s).")

        try:
            deleted_services = db.query(Service).delete()
            db.commit()
            print(f"Deleted {deleted_services} service(s).")
        except Exception as e:
            db.rollback()
            print(
                "Could not delete services (maybe there are bookings?). "
                "Run with --clear-bookings to remove bookings first."
            )
            raise

        for key, data in SERVICES.items():
            s = Service(
                name=data["name"],
                price=data["price"],
                duration=data["duration"],
                description=data.get("description") or "",
            )
            db.add(s)
            print(f"  + {data['name']} (€{data['price']}, {data['duration']} min)")

        db.commit()
        print("Done. Services seeded.")
    except Exception as e:
        db.rollback()
        print("Error:", e)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
