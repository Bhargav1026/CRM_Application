from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from sqlalchemy import inspect, text
from .database import Base, engine, SessionLocal, wait_for_db
from . import models
from .auth import hash_password

from .routers import users, leads, activities, dashboard

# Optional seed script (used for a one-time seeding endpoint)
try:
    from .scripts import seed as seed_script  # backend/app/scripts/seed.py
except Exception:
    seed_script = None

# --- Logging setup ---
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("crm.main")

# --- CORS Configuration ---
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost,http://localhost:5173")
ALLOWED_ORIGINS = [o.strip() for o in FRONTEND_ORIGIN.split(",") if o.strip()]
if "*" in ALLOWED_ORIGINS:
    logger.warning("CORS is set to '*'. This is unsafe for production!")

# --- Flags ---
CREATE_ADMIN_ON_STARTUP = os.getenv("CREATE_ADMIN_ON_STARTUP", "false").lower() in {"1", "true", "yes", "on"}
AUTO_CREATE_TABLES = os.getenv("AUTO_CREATE_TABLES", "false").lower() in {"1", "true", "yes", "on"}
ENVIRONMENT = os.getenv("ENV", "development")

# --- FastAPI App ---
app = FastAPI(
    title="CRM API",
    version="1.0.0",
    description="Backend API for CRM Application with Users, Leads, and Activities",
)

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _bootstrap_admin_once() -> None:
    """Create the initial admin exactly once across all workers."""
    if not CREATE_ADMIN_ON_STARTUP:
        logger.info("Startup complete (admin bootstrap disabled).")
        return

    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    if not admin_email or not admin_password:
        logger.warning("Admin bootstrap enabled but ADMIN_EMAIL or ADMIN_PASSWORD missing; skipping.")
        return

    LOCK_KEY = 80451234567890
    with engine.begin() as conn:
        got_lock = conn.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": LOCK_KEY}).scalar()
        if not got_lock:
            logger.info("Another process is handling admin bootstrap. Skipping.")
            return
        try:
            db = SessionLocal(bind=conn)
            try:
                existing = db.query(models.User).filter(models.User.email == admin_email).first()
                if existing:
                    logger.info(f"Admin '{admin_email}' already exists; skipping creation.")
                    return
                hashed_password = hash_password(admin_password)
                user = models.User(
                    email=admin_email,
                    password_hash=hashed_password,
                    is_admin=True,
                    first_name="Admin",
                    last_name="User"
                )
                db.add(user)
                db.commit()
                logger.info(f"✅ Admin '{admin_email}' created on startup.")
            finally:
                db.close()
        finally:
            conn.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": LOCK_KEY})


@app.on_event("startup")
def on_startup():
    logger.info(f"🚀 Starting CRM backend in {ENVIRONMENT.upper()} mode...")
    wait_for_db()

    if AUTO_CREATE_TABLES:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ AUTO_CREATE_TABLES enabled: all tables ensured.")

    inspector = inspect(engine)
    if inspector.has_table("users"):
        _bootstrap_admin_once()
        logger.info("✅ Startup complete.")
    else:
        logger.warning("⚠️ DB schema not detected (no 'users' table). Skipping admin bootstrap.")


# --- Routers ---
app.include_router(users.router)
app.include_router(leads.router)
app.include_router(activities.router)
app.include_router(dashboard.router)


# --- One-time seeding endpoint (delete after use) ---
@app.post("/seed-once", tags=["System"])
def seed_once(token: str = Query(..., description="one-time seed token")):
    """
    Run database seeding once, protected by a one-off token.
    IMPORTANT: Remove this endpoint and SEED_TOKEN env var after seeding.
    """
    expected = os.getenv("SEED_TOKEN")
    if not expected or token != expected:
        raise HTTPException(status_code=403, detail="Forbidden")

    if seed_script is None or not hasattr(seed_script, "seed"):
        raise HTTPException(status_code=500, detail="Seed module not available")

    try:
        result = seed_script.seed()
        return {"status": "ok", "result": result if result is not None else "done"}
    except Exception as e:
        logger.exception("Seeding failed")
        raise HTTPException(status_code=500, detail=str(e))

# --- Health & Metadata Endpoints ---
@app.get("/health", tags=["System"])
def health():
    return {"status": "ok"}

@app.get("/healthz", tags=["System"])
def healthz():
    return {"status": "ok", "environment": ENVIRONMENT}

@app.get("/version", tags=["System"])
def version():
    return {"version": "1.0.0", "environment": ENVIRONMENT}