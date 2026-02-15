from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional

from app.db.session import get_db
from app.core.security import require_role
from app.models.user import User
from app.models.booking import Booking, BookingSource
from app.models.service import Service
from app.models.settings import BusinessSettings
from app.services.booking_service import create_booking_logic
from app.services.email_service import send_cancellation_email


router = APIRouter(prefix="/worker", tags=["worker"])


class CreateBookingBody(BaseModel):
    client_name: str
    phone: str
    service_id: int
    start_time: str  # ISO format from frontend, e.g. "2025-02-15T10:00:00"


# =====================================================
# CREATE BOOKING
# =====================================================
@router.post("/bookings")
def create_booking(
    body: CreateBookingBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker")),
):
    start_time = datetime.fromisoformat(body.start_time.replace("Z", "+00:00"))
    if start_time.tzinfo:
        start_time = start_time.replace(tzinfo=None)
    booking = create_booking_logic(
        db=db,
        client_name=body.client_name,
        phone=body.phone,
        email=None,
        service_id=body.service_id,
        start_time=start_time,
        source="worker",
        created_by=current_user.id,
    )
    return booking


# =====================================================
# LIST BOOKINGS (все записи — общий календарь с owner)
# =====================================================
@router.get("/bookings")
def list_bookings(
    from_date: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker")),
):
    q = db.query(Booking)
    if from_date:
        try:
            start = datetime.strptime(from_date, "%Y-%m-%d")
            q = q.filter(Booking.start_time >= start)
        except ValueError:
            pass
    if to:
        try:
            end = datetime.strptime(to, "%Y-%m-%d") + timedelta(days=1)
            q = q.filter(Booking.start_time < end)
        except ValueError:
            pass
    bookings = q.options(joinedload(Booking.service)).order_by(Booking.start_time).all()
    return [
        {
            "id": b.id,
            "client_name": b.client_name,
            "phone": b.phone,
            "email": b.email,
            "service_id": b.service_id,
            "service_price": b.service_price,
            "service_name": b.service.name if b.service else None,
            "start_time": b.start_time,
            "end_time": b.end_time,
            "status": b.status,
            "source": b.source,
            "created_by": b.created_by,
        }
        for b in bookings
    ]


# =====================================================
# CANCEL BOOKING (worker может отменить любую; email только если запись не от worker)
# =====================================================
def _do_cancel_booking(booking_id: int, db: Session, background_tasks: BackgroundTasks):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if str(booking.status) in ("canceled_by_staff", "canceled_by_client"):
        raise HTTPException(status_code=400, detail="Already canceled")
    booking.status = "canceled_by_staff"
    db.commit()
    if booking.email and booking.source != BookingSource.worker:
        background_tasks.add_task(send_cancellation_email, booking)
    return {"message": "Booking canceled"}


@router.patch("/bookings/{booking_id}/cancel")
def cancel_booking_patch(
    booking_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker")),
):
    return _do_cancel_booking(booking_id, db, background_tasks)


@router.post("/bookings/{booking_id}/cancel")
def cancel_booking_post(
    booking_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker")),
):
    return _do_cancel_booking(booking_id, db, background_tasks)


# =====================================================
# UPDATE STATUS (worker может менять любую запись)
# =====================================================
@router.patch("/bookings/{booking_id}/status")
def update_status(
    booking_id: int,
    new_status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker")),
):
    allowed_statuses = [
        "confirmed",
        "completed",
        "canceled_by_staff",
        "canceled_by_client",
        "no_show",
    ]
    if new_status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if str(booking.status) in ("canceled_by_staff", "canceled_by_client"):
        raise HTTPException(status_code=400, detail="Cannot modify canceled booking")
    booking.status = new_status
    db.commit()
    return {"message": "Status updated"}


@router.post("/bookings/{booking_id}/complete")
def complete_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker")),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if str(booking.status) in ("canceled_by_staff", "canceled_by_client"):
        raise HTTPException(status_code=400, detail="Cannot complete canceled booking")
    booking.status = "completed"
    db.commit()
    return {"message": "Booking completed"}


# =====================================================
# RESCHEDULE BOOKING (worker может переносить любую запись)
# =====================================================
@router.patch("/bookings/{booking_id}/reschedule")
def reschedule_booking(
    booking_id: int,
    new_start_time: datetime,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker")),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status in ["canceled_by_staff", "canceled_by_client"]:
        raise HTTPException(status_code=400, detail="Cannot modify canceled booking")

    service = db.query(Service).filter(Service.id == booking.service_id).first()
    settings = db.query(BusinessSettings).first()

    new_end_time = new_start_time + timedelta(minutes=service.duration)

    # --- Проверка дня недели ---
    weekday = new_start_time.weekday()
    allowed_days = [int(d) for d in settings.working_days.split(",")]

    if weekday not in allowed_days:
        raise HTTPException(status_code=400, detail="Closed on this day")

    # --- Проверка рабочего времени ---
    if new_start_time.time() < settings.work_start or new_end_time.time() > settings.work_end:
        raise HTTPException(status_code=400, detail="Outside working hours")

    # --- Проверка пересечения ---
    overlap = db.query(Booking).filter(
        Booking.id != booking_id,
        Booking.status == "confirmed",
        Booking.start_time < new_end_time,
        Booking.end_time > new_start_time
    ).first()

    if overlap:
        raise HTTPException(status_code=400, detail="Time slot already booked")

    booking.start_time = new_start_time
    booking.end_time = new_end_time
    db.commit()

    return {"message": "Booking rescheduled"}


# =====================================================
# FILTER BOOKINGS BY DATE
# =====================================================
@router.get("/bookings/by-date")
def bookings_by_date(
    date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker"))
):
    from datetime import datetime, timedelta

    selected_date = datetime.strptime(date, "%Y-%m-%d")

    start_of_day = datetime(selected_date.year, selected_date.month, selected_date.day)
    end_of_day = start_of_day + timedelta(days=1)

    bookings = db.query(Booking).filter(
        Booking.created_by == current_user.id,
        Booking.start_time >= start_of_day,
        Booking.start_time < end_of_day
    ).order_by(Booking.start_time).all()

    return [
        {
            "start_time": b.start_time.strftime("%Y-%m-%dT%H:%M:%S"),
            "end_time": b.end_time.strftime("%Y-%m-%dT%H:%M:%S")
        }
        for b in bookings
    ]