# Cher CRM — Real‑Estate Lead Management (FastAPI + React + Docker)

**Frontend (Vercel)** → https://crm-application-flame.vercel.app  
**Backend (Render)** → https://crm-application-ut0z.onrender.com

A production‑ready, containerized **CRM for real‑estate** teams.  
Backend is **FastAPI + SQLAlchemy + PostgreSQL**; frontend is **React + TypeScript (Vite)** with **Recharts** for visualizations.  
Everything runs with **Docker Compose** (Nginx serves the SPA and proxies `/api` to the backend).

---

## ✨ Features

**Core**
- JWT authentication (login/register), password hashing, role flag `is_admin`
- CRUD for **Leads** and **Activities**
- Relational data with SQLAlchemy; Pydantic v2 schemas
- Seed script for **admin** and optional **two demo users** with sample data
- CORS + Nginx reverse proxy configured for local dev and prod

**Frontend (React/TS)**
- Auth pages and protected routes (React Router v6)
- Leads list + lead detail with activities timeline
- Create/edit/delete leads & activities
- **Recharts** dashboards (totals, status breakdowns, activity trends)
- Axios API client with base URL from env and token interceptor
- Responsive layout and modern UI styling

**Backend (FastAPI)**
- Modular routers under `backend/app/routers/`
- DB auto‑create (optional) & health check
- Gunicorn + Uvicorn worker for production

---

## 🗂 Project Structure

```
crm_application/
├─ backend/
│  ├─ app/
│  │  ├─ main.py          # FastAPI app, startup hooks, CORS, health
│  │  ├─ auth.py          # JWT, password hashing helpers
│  │  ├─ database.py      # engine, SessionLocal, Base + wait_for_db
│  │  ├─ models.py        # SQLAlchemy models (User, Lead, Activity)
│  │  ├─ schemas.py       # Pydantic models
│  │  └─ routers/         # users, leads, activities, dashboard
│  ├─ scripts/seed.py     # idempotent seed with admin + demo data
│  ├─ requirements.txt
│  ├─ Dockerfile
│  └─ .env                # backend configuration
├─ frontend/
│  ├─ src/
│  │  ├─ api/axios.ts     # Axios instance (baseURL from env)
│  │  ├─ pages/           # Login, Register, Leads, LeadDetail, Dashboard
│  │  ├─ components/      # Nav, ProtectedRoute, etc.
│  │  └─ context/
│  ├─ nginx.conf          # serves SPA + proxies /api → backend
│  ├─ Dockerfile
│  └─ .env                # Vite env
├─ docker-compose.yml
└─ Readme.md
```

---

## ⚙️ Configuration

Create two env files.

### `backend/.env` (example)
```env
# Database
DATABASE_URL=postgresql+psycopg2://postgres:postgres@db:5432/crm_db

# Auth
JWT_SECRET=change-me

# CORS / origins permitted by the backend
FRONTEND_ORIGIN=http://localhost,http://frontend,http://127.0.0.1:5173
BACKEND_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Bootstrap / schema
AUTO_CREATE_TABLES=true
CREATE_ADMIN_ON_STARTUP=true
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=StrongPass123

# Optional demo users created by seed.py (if not existing)
USER1_EMAIL=user1@example.com
USER1_PASSWORD=User1Pass!
USER1_FIRST_NAME=Alex
USER1_LAST_NAME=Realtor

USER2_EMAIL=user2@example.com
USER2_PASSWORD=User2Pass!
USER2_FIRST_NAME=Jamie
USER2_LAST_NAME=Sales
```

### `frontend/.env` (example)
```env
# With Nginx proxy this keeps the app same‑origin (no CORS)
VITE_API_BASE=/api
```

---

## ▶️ Run with Docker (recommended)

```bash
# from repository root
docker compose up -d --build
```

**Services**
- Frontend: http://localhost:5173
- Backend API (direct): http://localhost:8000  (docs at `/docs`)
- SPA proxied API: http://localhost:5173/api  → backend

**Health checks**
- Frontend proxy → `GET http://localhost:5173/api/health` → `{"status":"ok"}`
- Backend direct → `GET http://localhost:8000/health`

> The backend starts under Gunicorn with Uvicorn workers; PostgreSQL runs in a separate container with a named volume.

---

## 🌱 Seeding data

The seed is **idempotent** (no duplicates for existing emails, leads, or activities).

1) Ensure containers are up:
```bash
docker compose up -d
```

2) (Optional) create DB schema if you started with a pure DB:
```bash
# on startup main.py will do this when AUTO_CREATE_TABLES=true
# you can also force it once like this:
docker compose exec backend sh -lc 'python - << "PY"
from app import models
from app.database import Base, engine
Base.metadata.create_all(bind=engine)
print("Tables ensured.")
PY'
```

3) Run the seed:
```bash
docker compose exec backend sh -lc 'PYTHONPATH=/app python /app/scripts/seed.py'
```

It will:
- Ensure **admin** (from `ADMIN_EMAIL`/`ADMIN_PASSWORD`)
- Optionally create **USER1** and **USER2** from env
- Create bounded sample **Leads** (10) and **Activities** per lead

---

## 🔐 Default accounts

- **Admin**: `admin@example.com` / `StrongPass123`  
- **User 1** (if provided in env): `user1@example.com` / `User1Pass!`  
- **User 2** (if provided in env): `user2@example.com` / `User2Pass!`

---

## 🧭 API quick reference

> Explore full interactive docs at **`/docs`**.

- `POST /users/register` – create user
- `POST /users/login` – returns JWT
- `GET /users/me` – current user
- `GET /leads` / `POST /leads` / `PUT /leads/{id}` / `DELETE /leads/{id}`
- `GET /leads/{id}` – lead with activities
- `POST /activities` – add an activity to a lead
- `GET /dashboard/metrics` – summary metrics for charts
- `GET /health` – liveness

Auth header: `Authorization: Bearer <token>`

---

## 🧑‍💻 Local development (without Docker)

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Ensure DATABASE_URL points to a reachable Postgres (e.g., local or docker db)
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# VITE_API_BASE should point to your API. For Docker-less dev use:
# VITE_API_BASE=http://127.0.0.1:8000
```

---

## 🛠 Troubleshooting

- **Network Error / CORS on login**  
  Make sure the frontend calls the API via **`/api`** and Nginx proxy is active.  
  Check `frontend/.env` → `VITE_API_BASE=/api`.  
  Hard refresh the browser (Cmd/Ctrl+Shift+R).

- **“No application module specified” or unhealthy backend**  
  This means the container CMD/ENTRYPOINT is malformed. The provided Dockerfiles and
  `docker-compose.yml` run Gunicorn with `app.main:app`.

- **DB not ready on startup**  
  Backend waits for Postgres (`wait_for_db()`), then ensures tables if `AUTO_CREATE_TABLES=true`.

- **Seeding prints “0 added”**  
  Seed is idempotent. Existing records (by email) are skipped intentionally.

- **Reset database completely**
```bash
docker compose down -v   # WARNING: drops volumes (all data)
docker compose up -d --build
```

---

## 🧱 Production notes

- Keep `VITE_API_BASE=/api` so the SPA and API remain **same origin** under Nginx.
- Configure real JWT secrets and strong admin credentials.
- Add HTTPS (Nginx TLS) and set secure cookies/headers as needed.
- Use a managed PostgreSQL or persistent volume backups.
- Scale Gunicorn workers/threads per CPU & memory budget.

---

## 📜 License

Licensed under the MIT License. See LICENSE file for details.

---

## 🧩 Assignment Summary

**Time Spent:** ~16 hours

**Technology Stack**
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL, Gunicorn, Docker
- **Frontend:** React, TypeScript, Vite, Recharts, Axios, Nginx
- **Deployment:** Render (Backend), Vercel (Frontend)
- **Containerization:** Docker Compose for local orchestration
- **Version Control:** Git + GitHub

**.env.example Files**
- Provided separately for both `backend` and `frontend` directories, showcasing all required environment variables with comments for configuration clarity.

**Challenges Faced**
- Configuring CORS and proxy rules across Docker, Render, and Vercel for smooth API communication.
- Maintaining consistent environment variables between local and production builds.
- Handling auto-table creation and idempotent seeding logic safely on Render deployment.
- Achieving responsive layout and dark mode synchronization across routes.

**Repository Highlights**
- Clean project organization with modular backend routers and reusable React components.
- Fully documented setup and run instructions in this README.
- Clear `.env.example` files and Docker configuration.
- Modern UI/UX with dashboards, CSV export, and protected routes.

---

## 🌐 Live Deployments

- **Frontend (Vercel)** → [https://crm-application-flame.vercel.app](https://crm-application-flame.vercel.app)
- **Backend (Render)** → [https://crm-application-ut0z.onrender.com](https://crm-application-ut0z.onrender.com)