# План: откат сложной логики + DSGVO + Kunden

## ЧАСТЬ 1 — ОТКАТ

### 1.1 Backend — удалить
- **Модели:** `app/models/checkin_form.py`, `app/models/payment.py`
- **Сервисы:** `app/services/pdf_service.py`, `app/services/google_integration.py`, `app/services/checkin_flow.py`
- **Схемы:** `app/schemas/checkin.py`
- **Скрипт:** `scripts/migrate_checkin_payment.py` (или заменить на DROP таблиц)
- **requirements.txt:** убрать `reportlab`

### 1.2 Booking.status
- Enum: только `booked`, `completed`, `cancelled`
- Логика: booked → completed (кнопка "Erledigt"), booked → cancelled
- В коде: везде заменить проверки на эти три статуса; overlap = только `booked`

### 1.3 main.py
- Убрать импорты CheckInForm, Payment
- create_all без этих моделей (таблицы в БД не удалятся автоматически — оставить или добавить скрипт DROP)

### 1.4 worker.py
- Убрать импорты CheckInForm, Payment, checkin-схемы
- Удалить: POST `/bookings/:id/complete` (форма), POST `/bookings/:id/pay`, GET `/abrechnung/pdf`
- Удалить: WorkTimeUpdateBody, PUT `/time/:id`
- Добавить: PATCH или POST `/bookings/:id/complete` — только установка status=completed (без формы)
- Упростить: list_bookings (без checkin_form, final_price), get_booking (без проверок на checked_in/paid)
- Overlap/reschedule: status == "booked"
- Cancel: status = "cancelled"

### 1.5 owner.py
- Overlap: только "booked"
- Analytics: считать completed по status == "completed"; упростить до количества записей
- Export: фильтр status == "completed"
- Удалить: PUT `/worktime/:id`

### 1.6 public.py
- by-date: статус "booked"
- cancel: status = "cancelled"
- PublicBookingRequest: позже добавить marketing_consent (Часть 2)

### 1.7 booking_service
- active_statuses для overlap: только "booked"
- Позже добавить параметры marketing_consent (Часть 2)

### 1.8 Frontend
- Удалить: CompleteBookingPage.jsx, AbrechnungPage.jsx
- Удалить роуты: `/worker/booking/:id/complete`, `/worker/abrechnung`
- Layout: убрать ссылку "Zur Abrechnung"
- WorkerDashboard: один список бронирований, кнопка "Erledigt" (без модалки оплаты и без перехода на форму)
- api.js: убрать completeBookingWithForm, payBooking, getAbrechnungPdf, workTimeUpdate; добавить markCompleted(id)
- Owner: убрать updateWorktime; Worktime-страницы оставить только список (без редактирования)
- Owner Dashboard: простая статистика (количество)

### 1.9 БД
- Таблицы checkin_forms, payments не создаются при следующем деплое (модели удалены). Для очистки — отдельный скрипт DROP (опционально).

---

## ЧАСТЬ 2 — MARKETING CONSENT (DSGVO)

- Booking: поля `marketing_consent` (Boolean, default False), `marketing_consent_at` (DateTime, nullable)
- create_booking_logic: параметры marketing_consent, marketing_consent_at; записывать в Booking
- PublicBookingRequest: marketing_consent: Optional[bool] = False
- Публичная страница бронирования: чекбокс (не отмечен по умолчанию), текст про Aktionen/Angebote и Widerruf

---

## ЧАСТЬ 3 — GET /owner/customers

- Группировка по email (или по email+phone как ключ? По заданию — по email)
- Поля: name (последнее имя), email, phone (последний), total_bookings, marketing_consent (True если хотя бы одно согласие), last_booking_date
- Фильтр ?marketing=true — только с согласием

---

## ЧАСТЬ 4 — GET /owner/customers/export

- Только marketing_consent=True
- CSV: name,email
- Content-Disposition: attachment; filename="marketing_contacts.csv"

---

## ЧАСТЬ 5 — Frontend /owner/customers

- Страница Kunden: таблица (Name, Email, Telefon, Termine, Marketing, Letzter Termin)
- Фильтр "Nur mit Marketing-Zustimmung"
- Кнопка "Export CSV"
