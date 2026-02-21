# Plan: rollback complex logic + DSGVO + Kunden

## PART 1 — ROLLBACK

### 1.1 Backend — remove
- **Models:** `app/models/checkin_form.py`, `app/models/payment.py`
- **Services:** `app/services/pdf_service.py`, `app/services/google_integration.py`, `app/services/checkin_flow.py`
- **Schemas:** `app/schemas/checkin.py`
- **Script:** `scripts/migrate_checkin_payment.py` (or replace with DROP tables)
- **requirements.txt:** remove `reportlab`

### 1.2 Booking.status
- Enum: only `booked`, `completed`, `cancelled`
- Logic: booked → completed (button "Erledigt"), booked → cancelled
- In code: use these three statuses everywhere; overlap = only `booked`

### 1.3 main.py
- Remove CheckInForm, Payment imports
- create_all without those models (DB tables not auto-dropped — use migration script)

### 1.4 worker.py
- Remove CheckInForm, Payment, checkin schema imports
- Remove: POST `/bookings/:id/complete` (form), POST `/bookings/:id/pay`, GET `/abrechnung/pdf`
- Remove: WorkTimeUpdateBody, PUT `/time/:id`
- Add: POST `/bookings/:id/complete` — set status=completed only (no form)
- Simplify: list_bookings, get_booking; overlap/reschedule: status == "booked"; cancel: "cancelled"

### 1.5 owner.py
- Overlap: only "booked"; analytics/export: status == "completed"
- Remove: PUT `/worktime/:id` for owner

### 1.6 public.py
- by-date: status "booked"; cancel: "cancelled"; add marketing_consent (Part 2)

### 1.7 booking_service
- active_statuses for overlap: only "booked"; add marketing_consent (Part 2)

### 1.8 Frontend
- Remove: CompleteBookingPage, AbrechnungPage, routes, "Zur Abrechnung" link
- WorkerDashboard: single "Erledigt" button; api: markCompleted(id)
- Owner: no worktime menu (removed)

### 1.9 DB
- Tables checkin_forms, payments dropped by migration script.

---

## PART 2 — MARKETING CONSENT (DSGVO)

- Booking: `marketing_consent` (Boolean, default False), `marketing_consent_at` (DateTime, nullable)
- create_booking_logic and PublicBookingRequest: marketing_consent
- Public booking page: optional checkbox (Aktionen/Angebote, Widerruf text)

---

## PART 3 — GET /owner/customers

- Group by email. Fields: name (last), email, phone (last), total_bookings, marketing_consent, last_booking_date
- Query ?marketing=true — only with consent

---

## PART 4 — GET /owner/customers/export

- Only marketing_consent=True. CSV: name, email. Content-Disposition: attachment; filename="marketing_contacts.csv"

---

## PART 5 — Frontend /owner/customers

- Kunden page: table (Name, Email, Telefon, Termine, Marketing, Letzter Termin), filter "Nur mit Marketing-Zustimmung", button "Export CSV"
