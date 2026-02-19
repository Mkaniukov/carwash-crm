"""Фоновая обработка после закрытия заказа с формуляром: PDF, Google Drive/Sheet."""
import logging
from app.db.session import SessionLocal

log = logging.getLogger(__name__)


def on_booking_completed_with_form(booking_id: int) -> None:
    """Вызывается в background после сохранения CheckInForm и completed.
    Генерирует PDF, при наличии конфига — загрузка в Drive и строка в Sheet.
    """
    db = SessionLocal()
    try:
        from app.models.booking import Booking
        from app.models.checkin_form import CheckInForm
        from sqlalchemy.orm import joinedload

        booking = (
            db.query(Booking)
            .options(joinedload(Booking.service), joinedload(Booking.creator))
            .filter(Booking.id == booking_id)
            .first()
        )
        if not booking:
            return
        form = db.query(CheckInForm).filter(CheckInForm.booking_id == booking_id).first()
        if not form:
            return

        pdf_bytes = None
        try:
            from app.services.pdf_service import generate_checkin_pdf
            pdf_bytes = generate_checkin_pdf(db, booking, form)
        except Exception as e:
            log.exception("PDF generation failed: %s", e)

        if pdf_bytes:
            try:
                from app.services.google_integration import GoogleIntegrationService
                svc = GoogleIntegrationService()
                drive_link = svc.upload_pdf_to_drive(pdf_bytes, booking.start_time)
                svc.append_row_to_sheet(
                    date=booking.start_time,
                    worker_name=booking.creator.username if booking.creator else "—",
                    car_plate=form.car_plate,
                    service_name=booking.service.name if booking.service else "—",
                    price=booking.service_price,
                    payment_method=form.payment_method,
                    drive_link=drive_link or "",
                )
            except Exception as e:
                log.exception("Google integration failed: %s", e)
    finally:
        db.close()
