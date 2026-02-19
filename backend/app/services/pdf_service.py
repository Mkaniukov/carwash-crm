"""Генерация PDF формуляра приёмки."""
import io
import logging
from datetime import datetime

log = logging.getLogger(__name__)


def generate_checkin_pdf(db, booking, form, payment_method: str | None = None, price: float | None = None) -> bytes | None:
    """Генерирует PDF с данными клиента, услуги, авто, оплаты, подписи, даты.
    payment_method и price приходят из Payment после оплаты; иначе — из form/booking (legacy).
    Возвращает bytes или None при ошибке.
    """
    pay_method = payment_method or (form.payment_method if hasattr(form, "payment_method") else "") or "—"
    doc_price = price if price is not None else (float(form.final_price) if getattr(form, "final_price", None) is not None else booking.service_price)
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import mm
    except ImportError:
        log.warning("reportlab not installed, PDF generation skipped")
        return None

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4

    y = height - 40
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, y, "Abnahmeformular / Check-in")
    y -= 25

    c.setFont("Helvetica", 10)
    c.drawString(40, y, f"Datum: {booking.start_time.strftime('%d.%m.%Y')}  Uhrzeit: {booking.start_time.strftime('%H:%M')}")
    y -= 18
    c.drawString(40, y, f"Kunde: {booking.client_name}")
    y -= 14
    c.drawString(40, y, f"Telefon: {booking.phone}")
    y -= 14
    if booking.email:
        c.drawString(40, y, f"E-Mail: {booking.email}")
        y -= 14
    c.drawString(40, y, f"Service: {booking.service.name if booking.service else '-'}  |  Preis: €{doc_price}")
    y -= 18
    c.drawString(40, y, f"Kennzeichen: {form.car_plate}  |  Zahlung: {pay_method}")
    y -= 18
    if form.visible_damage_notes:
        c.drawString(40, y, f"Sichtbare Schaden: {form.visible_damage_notes[:200]}")
        y -= 14
    if form.no_visible_damage:
        c.drawString(40, y, "Keine sichtbaren Schaden")
        y -= 14
    if form.internal_notes:
        c.drawString(40, y, f"Interne Notizen: {form.internal_notes[:200]}")
        y -= 14
    y -= 10
    c.drawString(40, y, f"Erstellt am: {form.completed_at.strftime('%d.%m.%Y %H:%M')}")

    c.save()
    buf.seek(0)
    return buf.read()
