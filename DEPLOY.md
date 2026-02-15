# Деплой Carwash CRM: Git + Render

## 1. Git — первый коммит и пуш

В корне проекта выполните:

```bash
cd "c:\Users\mkani\OneDrive\Документы\ELBL\carwash_crm"

git init
git add .
git commit -m "Carwash CRM: initial commit"
```

Создайте репозиторий на GitHub (или GitLab):

- Зайдите на https://github.com/new
- Имя: `carwash-crm` (или любое)
- Не добавляйте README, .gitignore — они уже в проекте
- Создайте репозиторий

Подключите remote и запушьте:

```bash
git remote add origin https://github.com/ВАШ_ЛОГИН/carwash-crm.git
git branch -M main
git push -u origin main
```

(Замените `ВАШ_ЛОГИН` и имя репозитория на свои.)

---

## 2. Render — деплой по Blueprint

1. Зайдите на https://render.com и войдите (или зарегистрируйтесь).
2. **Dashboard** → **New** → **Blueprint**.
3. Подключите репозиторий (GitHub/GitLab) и выберите `carwash-crm`.
4. Render подхватит `render.yaml` и создаст:
   - **PostgreSQL** (carwash-crm-db)
   - **Web Service** (backend API)
   - **Static Site** (frontend)
5. Перед **Apply** задайте переменные:
   - Для **carwash-crm-api** (backend):
     - `CORS_ORIGINS` = `https://carwash-crm-web.onrender.com`  
       (подставьте свой URL статического сайта после первого деплоя, например из вкладки сервиса frontend).
   - Для **carwash-crm-web** (frontend):
     - `VITE_API_URL` = `https://carwash-crm-api.onrender.com`  
       (URL вашего backend на Render).
6. Нажмите **Apply** и дождитесь деплоя.

После первого деплоя:

- Откройте вкладку **carwash-crm-web** и скопируйте URL (например `https://carwash-crm-web.onrender.com`).
- В **carwash-crm-api** в **Environment** добавьте/измените `CORS_ORIGINS` на этот URL.
- Сохраните и при необходимости передеплойте API.

### Обязательно: SPA Rewrite (чтобы работали /login и другие страницы)

Без этого при прямом заходе на https://carwash-crm-web.onrender.com/login будет **Not Found**.

1. В **Dashboard** откройте сервис **carwash-crm-web** (Static Site).
2. Слева выберите **Redirects/Rewrites**.
3. Нажмите **Add Rule** и задайте:
   - **Source Path:** `/*`
   - **Destination Path:** `/index.html`
   - **Action:** **Rewrite** (не Redirect).
4. Сохраните. После этого `/login`, `/owner` и т.д. будут открываться.

---

## 3. Без Blueprint (ручная настройка)

### Backend (Web Service)

- **New** → **Web Service**
- Репозиторий: ваш `carwash-crm`
- **Root Directory:** `backend`
- **Runtime:** Python
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Environment:**
  - Добавьте **PostgreSQL** (Create New Database), Render подставит `DATABASE_URL`
  - `SECRET_KEY` — любая длинная строка (или Generate)
  - `CORS_ORIGINS` = URL вашего frontend на Render (после его создания)

### Frontend (Static Site)

- **New** → **Static Site**
- Репозиторий: ваш `carwash-crm`
- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Environment:** `VITE_API_URL` = URL backend (например `https://carwash-crm-api.onrender.com`)

---

## 4. После деплоя

- Логин владельца: **owner** / **admin123** (смените пароль в настройках).
- На Render Free план сервисы «засыпают» после неактивности; первый запрос может идти 30–60 секунд.
- Если **нет сервисов** на главной: сделайте **Manual Deploy** у **carwash-crm-api** (бэкенд при старте создаёт сервисы, если БД пустая).
