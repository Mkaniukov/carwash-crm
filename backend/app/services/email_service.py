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
# Ссылка «Termin stornieren» ведёт на фронт; в Render задать FRONTEND_URL = URL Static Site
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

Falls Sie Ihren Termin stornieren möchten, klicken Sie bitte auf folgenden Link:
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