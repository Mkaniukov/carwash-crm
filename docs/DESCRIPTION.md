# Carwash CRM — Product description

Web app for a car wash: public online booking and two restricted areas — **owner (admin) panel** and **worker panel**. UI language: German.

---

## Overview

- **Public part** — customer selects service, date, time, enters contacts and creates a booking. Confirmation email with cancel link is sent.
- **Owner (Inhaber)** — full access: analytics, services, workers, all bookings, settings, export, password change.
- **Worker (Mitarbeiter)** — view bookings for the week and create manual (Walk-In) bookings.

Roles apply after login: owner goes to admin (`/owner`), worker to worker panel (`/worker`).

---

## Admin (owner panel)

Login: **owner** + password (set via environment variable on first creation). Sidebar and sections:

### 1. Dashboard (`/owner`)

- Summary cards: revenue today, revenue this month, average per booking, completed bookings count, total bookings, cancel rate.
- Charts: revenue by worker, revenue by source (Website, Worker, Phone).
- Most popular service.

Data is based on completed bookings.

### 2. Services (`/owner/services`)

- List of services: name, price, duration (min), description.
- Create, edit, delete. Same services appear on the public booking page and in the worker panel.

### 3. Mitarbeiter (`/owner/workers`)

- List of workers (username). Create worker (login + password), edit, delete. Workers can log in to the worker panel.

### 4. Termine (`/owner/schedule`)

- Week view of bookings; filter by worker. Per day: client, service, time, status. Actions: cancel, optionally reschedule.

### 5. Kunden (`/owner/customers`)

- Customers grouped by email: name, phone, total bookings, marketing consent, last booking date. Filter “Nur mit Marketing-Zustimmung”, Export CSV.

### 6. Einstellungen (`/owner/settings`)

- Öffnungszeiten (work start/end), Arbeitstage (working days). Save. Passwort ändern (change password) below.

---

## Worker panel

- Login with worker credentials.
- Week view of bookings; button “Erledigt” (mark completed), “Stornieren” (cancel).
- Create manual booking: date, time, service, client name (e.g. Walk-In); saved as booking with source “worker”.
- Arbeitszeit: start/end work time tracking.

---

## Public part

- Home: step-by-step booking — service → date → time (slots from settings) → contacts (name, phone, email) → optional marketing consent → confirm.
- After submit: success page and (if mail configured) confirmation email with cancel link.
- Cancel link: `/cancel/:token` — cancels booking and shows “Termin storniert”.
- Past time slots for the selected day are hidden (only future slots shown).

---

## Tech stack

- **Backend:** FastAPI (Python), SQLite/PostgreSQL, JWT auth.
- **Frontend:** React (Vite), React Router, axios.
- **Deploy:** e.g. Render (backend + static site + DB); env vars set in Render dashboard.
