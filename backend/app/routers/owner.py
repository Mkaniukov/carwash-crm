from fastapi import APIRouter, Depends, HTTPException, Body, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import datetime, time, timedelta
from pydantic import BaseModel, Field
from typing import Optional
import io

from openpyxl import Workbook

from app.db.session import get_db
from app.core.security import require_role, hash_password, verify_password
from app.models.user import User
from app.models.service import Service
from app.models.booking import Booking, BookingSource
from app.models.settings import BusinessSettings
from app.models.work_time import WorkTime
from app.services.email_service import send_cancellation_email

router = APIRouter(prefix="/owner", tags=["owner"])


class CreateWorkerBody(BaseModel):
    username: str
    password: str
    work_start: Optional[str] = None
    work_end: Optional[str] = None
    days_off: Optional[list[str]] = None


class UpdateWorkerBody(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    work_start: Optional[str] = None
    work_end: Optional[str] = None
    days_off: Optional[list[str]] = None


# =====================================================
# DASHBOARD
# =====================================================
@router.get("/dashboard")
def owner_dashboard(current_user: User = Depends(require_role("owner"))):
    return {
        "message": f"Welcome, {current_user.username}",
        "role": current_user.role
    }


# =====================================================
# CHANGE PASSWORD (owner)
# =====================================================
class ChangePasswordBody(BaseModel):
    current_password: str
    new_password: str


@router.patch("/me/password")
def owner_change_password(
    body: ChangePasswordBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner"))
):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is wrong")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    current_user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"message": "Password updated"}


# =====================================================
# USERS (CREATE WORKER)
# =====================================================
@router.post("/users")
def create_worker(
    username: str,
    password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner"))
):
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    worker = User(
        username=username,
        password_hash=hash_password(password),
        role="worker"
    )

    db.add(worker)
    db.commit()

    return {"message": "Worker created", "username": username}


# =====================================================
# WORKERS (REST API for frontend: list, create, update, delete)
# =====================================================
def _worker_to_response(user: User) -> dict:
    """Turn User (worker) into JSON; work_start/work_end/days_off not in DB yet, return defaults."""
    return {
        "id": user.id,
        "username": user.username,
        "work_start": getattr(user, "work_start", None),
        "work_end": getattr(user, "work_end", None),
        "days_off": getattr(user, "days_off", []) or [],
    }


@router.get("/workers")
def list_workers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner")),
):
    workers = db.query(User).filter(User.role == "worker").all()
    return [_worker_to_response(w) for w in workers]


@router.post("/workers")
def create_worker_v2(
    body: CreateWorkerBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner")),
):
    existing = db.query(User).filter(User.username == body.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    worker = User(
        username=body.username,
        password_hash=hash_password(body.password),
        role="worker",
    )
    db.add(worker)
    db.commit()
    db.refresh(worker)
    return _worker_to_response(worker)


@router.put("/workers/{worker_id}")
def update_worker(
    worker_id: int,
    body: UpdateWorkerBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner")),
):
    worker = db.query(User).filter(User.id == worker_id, User.role == "worker").first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    if body.password is not None and body.password != "":
        worker.password_hash = hash_password(body.password)
    db.commit()
    db.refresh(worker)
    return _worker_to_response(worker)


@router.delete("/workers/{worker_id}")
def delete_worker(
    worker_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner")),
):
    worker = db.query(User).filter(User.id == worker_id, User.role == "worker").first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    db.delete(worker)
    db.commit()
    return {"message": "Worker deleted"}


# =====================================================
# SERVICES
# =====================================================
@router.post("/services")
def create_service(
    name: str,
    price: int,
    duration: int,
    description: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner"))
):
    service = Service(
        name=name,
        price=price,
        duration=duration,
        description=description
    )

    db.add(service)
    db.commit()
    db.refresh(service)

    return service


@router.get("/services")
def list_services(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner"))
):
    return db.query(Service).all()


@router.put("/services/{service_id}")
def update_service(
    service_id: int,
    name: Optional[str] = None,
    price: Optional[int] = None,
    duration: Optional[int] = None,
    description: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner"))
):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    if name is not None:
        service.name = name
    if price is not None:
        service.price = price
    if duration is not None:
        service.duration = duration
    if description is not None:
        service.description = description
    db.commit()
    db.refresh(service)
    return service


@router.delete("/services/{service_id}")
def delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner"))
):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    db.delete(service)
    db.commit()
    return {"message": "Service deleted"}


# =====================================================
# BOOKINGS
# =====================================================
@router.get("/bookings")
def owner_bookings(
    from_date: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
    worker_id: Optional[int] = Query(None, alias="worker_id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner")),
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
    if worker_id is not None:
        q = q.filter(Booking.created_by == worker_id)
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


@router.post("/bookings/{booking_id}/cancel")
def owner_cancel_booking(
    booking_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner")),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if str(booking.status) == "cancelled":
        raise HTTPException(status_code=400, detail="Already canceled")
    booking.status = "cancelled"
    db.commit()
    if booking.email and booking.source != BookingSource.worker:
        background_tasks.add_task(send_cancellation_email, booking)
    return {"message": "Booking canceled"}


class RescheduleBody(BaseModel):
    start_time: str


@router.put("/bookings/{booking_id}")
def owner_reschedule_booking(
    booking_id: int,
    body: RescheduleBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner")),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if str(booking.status) == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot reschedule canceled booking")
    start_time = datetime.fromisoformat(body.start_time.replace("Z", "+00:00"))
    if start_time.tzinfo:
        start_time = start_time.replace(tzinfo=None)
    service = db.query(Service).filter(Service.id == booking.service_id).first()
    settings = db.query(BusinessSettings).first()
    end_time = start_time + timedelta(minutes=service.duration)
    weekday = start_time.weekday()
    allowed_days = [int(d) for d in settings.working_days.split(",")]
    if weekday not in allowed_days:
        raise HTTPException(status_code=400, detail="Closed on this day")
    if start_time.time() < settings.work_start or end_time.time() > settings.work_end:
        raise HTTPException(status_code=400, detail="Outside working hours")
    active_statuses = ("booked",)
    overlap = (
        db.query(Booking)
        .filter(
            Booking.id != booking_id,
            Booking.status.in_(active_statuses),
            Booking.start_time < end_time,
            Booking.end_time > start_time,
        )
        .first()
    )
    if overlap:
        raise HTTPException(status_code=400, detail="Time slot already booked")
    booking.start_time = start_time
    booking.end_time = end_time
    db.commit()
    db.refresh(booking)
    return booking


# =====================================================
# SETTINGS
# =====================================================
@router.get("/settings")
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner"))
):
    settings = db.query(BusinessSettings).first()

    if not settings:
        settings = BusinessSettings(
            work_start=time(7, 30),
            work_end=time(18, 0),
            working_days="0,1,2,3,4"
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


@router.patch("/settings")
def update_settings(
    work_start: time,
    work_end: time,
    working_days: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner"))
):
    settings = db.query(BusinessSettings).first()

    if not settings:
        settings = BusinessSettings()

    settings.work_start = work_start
    settings.work_end = work_end
    settings.working_days = working_days or "0,1,2,3,4"

    db.add(settings)
    db.commit()
    db.refresh(settings)

    return settings


# =====================================================
# ANALYTICS
# =====================================================
@router.get("/analytics")
def owner_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner"))
):
    now = datetime.utcnow()
    start_of_day = datetime(now.year, now.month, now.day)
    start_of_month = datetime(now.year, now.month, 1)

    completed_status = "completed"
    revenue_today = db.query(func.sum(Booking.service_price)).filter(
        Booking.status == completed_status,
        Booking.start_time >= start_of_day
    ).scalar() or 0

    revenue_month = db.query(func.sum(Booking.service_price)).filter(
        Booking.status == completed_status,
        Booking.start_time >= start_of_month
    ).scalar() or 0

    completed_count = db.query(func.count(Booking.id)).filter(
        Booking.status == completed_status
    ).scalar() or 0

    total_bookings = db.query(func.count(Booking.id)).scalar() or 0

    canceled_count = db.query(func.count(Booking.id)).filter(
        Booking.status == "cancelled"
    ).scalar() or 0

    cancel_rate = round((canceled_count / total_bookings) * 100, 2) if total_bookings else 0
    avg_ticket = round(revenue_month / completed_count, 2) if completed_count else 0

    revenue_by_source = db.query(
        Booking.source,
        func.sum(Booking.service_price)
    ).filter(
        Booking.status == completed_status
    ).group_by(Booking.source).all()

    source_data = {str(source): revenue or 0 for source, revenue in revenue_by_source}

    revenue_by_worker = db.query(
        User.username,
        func.sum(Booking.service_price)
    ).join(Booking, Booking.created_by == User.id).filter(
        Booking.status == completed_status
    ).group_by(User.username).all()

    worker_data = {username: revenue or 0 for username, revenue in revenue_by_worker}

    popular_service = db.query(
        Service.name,
        func.count(Booking.id)
    ).join(Booking).filter(Booking.status == completed_status).group_by(Service.name).order_by(
        func.count(Booking.id).desc()
    ).first()

    most_popular = popular_service[0] if popular_service else None

    return {
        "revenue_today": revenue_today,
        "revenue_month": revenue_month,
        "average_ticket": avg_ticket,
        "completed_bookings": completed_count,
        "total_bookings": total_bookings,
        "cancel_rate_percent": cancel_rate,
        "revenue_by_source": source_data,
        "revenue_by_worker": worker_data,
        "most_popular_service": most_popular
    }


# =====================================================
# EXPORT
# =====================================================
@router.get("/export")
def export_bookings(
    start_date: datetime,
    end_date: datetime,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner"))
):
    bookings = (
        db.query(Booking)
        .options(joinedload(Booking.service))
        .filter(
            Booking.status == "completed",
            Booking.start_time >= start_date,
            Booking.start_time <= end_date
        )
        .all()
    )

    headers = ["Datum", "Uhrzeit", "Kunde", "Telefon", "Dienstleistung", "Preis (€)", "Quelle"]
    rows = [
        [
            b.start_time.strftime("%d.%m.%Y"),
            b.start_time.strftime("%H:%M"),
            b.client_name,
            b.phone,
            b.service.name if b.service else "",
            b.service_price,
            b.source or "",
        ]
        for b in bookings
    ]

    wb = Workbook()
    ws = wb.active
    ws.title = "Buchungen"
    ws.append(headers)
    for row in rows:
        ws.append(row)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"export_{start_date.date()}_{end_date.date()}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# =====================================================
# CUSTOMERS (Kunden — группировка по email)
# =====================================================
@router.get("/customers")
def owner_customers_list(
    marketing: Optional[bool] = Query(None, description="Nur mit Marketing-Zustimmung"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner")),
):
    """Клиенты, сгруппированные по email: name (последний), phone (последний), total_bookings, marketing_consent, last_booking_date."""
    bookings = (
        db.query(Booking)
        .filter(Booking.email.isnot(None), Booking.email != "")
        .order_by(Booking.start_time.desc())
        .all()
    )

    # Группировка по email (нормализуем нижний регистр для ключа)
    by_email = {}
    for b in bookings:
        key = (b.email or "").strip().lower()
        if not key:
            continue
        if key not in by_email:
            by_email[key] = {
                "name": b.client_name,
                "email": b.email,
                "phone": b.phone or "",
                "total_bookings": 0,
                "marketing_consent": False,
                "last_booking_date": None,
            }
        rec = by_email[key]
        rec["total_bookings"] += 1
        if b.marketing_consent:
            rec["marketing_consent"] = True
        if rec["last_booking_date"] is None and b.start_time:
            rec["last_booking_date"] = b.start_time.strftime("%Y-%m-%d") if b.start_time else None
        # Обновляем name/phone только если эта запись новее (bookings уже по убыванию start_time)
        if b.start_time and (rec.get("_last") is None or b.start_time > rec["_last"]):
            rec["_last"] = b.start_time
            rec["name"] = b.client_name
            rec["phone"] = b.phone or ""

    result = []
    for key, rec in by_email.items():
        rec.pop("_last", None)
        if rec["last_booking_date"] is None:
            group_bookings = [b for b in bookings if (b.email or "").strip().lower() == key]
            if group_bookings:
                last_dt = max(b.start_time for b in group_bookings if b.start_time)
                rec["last_booking_date"] = last_dt.strftime("%Y-%m-%d")
        if marketing is True and not rec["marketing_consent"]:
            continue
        result.append(rec)
    result.sort(key=lambda x: (x["last_booking_date"] or ""), reverse=True)
    return result


@router.get("/customers/export")
def owner_customers_export(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner")),
):
    """CSV только клиентов с marketing_consent=True. Колонки: name, email."""
    import csv
    bookings = (
        db.query(Booking)
        .filter(
            Booking.email.isnot(None),
            Booking.email != "",
            Booking.marketing_consent == True,
        )
        .order_by(Booking.start_time.desc())
        .all()
    )
    # Уникальные по email (последнее имя для этого email)
    by_email = {}
    for b in bookings:
        key = (b.email or "").strip().lower()
        if not key:
            continue
        if key not in by_email:
            by_email[key] = {"name": b.client_name, "email": b.email}
    rows = [{"name": r["name"], "email": r["email"]} for r in by_email.values()]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["name", "email"])
    writer.writeheader()
    writer.writerows(rows)
    body = output.getvalue().encode("utf-8-sig")
    return StreamingResponse(
        io.BytesIO(body),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="marketing_contacts.csv"'},
    )


# =====================================================
# WORK TIME (учёт рабочего времени по сотрудникам)
# =====================================================
class WorkTimeUpdateBody(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    pause_minutes: Optional[int] = Field(None, ge=0, le=480)


def _parse_dt(s: str | None):
    if not s:
        return None
    from datetime import datetime
    dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    return dt.replace(tzinfo=None) if dt.tzinfo else dt


@router.put("/worktime/{time_id}")
def owner_worktime_update(
    time_id: int,
    body: WorkTimeUpdateBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner")),
):
    """Владелец может редактировать любые записи. total_hours пересчитывается на backend."""
    wt = db.query(WorkTime).filter(WorkTime.id == time_id).first()
    if not wt:
        raise HTTPException(status_code=404, detail="Work time record not found")
    start = _parse_dt(body.start_time) if body.start_time else wt.start_time
    if body.end_time is None:
        end = wt.end_time
    elif body.end_time.strip() == "":
        end = None
    else:
        end = _parse_dt(body.end_time)
    pause = body.pause_minutes if body.pause_minutes is not None else wt.pause_minutes
    wt.start_time = start
    wt.end_time = end
    wt.pause_minutes = pause
    if end is not None:
        if end < start:
            raise HTTPException(status_code=400, detail="end_time must be >= start_time")
        delta = (end - start).total_seconds() / 3600 - (pause / 60)
        wt.total_hours = round(max(0, delta), 2)
    else:
        wt.total_hours = None
    db.commit()
    db.refresh(wt)
    return {
        "id": wt.id,
        "worker_id": wt.worker_id,
        "date": wt.date.isoformat(),
        "start_time": wt.start_time.isoformat(),
        "end_time": wt.end_time.isoformat() if wt.end_time else None,
        "pause_minutes": wt.pause_minutes,
        "total_hours": float(wt.total_hours) if wt.total_hours is not None else None,
    }


@router.get("/worktime")
def owner_worktime_list(
    worker_id: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("owner")),
):
    from sqlalchemy import extract
    from datetime import date

    q = db.query(WorkTime).options(joinedload(WorkTime.worker)).order_by(WorkTime.date.desc(), WorkTime.start_time.desc())
    if worker_id is not None:
        q = q.filter(WorkTime.worker_id == worker_id)
    if year is not None:
        q = q.filter(extract("year", WorkTime.date) == year)
    if month is not None:
        q = q.filter(extract("month", WorkTime.date) == month)
    rows = q.limit(500).all()
    return [
        {
            "id": r.id,
            "worker_id": r.worker_id,
            "worker_username": r.worker.username if r.worker else None,
            "date": r.date.isoformat(),
            "start_time": r.start_time.isoformat() if r.start_time else None,
            "end_time": r.end_time.isoformat() if r.end_time else None,
            "pause_minutes": r.pause_minutes,
            "total_hours": float(r.total_hours) if r.total_hours is not None else None,
        }
        for r in rows
    ]