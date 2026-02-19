from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta, date
from pydantic import BaseModel, Field
from typing import Optional

from app.db.session import get_db
from app.core.security import require_role
from app.models.user import User
from app.models.booking import Booking, BookingSource
from app.models.service import Service
from app.models.settings import BusinessSettings
from app.models.checkin_form import CheckInForm
from app.models.work_time import WorkTime
from app.schemas.checkin import CompleteBookingFormBody, PaymentCreateBody
from app.models.payment import Payment
from decimal import Decimal
from app.services.booking_service import create_booking_logic
from app.services.email_service import send_cancellation_email


router = APIRouter(prefix="/worker", tags=["worker"])


class CreateBookingBody(BaseModel):
    client_name: str
    phone: str
    service_id: int
    start_time: str  # ISO format from frontend, e.g. "2025-02-15T10:00:00"


class WorkTimeUpdateBody(BaseModel):
    start_time: Optional[str] = None  # ISO
    end_time: Optional[str] = None    # ISO or null to clear
    pause_minutes: Optional[int] = Field(None, ge=0, le=480)


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
            "final_price": None,
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
# GET ONE BOOKING (для формы приёмки)
# =====================================================
@router.get("/bookings/{booking_id}")
def get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker")),
):
    booking = (
        db.query(Booking)
        .options(joinedload(Booking.service))
        .filter(Booking.id == booking_id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if str(booking.status) in ("canceled_by_staff", "canceled_by_client"):
        raise HTTPException(status_code=400, detail="Booking is canceled")
    if str(booking.status) in ("completed", "paid", "checked_in"):
        raise HTTPException(status_code=400, detail="Booking already completed or in progress")
    return {
        "id": booking.id,
        "client_name": booking.client_name,
        "phone": booking.phone,
        "email": booking.email,
        "service_id": booking.service_id,
        "service_price": booking.service_price,
        "service_name": booking.service.name if booking.service else None,
        "service_duration": booking.service.duration if booking.service else None,
        "start_time": booking.start_time,
        "end_time": booking.end_time,
        "status": booking.status,
    }


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
        "booked", "checked_in", "paid",
        "confirmed", "completed",  # legacy
        "canceled_by_staff", "canceled_by_client", "no_show",
    ]
    if new_status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if str(booking.status) in ("canceled_by_staff", "canceled_by_client"):
        raise HTTPException(status_code=400, detail="Cannot modify canceled booking")
    # Нельзя переводить напрямую booked → paid
    if str(booking.status) in ("booked", "confirmed") and new_status in ("paid", "completed"):
        raise HTTPException(status_code=400, detail="Cannot set paid without check-in form")
    booking.status = new_status
    db.commit()
    return {"message": "Status updated"}


def _compute_final_price(db: Session, service_id: int, car_size: str, extra_glanz: bool, regie_price: Optional[float]) -> Decimal:
    """Цена только на backend: base + large + extra_glanz + regie."""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    base = Decimal(str(service.price))
    if car_size == "large":
        base += Decimal("24")
    if extra_glanz:
        base += Decimal("9")
    if regie_price is not None and regie_price > 0:
        base += Decimal(str(regie_price))
    return base


@router.post("/bookings/{booking_id}/complete")
def complete_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker")),
    body: CompleteBookingFormBody = Body(...),
):
    """Подписание формуляра: создаётся CheckInForm, status=checked_in. Оплата не здесь."""
    booking = (
        db.query(Booking)
        .options(joinedload(Booking.service))
        .filter(Booking.id == booking_id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if str(booking.status) in ("canceled_by_staff", "canceled_by_client"):
        raise HTTPException(status_code=400, detail="Cannot complete canceled booking")
    if str(booking.status) in ("completed", "paid", "checked_in"):
        raise HTTPException(status_code=400, detail="Booking already completed or checked in")

    if db.query(CheckInForm).filter(CheckInForm.booking_id == booking_id).first():
        raise HTTPException(status_code=400, detail="Check-in form already exists for this booking")

    final_price = _compute_final_price(
        db, body.service_id, body.car_size.value, body.extra_glanz, body.regie_price
    )
    now = datetime.utcnow()
    import json
    form = CheckInForm(
        booking_id=booking_id,
        service_id=body.service_id,
        car_size=body.car_size.value,
        extra_glanz=body.extra_glanz,
        regie_price=Decimal(str(body.regie_price)) if body.regie_price is not None else None,
        final_price=final_price,
        car_plate=body.car_plate.strip(),
        payment_method="",  # оплата указывается при создании Payment (legacy DB может требовать NOT NULL)
        visible_damage_notes=body.visible_damage_notes or None,
        no_visible_damage=body.no_visible_damage,
        internal_notes=body.internal_notes or None,
        signature_image=body.signature_image,
        photos=json.dumps(body.photos) if body.photos else None,
        completed_at=now,
        completed_by=current_user.id,
    )
    db.add(form)
    if body.client_name:
        booking.client_name = body.client_name
    if body.phone:
        booking.phone = body.phone
    if body.email is not None:
        booking.email = body.email

    booking.status = "checked_in"
    db.commit()

    return {"message": "Check-in form saved", "status": "checked_in"}


@router.post("/bookings/{booking_id}/pay")
def pay_booking(
    booking_id: int,
    body: PaymentCreateBody,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker")),
):
    """Оплата: создаётся Payment, status=paid, затем PDF и Google (только после оплаты)."""
    booking = (
        db.query(Booking)
        .options(joinedload(Booking.service))
        .filter(Booking.id == booking_id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if str(booking.status) in ("canceled_by_staff", "canceled_by_client"):
        raise HTTPException(status_code=400, detail="Cannot pay canceled booking")
    if str(booking.status) in ("completed", "paid"):
        raise HTTPException(status_code=400, detail="Booking already paid")

    form = db.query(CheckInForm).filter(CheckInForm.booking_id == booking_id).first()
    if not form:
        raise HTTPException(
            status_code=400,
            detail="Zuerst Formular ausfüllen („Formular ausfüllen“), dann bezahlen.",
        )

    # Разрешаем оплату при статусе checked_in, confirmed или booked (если формуляр уже есть)
    if str(booking.status) not in ("checked_in", "confirmed", "booked"):
        raise HTTPException(
            status_code=400,
            detail="Nur Termine mit ausgefülltem Formular können bezahlt werden.",
        )

    payment = Payment(
        booking_id=booking_id,
        amount=Decimal(str(body.amount)),
        payment_method=body.payment_method.value,
        paid_by=current_user.id,
    )
    db.add(payment)
    booking.status = "paid"
    db.commit()

    try:
        from app.services.checkin_flow import on_booking_paid
        background_tasks.add_task(on_booking_paid, booking_id)
    except Exception:
        pass

    return {"message": "Payment recorded", "status": "paid"}


# =====================================================
# ABRECHNUNG (PDF формуляр за период — оплаченные записи)
# =====================================================
@router.get("/abrechnung/pdf")
def get_abrechnung_pdf(
    from_date: str = Query(..., description="YYYY-MM-DD"),
    to_date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker")),
):
    """Возвращает PDF «ABRECHNUNG FÜR DIE AUTOPFLEGE» по оплаченным бронированиям за период."""
    try:
        start = datetime.strptime(from_date, "%Y-%m-%d")
        end = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format (use YYYY-MM-DD)")

    if start > end:
        raise HTTPException(status_code=400, detail="from_date must be <= to_date")

    # Оплаченные брони за период: booking + form + последний payment
    bookings = (
        db.query(Booking)
        .options(
            joinedload(Booking.service),
            joinedload(Booking.creator),
            joinedload(Booking.checkin_form),
            joinedload(Booking.payments),
        )
        .filter(
            Booking.status.in_(("paid", "completed")),
            Booking.start_time >= start,
            Booking.start_time < end,
        )
        .order_by(Booking.start_time)
        .all()
    )

    rows = []
    for idx, b in enumerate(bookings, start=1):
        form = b.checkin_form
        payments = list(b.payments) if b.payments else []
        last_payment = payments[-1] if payments else None
        service_name = None
        if form and getattr(form, "service_id", None):
            svc = db.query(Service).filter(Service.id == form.service_id).first()
            service_name = svc.name if svc else (b.service.name if b.service else "—")
        else:
            service_name = b.service.name if b.service else "—"
        kennzeichen = form.car_plate if form else "—"
        worker_name = b.creator.username if b.creator else "—"
        bar_amount = None
        card_amount = None
        if last_payment:
            amt = float(last_payment.amount)
            if last_payment.payment_method == "cash":
                bar_amount = amt
            else:
                card_amount = amt
        rows.append({
            "nr": idx,
            "service_name": service_name,
            "kennzeichen": kennzeichen,
            "worker_name": worker_name,
            "bar_amount": bar_amount,
            "card_amount": card_amount,
        })

    import os
    business_name = os.getenv("ABRECHNUNG_FIRMA", "Garage ALTE POST in 1010 Wien")
    business_address = os.getenv("ABRECHNUNG_ADDRESS", "")

    from app.services.pdf_service import generate_abrechnung_pdf
    pdf_bytes = generate_abrechnung_pdf(
        rows, start, end - timedelta(days=1),
        invoice_number=start.strftime("%Y%m%d") + "-" + str(len(rows)),
        business_name=business_name,
        business_address=business_address,
    )
    if not pdf_bytes:
        raise HTTPException(status_code=500, detail="PDF generation failed")

    from io import BytesIO
    filename = f"Abrechnung_{from_date}_{to_date}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


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
    active_statuses = ("booked", "checked_in", "confirmed")
    overlap = db.query(Booking).filter(
        Booking.id != booking_id,
        Booking.status.in_(active_statuses),
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


# =====================================================
# WORK TIME (Arbeitsbeginn / Arbeitsende)
# =====================================================
@router.post("/time/start")
def work_time_start(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker")),
):
    today = date.today()
    existing = (
        db.query(WorkTime)
        .filter(WorkTime.worker_id == current_user.id, WorkTime.date == today, WorkTime.end_time.is_(None))
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Shift already started today")
    wt = WorkTime(worker_id=current_user.id, start_time=datetime.utcnow(), date=today)
    db.add(wt)
    db.commit()
    db.refresh(wt)
    return {"message": "Arbeitsbeginn", "id": wt.id, "start_time": wt.start_time}


@router.post("/time/end")
def work_time_end(
    pause_minutes: Optional[int] = Query(0, ge=0, le=480),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker")),
):
    today = date.today()
    wt = (
        db.query(WorkTime)
        .filter(WorkTime.worker_id == current_user.id, WorkTime.date == today, WorkTime.end_time.is_(None))
        .first()
    )
    if not wt:
        raise HTTPException(status_code=400, detail="No active shift found for today")
    end = datetime.utcnow()
    wt.end_time = end
    wt.pause_minutes = pause_minutes or 0
    delta = (end - wt.start_time).total_seconds() / 3600 - (wt.pause_minutes / 60)
    wt.total_hours = round(max(0, delta), 2)
    db.commit()
    return {"message": "Arbeitsende", "total_hours": float(wt.total_hours)}


def _parse_dt(s: str | None):
    if not s:
        return None
    dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    return dt.replace(tzinfo=None) if dt.tzinfo else dt


def _recalc_total_hours(start: datetime, end: datetime | None, pause_minutes: int) -> float | None:
    if end is None:
        return None
    if end < start:
        raise HTTPException(status_code=400, detail="end_time must be >= start_time")
    delta = (end - start).total_seconds() / 3600 - (pause_minutes / 60)
    return round(max(0, delta), 2)


@router.put("/time/{time_id}")
def work_time_update(
    time_id: int,
    body: WorkTimeUpdateBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker")),
):
    """Сотрудник может редактировать только свои записи. total_hours пересчитывается на backend."""
    wt = db.query(WorkTime).filter(WorkTime.id == time_id).first()
    if not wt:
        raise HTTPException(status_code=404, detail="Work time record not found")
    if wt.worker_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only edit own work time")
    start = _parse_dt(body.start_time) if body.start_time else wt.start_time
    if body.end_time is None:
        end = wt.end_time
    elif isinstance(body.end_time, str) and body.end_time.strip() == "":
        end = None
    else:
        end = _parse_dt(body.end_time) if body.end_time else None
    pause = body.pause_minutes if body.pause_minutes is not None else wt.pause_minutes
    wt.start_time = start
    wt.end_time = end
    wt.pause_minutes = pause
    th = _recalc_total_hours(start, end, pause)
    wt.total_hours = th
    db.commit()
    db.refresh(wt)
    return {
        "id": wt.id,
        "date": wt.date.isoformat(),
        "start_time": wt.start_time.isoformat(),
        "end_time": wt.end_time.isoformat() if wt.end_time else None,
        "pause_minutes": wt.pause_minutes,
        "total_hours": float(wt.total_hours) if wt.total_hours is not None else None,
    }


@router.get("/time")
def work_time_list(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("worker")),
):
    q = db.query(WorkTime).filter(WorkTime.worker_id == current_user.id)
    if year is not None:
        from sqlalchemy import extract
        q = q.filter(extract("year", WorkTime.date) == year)
    if month is not None:
        from sqlalchemy import extract
        q = q.filter(extract("month", WorkTime.date) == month)
    rows = q.order_by(WorkTime.date.desc(), WorkTime.start_time.desc()).all()
    return [
        {
            "id": r.id,
            "date": r.date.isoformat(),
            "start_time": r.start_time.isoformat() if r.start_time else None,
            "end_time": r.end_time.isoformat() if r.end_time else None,
            "pause_minutes": r.pause_minutes,
            "total_hours": float(r.total_hours) if r.total_hours is not None else None,
        }
        for r in rows
    ]