import smtplib
import logging
from email.mime.text import MIMEText
import os
from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger(__name__)

MAIL_USERNAME = (os.getenv("MAIL_USERNAME") or "").strip()
MAIL_PASSWORD = (os.getenv("MAIL_PASSWORD") or "").strip().replace(" ", "")
MAIL_FROM = (os.getenv("MAIL_FROM") or os.getenv("MAIL_USERNAME") or "").strip()
# Cancel link points to frontend; set FRONTEND_URL in Render to your Static Site URL
FRONTEND_URL = os.getenv("FRONTEND_URL", os.getenv("DOMAIN", "http://localhost:5173"))

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587


def _smtp_configured():
    return bool(MAIL_USERNAME and MAIL_PASSWORD and MAIL_FROM)


def send_email(to_email: str, subject: str, body: str):
    if not _smtp_configured():
        missing = []
        if not MAIL_USERNAME:
            missing.append("MAIL_USERNAME")
        if not MAIL_PASSWORD:
            missing.append("MAIL_PASSWORD")
        if not MAIL_FROM:
            missing.append("MAIL_FROM")
        log.warning("E-Mail nicht versendet: SMTP nicht konfiguriert (%s)", ", ".join(missing) or "?")
        return

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = MAIL_FROM
    msg["To"] = to_email

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(MAIL_USERNAME, MAIL_PASSWORD)
            server.sendmail(MAIL_FROM, to_email, msg.as_string())
        log.info("E-Mail gesendet an %s (Betreff: %s)", to_email, subject)
    except Exception as e:
        log.exception("E-Mail-Versand fehlgeschlagen: %s", e)


def send_booking_confirmation(booking):
    if not booking.email:
        return

    cancel_link = f"{FRONTEND_URL.rstrip('/')}/cancel/{booking.cancel_token}"

    formatted_date = booking.start_time.strftime("%d.%m.%Y")
    formatted_time = booking.start_time.strftime("%H:%M")

    body = f"""
Sehr geehrte/r {booking.client_name},

vielen Dank für Ihre Buchung.

Ihre Reservierung wurde erfolgreich bestätigt.

Dienstleistung: {booking.service.name}
Preis: €{booking.service_price}
Datum: {formatted_date}
Uhrzeit: {formatted_time}

Hinweis:
Bei besonders großen Fahrzeugen (z.B. SUV, Transporter, Vans) wird ein Aufpreis von €24 berechnet.

Falls Sie Ihren Termin stornieren möchten, öffnen Sie den folgenden Link und bestätigen Sie die Stornierung auf der Seite (Schutz vor versehentlicher Stornierung durch E-Mail-Programme):
{cancel_link}

Mit freundlichen Grüßen
Ihr Team
"""

    send_email(booking.email, "Buchungsbestätigung", body)


def send_cancellation_email(booking):
    if not booking.email:
        return

    formatted_date = booking.start_time.strftime("%d.%m.%Y")
    formatted_time = booking.start_time.strftime("%H:%M")

    body = f"""
Sehr geehrte/r {booking.client_name},

Ihr Termin am {formatted_date} um {formatted_time} wurde storniert.

Bei Fragen kontaktieren Sie uns bitte.

Mit freundlichen Grüßen
Ihr Team
"""

    send_email(booking.email, "Termin storniert", body)


def _booking_info_body(booking):
    """Build plain text with main booking info (for owner notification copy)."""
    service_name = getattr(booking.service, "name", None) or "—"
    formatted_date = booking.start_time.strftime("%d.%m.%Y")
    formatted_time = booking.start_time.strftime("%H:%M")
    return f"""
Neue Buchung

Kunde: {booking.client_name}
Telefon: {booking.phone or '—'}
E-Mail: {booking.email or '—'}

Dienstleistung: {service_name}
Preis: €{booking.service_price}
Datum: {formatted_date}
Uhrzeit: {formatted_time}
Quelle: {booking.source or '—'}
"""


def send_booking_notification_copy(to_email: str, booking):
    """Send one email to a single address with main booking info (no cancel link)."""
    body = _booking_info_body(booking)
    send_email(to_email, "Neue Buchung – Benachrichtigung", body.strip())


def send_booking_notifications_to_owner_list(booking_id: int):
    """Background task: load booking + settings, send notification to all notification_emails."""
    from app.db.session import SessionLocal
    from app.models.booking import Booking
    from app.models.settings import BusinessSettings
    from sqlalchemy.orm import joinedload
    import json

    db = SessionLocal()
    try:
        booking = db.query(Booking).options(joinedload(Booking.service)).filter(Booking.id == booking_id).first()
        if not booking:
            return
        settings = db.query(BusinessSettings).first()
        if not settings or not getattr(settings, "notification_emails", None):
            return
        raw = settings.notification_emails.strip()
        if not raw:
            return
        try:
            emails = json.loads(raw)
        except Exception:
            return
        if not isinstance(emails, list):
            return
        for addr in emails:
            if isinstance(addr, str) and addr.strip():
                send_booking_notification_copy(addr.strip(), booking)
    finally:
        db.close()


def _cancellation_info_body(booking):
    service_name = getattr(booking.service, "name", None) or "—"
    formatted_date = booking.start_time.strftime("%d.%m.%Y")
    formatted_time = booking.start_time.strftime("%H:%M")
    return f"""
Stornierung durch Kunden

Der Kunde hat folgenden Termin storniert:

Kunde: {booking.client_name}
Telefon: {booking.phone or '—'}
E-Mail: {booking.email or '—'}

Dienstleistung: {service_name}
Preis: €{booking.service_price}
Datum: {formatted_date}
Uhrzeit: {formatted_time}
Quelle: {booking.source or '—'}
"""


def send_cancellation_notification_copy(to_email: str, booking):
    body = _cancellation_info_body(booking)
    send_email(to_email, "Termin storniert – Benachrichtigung", body.strip())


def send_cancellation_notifications_to_owner_list(booking_id: int):
    """Background task: notify notification_emails when client cancelled (public cancel link)."""
    from app.db.session import SessionLocal
    from app.models.booking import Booking
    from app.models.settings import BusinessSettings
    from sqlalchemy.orm import joinedload
    import json

    db = SessionLocal()
    try:
        booking = db.query(Booking).options(joinedload(Booking.service)).filter(Booking.id == booking_id).first()
        if not booking:
            return
        settings = db.query(BusinessSettings).first()
        if not settings or not getattr(settings, "notification_emails", None):
            return
        raw = settings.notification_emails.strip()
        if not raw:
            return
        try:
            emails = json.loads(raw)
        except Exception:
            return
        if not isinstance(emails, list):
            return
        for addr in emails:
            if isinstance(addr, str) and addr.strip():
                send_cancellation_notification_copy(addr.strip(), booking)
    finally:
        db.close()