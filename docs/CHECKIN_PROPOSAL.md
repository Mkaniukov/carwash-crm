# Модуль цифровой приёмки — план изменений

## Текущая структура (кратко)

- **Backend:** FastAPI, SQLAlchemy, модели User, Booking, Service, BusinessSettings. Роутеры: auth, owner, worker, public. Бронирование: `booking_service.create_booking_logic`, проверка пересечений по `status == confirmed`.
- **Worker:** `POST /worker/bookings/:id/complete` — сразу ставит status=completed. В UI кнопка "Erledigt" вызывает этот endpoint.
- **Walk-In:** создаётся через `create_booking_logic` с source=worker → слот уже блокируется для онлайн-клиентов (overlap по confirmed).

## Изменения (без поломки текущей логики)

### 1. Модели БД (новые)

- **CheckInForm** — привязка к Booking, поля приёмки (car_plate, payment_method, damage notes, signature, photos, completed_at, completed_by). Одна запись на одно завершение.
- **WorkTime** — учёт смен (worker_id, start_time, end_time, pause_minutes, date; total_hours считаем).

Существующие таблицы не меняем. Миграции: через `Base.metadata.create_all` (как сейчас) или Alembic — добавить импорт моделей в main.py.

### 2. Замена "Erledigt"

- В панели сотрудника: кнопка **"Formular ausfüllen"** вместо "Erledigt".
- По клику — переход на `/worker/booking/:id/complete` (отдельная страница) или модальное окно с формой.
- Форма: данные из Booking (редактируемые) + car_plate, payment_method (cash|card), visible_damage_notes, no_visible_damage, internal_notes, signature (base64), photos (массив), completed_at/completed_by на бэкенде.
- После сохранения: статус Booking → completed, создаётся CheckInForm, далее PDF и при наличии конфига — Google Drive/Sheet.

### 3. API (новые/изменения)

- **GET /worker/bookings/:id** — одна бронь с сервисом (для предзаполнения формы). Только для worker.
- **POST /worker/bookings/:id/complete** — тело: CheckInForm (Pydantic). Создаёт CheckInForm, обновляет Booking.status, генерирует PDF, при настройке — Google. Старый вызов без тела можно считать устаревшим или оставить как "quick complete" без формы (по желанию).
- **POST /worker/time/start** — начало смены (создаёт WorkTime с start_time, date).
- **POST /worker/time/end** — конец смены (добавляет end_time, pause_minutes опционально, считаем total_hours).
- **GET /worker/time** — свои записи WorkTime (например за месяц).
- **GET /owner/worktime** — список WorkTime с фильтрами worker_id, month (year-month).

### 4. Walk-In

- Логика уже блокирует слот (create_booking_logic, overlap по confirmed). Менять не требуется.

### 5. PDF

- После сохранения формуляра — сервис (например, ReportLab или WeasyPrint) генерирует PDF: клиент, услуга, авто, оплата, подпись, дата. Сохранять во временный файл или BytesIO и передавать в Google или отдавать ссылкой.

### 6. Google Workspace

- **GoogleIntegrationService:** `upload_pdf_to_drive(file, folder_by_year_month)`, `append_row_to_sheet(data)`.
- Конфиг через env: путь к JSON сервис-аккаунта или переменная с JSON. При завершении заказа: загрузка PDF в Drive, добавление строки в Sheet (date, worker, car_plate, service, price, payment_method, drive_link). Ошибки логировать, не падать весь complete.

### 7. UI

- Форма приёмки: аккуратная вёрстка, подпись (react-signature-canvas), загрузка фото, адаптив под планшет.
- Worker: пункт меню "Arbeitszeit" → `/worker/time` (кнопки Anfang/Ende).
- Owner: пункт "Arbeitszeit" → `/owner/worktime` (фильтры + таблица).

---

Реализация по шагам: модели → API worker (booking by id, complete with form, time start/end) → API owner (worktime) → фронт форма + замена кнопки → страницы worker/time и owner/worktime → PDF → Google.

---

## Реализовано

- Модели **CheckInForm**, **WorkTime**; импорт в main.py (create_all).
- **GET /worker/bookings/:id** — одна бронь для формы.
- **POST /worker/bookings/:id/complete** — тело опционально (CompleteBookingFormBody). При наличии тела: создаётся CheckInForm, обновляется Booking, в фоне вызывается on_booking_completed_with_form (PDF + Google при настройке).
- **POST /worker/time/start**, **POST /worker/time/end**, **GET /worker/time** — учёт смен.
- **GET /owner/worktime** — список с фильтрами worker_id, year, month.
- Фронт: кнопка «Formular ausfüllen» → `/worker/booking/:id/complete`, форма с полями приёмки, подпись (canvas), фото; страницы `/worker/time` и `/owner/worktime`.
- **PDF:** reportlab в pdf_service.generate_checkin_pdf (при установленном reportlab).
- **Google:** GoogleIntegrationService (upload_pdf_to_drive, append_row_to_sheet). Env: GOOGLE_CREDENTIALS_PATH или GOOGLE_CREDENTIALS_JSON, GOOGLE_DRIVE_FOLDER_ID, GOOGLE_SHEET_ID. Для работы нужны пакеты: google-auth, google-api-python-client (добавить в requirements при использовании).
