from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from .database import Base, engine, SessionLocal
from . import models
from .auth import hash_password
from .routers import users, leads, activities, dashboard

app = FastAPI(title="CRM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        admin_email = os.getenv("ADMIN_EMAIL")
        admin_password = os.getenv("ADMIN_PASSWORD")
        if admin_email and admin_password:
            admin_user = db.query(models.User).filter(models.User.email == admin_email).first()
            if not admin_user:
                hashed_password = hash_password(admin_password)
                new_admin = models.User(email=admin_email, hashed_password=hashed_password, is_admin=True)
                db.add(new_admin)
                db.commit()
    finally:
        db.close()

app.include_router(users.router)
app.include_router(leads.router)
app.include_router(activities.router)
app.include_router(dashboard.router)

@app.get("/health")
def health():
    return {"status": "ok"}