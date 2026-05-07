from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from fastapi import HTTPException
import secrets

from app.models.booking import Booking
from app.models.service import Service
from app.models.settings import BusinessSettings
from app.models.blocked_date import BlockedDate
from app.core.schedule import get_work_hours_for_weekday


def raise_if_day_blocked(db: Session, start_time: datetime):
    if db.query(BlockedDate).filter(BlockedDate.block_date == start_time.date()).first():
        raise HTTPException(status_code=400, detail="This date is closed")


def create_booking_logic(
    db: Session,
    client_name: str,
    phone: str,
    email: str | None,
    service_id: int,
    start_time: datetime,
    source: str,
    created_by: int | None = None,
    marketing_consent: bool = False,
):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    settings = db.query(BusinessSettings).first()
    if not settings:
        raise HTTPException(status_code=500, detail="Business settings not configured")

    # Strip timezone (FastAPI may pass UTC-aware)
    if start_time.tzinfo is not None:
        start_time = start_time.replace(tzinfo=None)

    if start_time < datetime.utcnow() - timedelta(minutes=2):
        raise HTTPException(status_code=400, detail="Start time must be in the future")

    raise_if_day_blocked(db, start_time)

    # Compute end time
    end_time = start_time + timedelta(minutes=service.duration)

    # Strip tzinfo from end_time if present
    if end_time.tzinfo is not None:
        end_time = end_time.replace(tzinfo=None)

    # Check weekday and working hours (per-day or global)
    weekday = start_time.weekday()
    day_hours = get_work_hours_for_weekday(settings, weekday)
    if not day_hours:
        raise HTTPException(status_code=400, detail="Closed on this day")
    work_start, work_end = day_hours
    if start_time.time() < work_start or end_time.time() > work_end:
        raise HTTPException(status_code=400, detail="Outside working hours")

    # Check overlap (slot blocked when status is booked)
    active_statuses = ("booked",)
    overlap = db.query(Booking).filter(
        Booking.status.in_(active_statuses),
        Booking.start_time < end_time,
        Booking.end_time > start_time
    ).first()

    if overlap:
        raise HTTPException(status_code=400, detail="Time slot already booked")

    cancel_token = secrets.token_urlsafe(32)

    now = datetime.utcnow()
    booking = Booking(
        client_name=client_name,
        phone=phone,
        email=email,
        service_id=service_id,
        service_price=service.price,
        start_time=start_time,
        end_time=end_time,
        status="booked",
        created_by=created_by,
        source=source,
        cancel_token=cancel_token,
        marketing_consent=bool(marketing_consent),
        marketing_consent_at=now if marketing_consent else None,
    )

    db.add(booking)
    db.commit()
    db.refresh(booking)

    return booking