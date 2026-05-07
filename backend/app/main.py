import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import time
from app.core.security import hash_password

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# Check SECRET_KEY in production
if os.getenv("DATABASE_URL", "").startswith("postgres"):
    sk = os.getenv("SECRET_KEY", "")
    if not sk or sk == "supersecretkey":
        log.warning("SECRET_KEY is default or missing in production. Set SECRET_KEY in Render Environment.")

# Create app
app = FastAPI(title="Carwash CRM")

# DB import
from app.db.session import engine, Base, SessionLocal

# Import all models BEFORE create_all
from app.models.user import User
from app.models.booking import Booking
from app.models.service import Service
from app.models.settings import BusinessSettings
from app.models.work_time import WorkTime
from app.models.blocked_date import BlockedDate

# Import routers
from app.routers.auth import router as auth_router
from app.routers.owner import router as owner_router
from app.routers.worker import router as worker_router
from app.routers.public import router as public_router

# CORS. CORS_ORIGINS from env (comma-separated), e.g. "https://booking.carelbl.at,https://carwash-crm-web.onrender.com"
_cors_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173").strip()
_cors_origins = [o.strip() for o in _cors_origins_raw.split(",") if o.strip()]
for default in ("https://carwash-crm-web.onrender.com", "https://booking.carelbl.at"):
    if default not in _cors_origins:
        _cors_origins.append(default)

# Add CORS to all responses (including 500/4xx) so browser does not block
def _cors_origin_allowed(origin: str) -> bool:
    if not origin:
        return False
    if origin in _cors_origins:
        return True
    import re
    # *.onrender.com and *.carelbl.at
    return bool(re.match(r"https://(.*\.onrender\.com|.*\.carelbl\.at)$", origin))

@app.middleware("http")
async def add_cors_to_all_responses(request, call_next):
    origin = request.headers.get("origin", "")
    response = await call_next(request)
    if _cors_origin_allowed(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*, Authorization, Content-Type"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https://(.*\.onrender\.com|.*\.carelbl\.at)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# IMPORTANT: create_all must run after model imports
Base.metadata.create_all(bind=engine)

# Include routers
app.include_router(auth_router)
app.include_router(owner_router)
app.include_router(worker_router)
app.include_router(public_router)

# On 500 still return CORS so browser gets Allow-Origin (exception handler runs outside middleware)
def _cors_headers_for_request(request) -> dict:
    origin = request.headers.get("origin", "")
    h = {
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*, Authorization, Content-Type",
    }
    if _cors_origin_allowed(origin):
        h["Access-Control-Allow-Origin"] = origin
        h["Access-Control-Allow-Credentials"] = "true"
    return h


@app.exception_handler(Exception)
def catch_all_exception_handler(request, exc):
    import traceback
    log.exception("Unhandled exception: %s\n%s", exc, traceback.format_exc())
    from fastapi.responses import JSONResponse
    resp = JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )
    for k, v in _cors_headers_for_request(request).items():
        resp.headers[k] = v
    return resp


# Root/health endpoint
@app.get("/")
def root():
    return {"status": "CRM backend running"}


# Deploy diagnostics (owner/services exist?)
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


# Create first OWNER on startup (password from OWNER_INITIAL_PASSWORD)
@app.on_event("startup")
def create_owner():
    log.info("Startup: create_owner running")
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == "owner").first()
        if existing:
            log.info("Owner already exists")
            return
        # Production (PostgreSQL): password from env only. Local (SQLite): default admin123
        is_production = os.getenv("DATABASE_URL", "").startswith("postgres")
        password = os.getenv("OWNER_INITIAL_PASSWORD", "").strip()
        if is_production and not password:
            log.warning("OWNER_INITIAL_PASSWORD not set. Set it in Render Environment to create initial owner.")
            return
        if not password:
            password = "admin123"
        user = User(
            username="owner",
            password_hash=hash_password(password),
            role="owner"
        )
        db.add(user)
        db.commit()
        log.info("Owner created (username: owner). Change password in Einstellungen after first login.")
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


@app.on_event("startup")
def ensure_notification_emails_column():
    """Add notification_emails to business_settings if missing (auto-migration on deploy)."""
    from sqlalchemy import text
    try:
        dialect = engine.dialect.name
        stmt = "ALTER TABLE business_settings ADD COLUMN notification_emails TEXT DEFAULT '[]' NOT NULL"
        with engine.begin() as conn:
            conn.execute(text(stmt))
        log.info("Added column business_settings.notification_emails")
    except Exception as e:
        if "duplicate" in str(e).lower() or "already exists" in str(e).lower():
            log.debug("Column notification_emails already exists")
        else:
            log.warning("ensure_notification_emails_column: %s", e)


@app.on_event("startup")
def ensure_hours_per_day_column():
    """Add hours_per_day to business_settings if missing (auto-migration on deploy)."""
    from sqlalchemy import text
    try:
        stmt = "ALTER TABLE business_settings ADD COLUMN hours_per_day TEXT"
        with engine.begin() as conn:
            conn.execute(text(stmt))
        log.info("Added column business_settings.hours_per_day")
    except Exception as e:
        if "duplicate" in str(e).lower() or "already exists" in str(e).lower():
            log.debug("Column hours_per_day already exists")
        else:
            log.warning("ensure_hours_per_day_column: %s", e)


# Default services when DB is empty (e.g. after deploy on Render)
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