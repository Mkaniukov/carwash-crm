import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import time
from app.core.security import hash_password

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

# 🔹 CORS (localhost + Render frontend URL)
_cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").strip().split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins if o.strip()],
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


# 🔹 Создание первого OWNER при старте
@app.on_event("startup")
def create_owner():
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
            print("Owner created")
    finally:
        db.close()

@app.on_event("startup")
def create_default_settings():
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
    db = SessionLocal()
    try:
        if db.query(Service).first() is not None:
            return
        for d in DEFAULT_SERVICES:
            db.add(Service(name=d["name"], price=d["price"], duration=d["duration"], description=d.get("description") or ""))
        db.commit()
        print("Default services seeded")
    finally:
        db.close()