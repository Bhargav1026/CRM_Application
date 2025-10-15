import os
import time
import logging
from typing import Optional

from dotenv import load_dotenv, find_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import OperationalError

# Load env vars from a local .env when running outside containers.
# (In Docker/production, envs come from the orchestrator and this is a no-op.)
load_dotenv(find_dotenv(), override=False)

logger = logging.getLogger("crm.database")


def _normalize_db_url(url: str) -> str:
    """
    Accept both postgres:// and postgresql:// schemes.
    Some platforms (e.g. Heroku) still emit postgres://; SQLAlchemy expects postgresql+psycopg2://
    """
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    if url.startswith("postgresql://") and "+" not in url:
        # ensure driver is explicit to avoid ambiguity in some environments
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


def _compose_db_url_from_parts() -> Optional[str]:
    """Build a DATABASE_URL from individual POSTGRES_* parts if provided."""
    user = os.getenv("POSTGRES_USER")
    password = os.getenv("POSTGRES_PASSWORD")
    host = os.getenv("POSTGRES_HOST")
    port = os.getenv("POSTGRES_PORT")
    db = os.getenv("POSTGRES_DB")
    if all([user, password, host, port, db]):
        return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{db}"
    return None


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL") or _compose_db_url_from_parts()
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not set. Provide DATABASE_URL or POSTGRES_* variables.")

DATABASE_URL = _normalize_db_url(DATABASE_URL)

# Sensible pool defaults (tunable via env)
POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "5"))
MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "10"))
POOL_PRE_PING = os.getenv("DB_POOL_PRE_PING", "true").lower() in {"1", "true", "yes", "on"}
POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", "1800"))  # 30 minutes

engine = create_engine(
    DATABASE_URL,
    pool_size=POOL_SIZE,
    max_overflow=MAX_OVERFLOW,
    pool_pre_ping=POOL_PRE_PING,
    pool_recycle=POOL_RECYCLE,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()


# ---------------------------------------------------------------------------
# Startup helper: wait for DB (avoids race where app starts before Postgres)
# ---------------------------------------------------------------------------

def wait_for_db(max_attempts: int = int(os.getenv("DB_WAIT_ATTEMPTS", "30")),
                delay_seconds: float = float(os.getenv("DB_WAIT_DELAY", "1.0"))) -> None:
    """Poll the DB until it accepts connections (useful for Docker compose)."""
    attempt = 0
    while True:
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            if attempt:
                logger.info("Database became available after %d attempts", attempt)
            return
        except OperationalError as exc:
            attempt += 1
            if attempt >= max_attempts:
                logger.error("Database not available after %d attempts: %s", attempt, exc)
                raise
            time.sleep(delay_seconds)


# Dependency for FastAPI routes

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()