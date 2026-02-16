import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import time
from app.core.security import hash_password

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# 🔹 Проверка SECRET_KEY в production
if os.getenv("DATABASE_URL", "").startswith("postgres"):
    sk = os.getenv("SECRET_KEY", "")
    if not sk or sk == "supersecretkey":
        log.warning("SECRET_KEY is default or missing in production. Set SECRET_KEY in Render Environment.")

# 🔹 Создаём приложение
app = FastAPI(title="Carwash CRM")

# 🔹 Импорт БД
from app.db.session import engine, Base, SessionLocal

# 🔹 Импорт всех моделей ДО create_all
from app.models.user import User
from app.models.booking import Booking
from app.models.service import Service
from app.models.settings import BusinessSettings

# 🔹 Импорт роутеров
from app.routers.auth import router as auth_router
from app.routers.owner import router as owner_router
from app.routers.worker import router as worker_router
from app.routers.public import router as public_router

# 🔹 CORS (localhost + любой фронт на Render)
# В production разрешаем любой origin на *.onrender.com (поддомен может отличаться)
_cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").strip().split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https://.*\.onrender\.com" if os.getenv("DATABASE_URL", "").startswith("postgres") else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔥 ВАЖНО — create_all должен быть после импорта моделей
Base.metadata.create_all(bind=engine)

# 🔹 Подключаем роутеры
app.include_router(auth_router)
app.include_router(owner_router)
app.include_router(worker_router)
app.include_router(public_router)

# 🔹 Проверочный endpoint
@app.get("/")
def root():
    return {"status": "CRM backend running"}


# 🔹 Диагностика для деплоя (owner/services созданы?)
@app.get("/public/health")
def health_check():
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        owner = db.query(User).filter(User.username == "owner").first()
        services_count = db.query(Service).count()
        return {
            "status": "ok",
            "owner_exists": owner is not None,
            "services_count": services_count,
        }
    finally:
        db.close()


# 🔹 Создание первого OWNER при старте
@app.on_event("startup")
def create_owner():
    log.info("Startup: create_owner running")
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == "owner").first()
        if not existing:
            user = User(
                username="owner",
                password_hash=hash_password("admin123"),
                role="owner"
            )
            db.add(user)
            db.commit()
            log.info("Owner created (login: owner / admin123)")
        else:
            log.info("Owner already exists")
    except Exception as e:
        log.exception("Owner creation failed: %s", e)
    finally:
        db.close()


@app.on_event("startup")
def create_default_settings():
    log.info("Startup: create_default_settings running")
    db = SessionLocal()
    try:
        existing = db.query(BusinessSettings).first()
        if not existing:
            settings = BusinessSettings(
                work_start=time(7, 30),
                work_end=time(18, 0)
            )
            db.add(settings)
            db.commit()
            log.info("Default settings created")
        else:
            log.info("Settings already exist")
    except Exception as e:
        log.exception("Settings creation failed: %s", e)
    finally:
        db.close()


# Сервисы по умолчанию (если БД пустая — например после деплоя на Render)
DEFAULT_SERVICES = [
    {"name": "CAR SPA®", "price": 24, "duration": 30, "description": "Schnelle, günstige und schonende textile Außenwäsche. Manuelle Vorreinigung – Aktivschaum – Shampoowäsche – Radwäsche – maschinelles Trocknen."},
    {"name": "CAR SOFT", "price": 36, "duration": 30, "description": "Intensive, schonende textile Außenwäsche mit Felgenreinigung extra. Manuelle Vorreinigung – händische Felgenreinigung – Aktivschaum – Shampoowäsche – Radwäsche – maschinelle Trocknung & zusätzliche manuelle Nachtrocknung."},
    {"name": "CAR EASY", "price": 74, "duration": 90, "description": "Einfache Außen- und Innenreinigung (ohne Kofferraum oder Ladefläche). Manuelle Vorreinigung – händische Felgenreinigung – Aktivschaum – Shampoowäsche – Radwäsche – maschinelle Trocknung & zusätzliche manuelle Nachtrocknung – Reinigung von Fußmatten, Innenflächen (nur glatte Flächen) und Armaturen – Saugen von Teppichen, Sitzen, Seitenverkleidungen – Reinigung von Scheiben und Spiegeln – fachgerechte Endkontrolle."},
    {"name": "CAR WELLNESS", "price": 86, "duration": 120, "description": "Intensive Außen- und Innenreinigung (mit Kofferraum oder Ladefläche). Manuelle Vorreinigung – händische Felgenreinigung – Aktivschaum – Shampoowäsche – Radwäsche – maschinelle Trocknung & zusätzliche manuelle Nachtrocknung – Reinigung von Fußmatten, Innenflächen (nur glatte Flächen) und Armaturen – Saugen von Teppichen, Sitzen, Seitenverkleidungen – Reinigung von Scheiben und Spiegeln – fachgerechte Endkontrolle."},
    {"name": "CAR INTENSE (Innen)", "price": 68, "duration": 90, "description": "Intensive Innenreinigung (mit Kofferraum oder Ladefläche). Reinigung von Fußmatten, Innenflächen (nur glatte Flächen) und Armaturen – Saugen von Teppichen, Sitzen, Seitenverkleidungen – Reinigung von Scheiben und Spiegeln – fachgerechte Endkontrolle."},
]


@app.on_event("startup")
def seed_default_services():
    log.info("Startup: seed_default_services running")
    db = SessionLocal()
    try:
        if db.query(Service).first() is not None:
            log.info("Services already exist, skip seed")
            return
        for d in DEFAULT_SERVICES:
            db.add(Service(name=d["name"], price=d["price"], duration=d["duration"], description=d.get("description") or ""))
        db.commit()
        log.info("Default services seeded (%d items)", len(DEFAULT_SERVICES))
    except Exception as e:
        log.exception("Seed services failed: %s", e)
    finally:
        db.close()