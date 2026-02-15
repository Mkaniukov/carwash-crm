import smtplib
from email.mime.text import MIMEText
import os
from dotenv import load_dotenv

# Загружаем .env
load_dotenv()

MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
MAIL_FROM = os.getenv("MAIL_FROM")
DOMAIN = os.getenv("DOMAIN", "http://localhost:8000")

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587


def send_email(to_email: str, subject: str, body: str):
    if not MAIL_USERNAME or not MAIL_PASSWORD:
        print("SMTP credentials missing")
        return

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = MAIL_FROM
    msg["To"] = to_email

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(MAIL_USERNAME, MAIL_PASSWORD.replace(" ", ""))
            server.sendmail(MAIL_FROM, to_email, msg.as_string())
    except Exception as e:
        print("Email sending failed:", e)


def send_booking_confirmation(booking):
    if not booking.email:
        return

    cancel_link = f"{DOMAIN}/public/cancel/{booking.cancel_token}"

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