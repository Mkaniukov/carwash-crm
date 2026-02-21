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

    # Compute end time
    end_time = start_time + timedelta(minutes=service.duration)

    # Strip tzinfo from end_time if present
    if end_time.tzinfo is not None:
        end_time = end_time.replace(tzinfo=None)

    # Check weekday
    weekday = start_time.weekday()
    allowed_days = [int(d) for d in settings.working_days.split(",")]

    if weekday not in allowed_days:
        raise HTTPException(status_code=400, detail="Closed on this day")

    # Check working hours
    if start_time.time() < settings.work_start or end_time.time() > settings.work_end:
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