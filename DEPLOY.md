# Carwash CRM: Deploy with Git + Render

## 1. Git — first commit and push

From the project root:

```bash
cd /path/to/carwash_crm

git init
git add .
git commit -m "Carwash CRM: initial commit"
```

Create a repository on GitHub (or GitLab):

- Go to https://github.com/new
- Name: `carwash-crm` (or any)
- Do not add README or .gitignore — they are already in the project
- Create the repository

Add remote and push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/carwash-crm.git
git branch -M main
git push -u origin main
```

(Replace `YOUR_USERNAME` and repo name as needed.)

---

## 2. Render — deploy via Blueprint

1. Go to https://render.com and sign in (or register).
2. **Dashboard** → **New** → **Blueprint**.
3. Connect your repository (GitHub/GitLab) and select `carwash-crm`.
4. Render will read `render.yaml` and create:
   - **PostgreSQL** (carwash-crm-db)
   - **Web Service** (backend API)
   - **Static Site** (frontend)
5. Before **Apply**, set environment variables:
   - For **carwash-crm-api** (backend):
     - `SECRET_KEY` — long random string (use Generate in Render).
     - **`OWNER_INITIAL_PASSWORD`** — password for first owner login (username: **owner**). Set your own; not stored in code.
     - `FRONTEND_URL` = `https://carwash-crm-web.onrender.com` — frontend URL; used in emails for the “Termin stornieren” (cancel) link.
     - `CORS_ORIGINS` = `https://carwash-crm-web.onrender.com` (optional; *.onrender.com is already allowed).
     - For emails (confirmation/cancellation): `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` (e.g. Gmail app password).
   - For **carwash-crm-web** (frontend):
     - `VITE_API_URL` = `https://carwash-crm-api.onrender.com` (your backend URL; must start with `http://` or `https://`).
6. Click **Apply** and wait for the deploy.

After the first deploy:

- Open the **carwash-crm-web** tab and copy its URL (e.g. `https://carwash-crm-web.onrender.com`).
- In **carwash-crm-api** → **Environment**, set or update `CORS_ORIGINS` to that URL.
- Save and redeploy the API if needed.

### Required: SPA Rewrite (for /login and other routes)

Without this, visiting https://carwash-crm-web.onrender.com/login directly returns **Not Found**.

1. In **Dashboard**, open **carwash-crm-web** (Static Site).
2. Go to **Redirects/Rewrites**.
3. **Add Rule**:
   - **Source Path:** `/*`
   - **Destination Path:** `/index.html`
   - **Action:** **Rewrite** (not Redirect).
4. Save. Then `/login`, `/owner`, etc. will work.

---

## 3. Without Blueprint (manual setup)

### Backend (Web Service)

- **New** → **Web Service**
- Repository: your `carwash-crm`
- **Root Directory:** `backend`
- **Runtime:** Python
- **Build Command:** `pip install -r requirements.txt && python -m scripts.migrate_booking_status`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Environment:**
  - Add **PostgreSQL** (Create New Database); Render will set `DATABASE_URL`
  - `SECRET_KEY` — long random string (or Generate)
  - `OWNER_INITIAL_PASSWORD` — password for first login (username: owner)
  - `CORS_ORIGINS` = your frontend URL on Render (after creating it)

### Frontend (Static Site)

- **New** → **Static Site**
- Repository: your `carwash-crm`
- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Environment:** `VITE_API_URL` = backend URL (e.g. `https://carwash-crm-api.onrender.com`)

---

## 4. After deploy

- Owner login: **owner** / password from **OWNER_INITIAL_PASSWORD** (set in Render). Change it in Einstellungen → Passwort ändern.
- The “Termin stornieren” link in emails goes to `FRONTEND_URL/cancel/TOKEN` (cancel page).
- On Render Free tier, services spin down when idle; the first request may take 30–60 seconds.
- If **no services** appear on the start page: run **Manual Deploy** on **carwash-crm-api** (backend seeds default services on startup when DB is empty).
