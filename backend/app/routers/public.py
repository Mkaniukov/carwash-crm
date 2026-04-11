from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.models.settings import BusinessSettings
from app.db.session import get_db
from app.models.service import Service
from app.models.booking import Booking
from app.services.booking_service import create_booking_logic
from app.services.email_service import (
    send_booking_confirmation,
    send_cancellation_email,
    send_booking_notifications_to_owner_list,
    send_cancellation_notifications_to_owner_list,
)
from app.core.rate_limit import check_booking_rate_limit

router = APIRouter(prefix="/public", tags=["public"])


# =====================================================
# REQUEST MODEL (JSON BODY)
# =====================================================
class PublicBookingRequest(BaseModel):
    client_name: str
    phone: str
    email: str
    service_id: int
    start_time: datetime
    marketing_consent: bool = False


# =====================================================
# GET SERVICES
# =====================================================
@router.get("/services")
def list_public_services(db: Session = Depends(get_db)):
    services = db.query(Service).all()

    return [
        {
            "id": s.id,
            "name": s.name,
            "price": s.price,
            "duration": s.duration,
            "description": s.description or "",
        }
        for s in services
    ]


# =====================================================
# CREATE BOOKING (JSON)
# =====================================================
@router.post("/bookings")
def create_public_booking(
    request: Request,
    data: PublicBookingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    check_booking_rate_limit(request)
    booking = create_booking_logic(
        db=db,
        client_name=data.client_name,
        phone=data.phone,
        email=data.email,
        service_id=data.service_id,
        start_time=data.start_time,
        source="website",
        created_by=None,
        marketing_consent=data.marketing_consent,
    )

    # 📩 Email async
    background_tasks.add_task(send_booking_confirmation, booking)
    background_tasks.add_task(send_booking_notifications_to_owner_list, booking.id)

    return {
        "message": "Booking created",
        "id": booking.id
    }


# =====================================================
# CANCEL BY TOKEN (POST only — GET was unsafe: email scanners triggered instant cancel)
# =====================================================
@router.get("/cancel-preview/{token}")
def cancel_preview(token: str, db: Session = Depends(get_db)):
    """Return booking summary for confirmation page. Does not cancel."""
    from sqlalchemy.orm import joinedload

    booking = (
        db.query(Booking)
        .options(joinedload(Booking.service))
        .filter(Booking.cancel_token == token)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Invalid link")
    if str(booking.status) == "cancelled":
        raise HTTPException(status_code=400, detail="Already cancelled")

    return {
        "service_name": booking.service.name if booking.service else None,
        "start_time": booking.start_time.isoformat() if booking.start_time else None,
        "client_name": booking.client_name,
    }


@router.post("/cancel/{token}")
def cancel_by_token(
    token: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.cancel_token == token).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Invalid link")
    if str(booking.status) == "cancelled":
        raise HTTPException(status_code=400, detail="Already cancelled")

    booking.status = "cancelled"
    db.commit()

    background_tasks.add_task(send_cancellation_email, booking)
    background_tasks.add_task(send_cancellation_notifications_to_owner_list, booking.id)

    return {"message": "Booking canceled"}

# =====================================================
# PUBLIC BOOKINGS BY DATE (for calendar)
# =====================================================
@router.get("/bookings/by-date")
def public_bookings_by_date(
    date: str,
    db: Session = Depends(get_db)
):
    from datetime import datetime, timedelta

    # Safely take date part only
    try:
        date_only = date.split("T")[0]
        selected_date = datetime.strptime(date_only, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    start_of_day = datetime(
        selected_date.year,
        selected_date.month,
        selected_date.day
    )

    end_of_day = start_of_day + timedelta(days=1)

    bookings = db.query(Booking).filter(
        Booking.status == "booked",
        Booking.start_time >= start_of_day,
        Booking.start_time < end_of_day
    ).all()

    return [
        {
            "start_time": b.start_time.strftime("%Y-%m-%dT%H:%M:%S"),
            "end_time": b.end_time.strftime("%Y-%m-%dT%H:%M:%S")
        }
        for b in bookings
    ]

# =====================================================
# PUBLIC SETTINGS (for calendar)
# =====================================================
@router.get("/settings")
def get_public_settings(db: Session = Depends(get_db)):
    import json
    settings = db.query(BusinessSettings).first()

    if not settings:
        return {
            "work_start": "07:30:00",
            "work_end": "18:00:00",
            "working_days": "0,1,2,3,4",
            "hours_per_day": {},
        }

    out = {
        "work_start": settings.work_start.strftime("%H:%M:%S"),
        "work_end": settings.work_end.strftime("%H:%M:%S"),
        "working_days": settings.working_days,
    }
    raw = getattr(settings, "hours_per_day", None)
    try:
        out["hours_per_day"] = json.loads(raw) if isinstance(raw, str) and raw else {}
    except Exception:
        out["hours_per_day"] = {}
    return out