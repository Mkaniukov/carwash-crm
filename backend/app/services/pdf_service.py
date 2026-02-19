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


def generate_abrechnung_pdf(rows, from_date, to_date, invoice_number=None, business_name=None, business_address=None) -> bytes | None:
    """Генерирует PDF «ABRECHNUNG FÜR DIE AUTOPFLEGE»: таблица (Nr, Reinigung, Kennzeichen, Arbeiter, BAR, Karte), итоги, подписи."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import mm
    except ImportError:
        log.warning("reportlab not installed, PDF generation skipped")
        return None

    business_name = business_name or "Garage ALTE POST in 1010 Wien"
    business_address = business_address or ""
    invoice_number = invoice_number or from_date.strftime("%Y%m%d")

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4
    margin = 40
    y = height - margin
    row_h = 20
    col_w = (width - 2 * margin) / 6  # 6 columns

    c.setFont("Helvetica-Bold", 14)
    c.drawString(margin, y, "ABRECHNUNG FÜR DIE AUTOPFLEGE – NUMMER:")
    c.drawString(margin + 320, y, str(invoice_number))
    y -= 18
    c.setFont("Helvetica", 10)
    c.drawString(margin, y, business_name)
    if business_address:
        y -= 14
        c.drawString(margin, y, business_address)
    y -= 24

    # Table header
    headers = ["Fortlaufende Nr.", "Welche Reinigung", "Kennzeichen", "Name Arbeiter", "BAR Bruttobetrag", "Bruttobetrag (Karte)"]
    c.setFont("Helvetica-Bold", 9)
    for i, h in enumerate(headers):
        c.drawString(margin + i * col_w + 4, y - 14, h[:18] if len(h) > 18 else h)
    y -= row_h
    c.setFont("Helvetica", 9)

    total_cash = 0
    total_card = 0
    for idx, row in enumerate(rows, start=1):
        nr = row.get("nr", idx)
        service = (row.get("service_name") or "—")[:22]
        plate = (row.get("kennzeichen") or "—")[:14]
        worker = (row.get("worker_name") or "—")[:18]
        bar = row.get("bar_amount")
        card = row.get("card_amount")
        if bar is not None:
            total_cash += float(bar)
        if card is not None:
            total_card += float(card)
        bar_s = f"€{bar:.2f}" if bar is not None else "—"
        card_s = f"€{card:.2f}" if card is not None else "—"
        c.drawString(margin + 4, y - 14, str(nr))
        c.drawString(margin + col_w + 4, y - 14, service)
        c.drawString(margin + 2 * col_w + 4, y - 14, plate)
        c.drawString(margin + 3 * col_w + 4, y - 14, worker)
        c.drawString(margin + 4 * col_w + 4, y - 14, bar_s)
        c.drawString(margin + 5 * col_w + 4, y - 14, card_s)
        y -= row_h

    y -= 8
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin + 4 * col_w + 4, y - 14, f"€{total_cash:.2f}")
    c.drawString(margin + 5 * col_w + 4, y - 14, f"€{total_card:.2f}")
    c.drawString(margin + 3 * col_w, y - 14, "Gesamt")
    y -= 28

    c.setFont("Helvetica", 9)
    c.drawString(margin, y, "Abrechnung erstellt von: _________________________ Datum: " + from_date.strftime("%d.%m.%Y"))
    y -= 20
    c.drawString(margin, y, "Übernommen von: _________________________ Datum: _______________")
    y -= 20
    c.drawString(margin, y, f"Zeitraum: {from_date.strftime('%d.%m.%Y')} – {to_date.strftime('%d.%m.%Y')}")

    c.save()
    buf.seek(0)
    return buf.read()
