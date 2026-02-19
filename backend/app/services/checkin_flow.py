"""Фоновая обработка после оплаты заказа: PDF, Google Drive/Sheet. Вызывается только после оплаты."""
import logging
from app.db.session import SessionLocal

log = logging.getLogger(__name__)


def on_booking_paid(booking_id: int) -> None:
    """Вызывается в background после создания Payment и status=paid.
    Генерирует PDF, при наличии конфига — загрузка в Drive и строка в Sheet.
    payment_method берётся из Payment.
    """
    db = SessionLocal()
    try:
        from app.models.booking import Booking
        from app.models.checkin_form import CheckInForm
        from app.models.payment import Payment
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
        payment = db.query(Payment).filter(Payment.booking_id == booking_id).order_by(Payment.paid_at.desc()).first()
        if not payment:
            return
        payment_method = payment.payment_method
        price_for_doc = float(form.final_price) if form.final_price is not None else float(booking.service_price)

        pdf_bytes = None
        try:
            from app.services.pdf_service import generate_checkin_pdf
            pdf_bytes = generate_checkin_pdf(db, booking, form, payment_method=payment_method, price=price_for_doc)
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
                    price=price_for_doc,
                    payment_method=payment_method,
                    drive_link=drive_link or "",
                )
            except Exception as e:
                log.exception("Google integration failed: %s", e)
    finally:
        db.close()
