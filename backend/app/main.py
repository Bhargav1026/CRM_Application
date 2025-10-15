from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from sqlalchemy import inspect, text
from .database import Base, engine, SessionLocal, wait_for_db
from . import models
from .auth import hash_password
from .routers import users, leads, activities, dashboard

# --- Logging ---
logger = logging.getLogger("crm.main")
logging.basicConfig(level=logging.INFO)

# CORS origins: read from env (comma-separated)
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost,http://localhost:5173")
ALLOWED_ORIGINS = [o.strip() for o in FRONTEND_ORIGIN.split(",") if o.strip()]

# Admin bootstrap flag (keep FALSE in prod once an admin exists)

CREATE_ADMIN_ON_STARTUP = os.getenv("CREATE_ADMIN_ON_STARTUP", "false").lower() in {"1", "true", "yes", "on"}
AUTO_CREATE_TABLES = os.getenv("AUTO_CREATE_TABLES", "false").lower() in {"1", "true", "yes", "on"}

app = FastAPI(title="CRM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _bootstrap_admin_once() -> None:
    """Create the initial admin exactly once across all workers.

    Uses a Postgres advisory lock to prevent race conditions when multiple
    Gunicorn workers start at the same time.
    """
    if not CREATE_ADMIN_ON_STARTUP:
        logger.info("Startup complete (admin bootstrap disabled).")
        return

    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    if not admin_email or not admin_password:
        logger.info(
            "CREATE_ADMIN_ON_STARTUP is true but ADMIN_EMAIL or ADMIN_PASSWORD not provided; skipping admin creation."
        )
        return

    # 64-bit integer key for advisory lock (arbitrary constant)
    LOCK_KEY = 80451234567890

    with engine.begin() as conn:
        got_lock = conn.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": LOCK_KEY}).scalar()
        if not got_lock:
            logger.info("Another process is handling admin bootstrap. Skipping.")
            return
        try:
            # Only create admin if it doesn't already exist
            db = SessionLocal(bind=conn)
            try:
                existing = db.query(models.User).filter(models.User.email == admin_email).first()
                if existing:
                    logger.info("Admin '%s' already exists; skipping creation.", admin_email)
                    return

                hashed_password = hash_password(admin_password)
                user = models.User(
                    email=admin_email,
                    password_hash=hashed_password,
                    is_admin=True,
                )
                db.add(user)
                db.commit()
                logger.info("Admin '%s' created on startup.", admin_email)
            finally:
                db.close()
        finally:
            conn.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": LOCK_KEY})


@app.on_event("startup")
def on_startup():
    # Wait until DB is reachable
    wait_for_db()

    # Optionally create tables (useful for local/dev). In production keep this OFF and use migrations.
    if AUTO_CREATE_TABLES:
        # models are already imported at module import time; ensure metadata is populated
        Base.metadata.create_all(bind=engine)
        logger.info("Startup: AUTO_CREATE_TABLES=true -> ensured all tables exist.")

    # Admin bootstrap only if the users table exists
    inspector = inspect(engine)
    if inspector.has_table("users"):
        _bootstrap_admin_once()
        logger.info("Startup complete.")
    else:
        logger.info("Startup: DB schema not detected (no 'users' table). Skipping admin bootstrap.")


# Routers
app.include_router(users.router)
app.include_router(leads.router)
app.include_router(activities.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/healthz")
def healthz():
    return {"status": "ok"}