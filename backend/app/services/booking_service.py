from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from fastapi import HTTPException
import secrets

from app.models.booking import Booking
from app.models.service import Service
from app.models.settings import BusinessSettings


def create_booking_logic(
    db: Session,
    client_name: str,
    phone: str,
    email: str | None,
    service_id: int,
    start_time: datetime,
    source: str,
    created_by: int | None = None
):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    settings = db.query(BusinessSettings).first()
    if not settings:
        raise HTTPException(status_code=500, detail="Business settings not configured")

    # 🔥 ВАЖНО: убираем timezone (FastAPI делает UTC aware)
    if start_time.tzinfo is not None:
        start_time = start_time.replace(tzinfo=None)

    # рассчитываем окончание
    end_time = start_time + timedelta(minutes=service.duration)

    # 🔥 тоже убираем tzinfo если вдруг есть
    if end_time.tzinfo is not None:
        end_time = end_time.replace(tzinfo=None)

    # --- Проверка дня недели ---
    weekday = start_time.weekday()
    allowed_days = [int(d) for d in settings.working_days.split(",")]

    if weekday not in allowed_days:
        raise HTTPException(status_code=400, detail="Closed on this day")

    # --- Проверка рабочего времени ---
    if start_time.time() < settings.work_start or end_time.time() > settings.work_end:
        raise HTTPException(status_code=400, detail="Outside working hours")

    # --- Проверка пересечения ---
    overlap = db.query(Booking).filter(
        Booking.status == "confirmed",
        Booking.start_time < end_time,
        Booking.end_time > start_time
    ).first()

    if overlap:
        raise HTTPException(status_code=400, detail="Time slot already booked")

    cancel_token = secrets.token_urlsafe(32)

    booking = Booking(
        client_name=client_name,
        phone=phone,
        email=email,
        service_id=service_id,
        service_price=service.price,
        start_time=start_time,
        end_time=end_time,
        status="confirmed",
        created_by=created_by,
        source=source,
        cancel_token=cancel_token
    )

    db.add(booking)
    db.commit()
    db.refresh(booking)

    return booking