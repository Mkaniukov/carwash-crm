# Carwash CRM

Web app for a car wash: **public online booking** and **owner** / **worker** panels. UI in German.

- **Public:** Service → Date → Time (slots) → Contacts → optional marketing consent → confirm. Confirmation email with cancel link.
- **Owner:** Dashboard, Services, Workers, Schedule, Customers (with marketing filter and CSV export), Settings.
- **Worker:** Week calendar, mark "Erledigt", cancel, create Walk-In bookings, work time tracking.

**Stack:** FastAPI (Python), React (Vite), SQLite/PostgreSQL, JWT.

See [DEPLOY.md](DEPLOY.md) for Git + Render deployment. See [docs/DESCRIPTION.md](docs/DESCRIPTION.md) for full product description.
