# Authentication – How to log in and create users

This document describes how authentication works with the **current backend** (no backend changes).

---

## 1. How login works

- **Endpoint:** `POST /auth/login`
- **Content-Type:** `application/x-www-form-urlencoded` (form data)
- **Body:** `username=...&password=...`

The backend uses FastAPI’s `OAuth2PasswordRequestForm`, so it expects **form fields**, not JSON:

| Field      | Type   | Description        |
|-----------|--------|--------------------|
| `username` | string | Login identifier   |
| `password` | string | User password      |

**Example (curl):**

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=owner&password=admin123"
```

**Success response (200):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**JWT payload** (decode the middle part of `access_token`) contains:

- `user_id`: integer
- `role`: `"owner"` or `"worker"`
- `exp`: expiration timestamp

The frontend uses this to redirect: **owner** → `/owner`, **worker** → `/worker`.

---

## 2. Seeded users

On **first backend startup**, the app creates one default user:

| Username | Password   | Role   |
|----------|------------|--------|
| `owner`  | `admin123` | owner  |

So you can log in immediately with:

- **Username:** `owner`
- **Password:** `admin123`

There is **no seeded worker**. Create one as described below (as owner or via script).

---

## 3. Is there a register endpoint?

**No.** There is no public “register” or “sign up” endpoint.

- **Owner:** Created automatically at startup (see above). To add more owners you would need to do it in the database or add a backend endpoint (not in current setup).
- **Workers:** Created by an **owner** via the backend (see next section).

---

## 4. How to create the first owner and first worker

### Option A: Use the seeded owner, create a worker via Owner API

1. Log in as **owner** / **admin123** (see section 2).
2. Create a worker using the **Owner** API (you must be authenticated as owner):

**Endpoint:** `POST /owner/users`  
**Query parameters:**

- `username` – worker login name
- `password` – worker password

**Example (curl):**

```bash
# First get a token (replace with your actual token from login response)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST "http://localhost:8000/owner/users?username=worker1&password=worker123" \
  -H "Authorization: Bearer $TOKEN"
```

If your frontend has an “Owner → Workers” (or “Mitarbeiter”) page that calls this endpoint, you can create workers from the UI after logging in as owner.

### Option B: Create owner and worker with a script (no UI)

If the database is empty or you want a second owner/worker without using the UI:

1. Run the one-time script that uses the same password hashing as the backend (see below).
2. Then log in with the created **username** and **password** (form data as in section 1).

---

## 5. Script to create users (owner + worker)

The script uses the same database and hashing as the app, so it fits the **current backend structure**.

**Location:** `backend/scripts/create_users.py`

**Usage (from project root):**

```bash
cd backend
python -m scripts.create_users
```

This will:

- Create user **owner** / **admin123** (role `owner`) if missing.
- Create user **worker1** / **worker123** (role `worker`) if missing.

You can edit the script to change usernames/passwords or add more users. **Do not change backend logic**; only use this to insert users that match the existing `User` model and security (e.g. `hash_password`).

---

## 6. Manual SQL (alternative)

If you prefer SQL and can hash passwords yourself (e.g. with Python’s `passlib` with `pbkdf2_sha256`), the **users** table looks like this (SQLite):

```sql
-- Table: users
-- id (INTEGER PK), username (TEXT), password_hash (TEXT), role (TEXT), is_active (BOOLEAN), created_at (DATETIME)
-- role is 'owner' or 'worker'
```

Creating users by hand is only practical if you generate a valid `password_hash` with the same algorithm as the backend (`pbkdf2_sha256`). The script in section 5 does that for you.

---

## 7. Frontend login form

- The frontend sends **username** and **password** as form data to match the backend.
- If your frontend sends JSON with `email` and `password`, the backend will respond with **422** (validation error) because it only accepts form fields `username` and `password`.
- To work with this backend, the login form should send **username** (and **password**) as form data; you can still label the field “E-Mail” in the UI and use the user’s email as their username if you want.

---

## Summary

| Question                         | Answer                                                                 |
|----------------------------------|-----------------------------------------------------------------------|
| Seeded users?                    | Yes: **owner** / **admin123** (owner).                                |
| How to create first owner?      | Start the backend (creates owner once) or run `scripts/create_users.py`. |
| How to create first worker?     | Log in as owner → call `POST /owner/users?username=...&password=...` or run the script. |
| Register endpoint?              | No.                                                                   |
| Expected login body?            | Form: `username=...&password=...` (not JSON with email).              |
