import os
import random
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from sqlalchemy import inspect
from sqlalchemy.orm import Session

load_dotenv()  # read backend/.env

# Use the same engine/session/Base as the app
from app.database import engine, SessionLocal, Base
from app import models

# Try to use the project's password hasher; prefer app.auth.hash_password used by the backend.
try:
    from app.auth import hash_password as _hash_password  # type: ignore
    def get_password_hash(p: str) -> str:
        return _hash_password(p)
except Exception:
    # Fallback ONLY for local demos
    def get_password_hash(p: str) -> str:
        return p


# Helper to create or fetch a user, optionally as admin
def ensure_user(session: Session, email: str, password: str, first_name: str, last_name: str, *, make_admin: bool = False) -> models.User:
    """Create (or fetch) a user by email. Optionally toggle admin flag. Idempotent."""
    user = session.query(models.User).filter_by(email=email).first()
    if user:
        # ensure admin flag matches request when asked to make_admin
        if make_admin and not user.is_admin:
            user.is_admin = True
            session.add(user)
            session.commit()
        return user

    user = models.User(
        email=email,
        password_hash=get_password_hash(password),
        first_name=first_name,
        last_name=last_name,
        is_admin=bool(make_admin),
    )
    session.add(user)
    session.commit()
    return user


def ensure_admin(session: Session) -> models.User | None:
    """Get existing admin or create one from env if possible."""
    admin = session.query(models.User).filter_by(is_admin=True).first()
    if admin:
        return admin

    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    if not admin_email or not admin_password:
        print("❌ No admin user found and ADMIN_EMAIL/ADMIN_PASSWORD not provided. Skipping seed.")
        return None

    # If a user with that email exists, promote to admin; else create.
    user = session.query(models.User).filter_by(email=admin_email).first()
    if user:
        user.is_admin = True
        session.add(user)
        session.commit()
        print(f"🔐 Promoted existing user to admin: {admin_email}")
        return user

    user = models.User(
        email=admin_email,
        password_hash=get_password_hash(admin_password),
        first_name="Admin",
        last_name="User",
        is_admin=True,
    )
    session.add(user)
    session.commit()
    print(f"🔐 Created admin user: {admin_email}")
    return user


def seed():
    # Ensure schema exists (do not create here; avoid races)
    inspector = inspect(engine)
    if not inspector.has_table("users"):
        print("❌ Database schema not initialized (missing 'users' table). Run the schema init first.")
        return
    missing = []
    for t in ("leads", "activities"):
        if not inspector.has_table(t):
            missing.append(t)
    if missing:
        print(f"❌ Database schema incomplete (missing tables: {', '.join(missing)}). Run the schema init/migrations first.")
        return

    session = SessionLocal()
    try:
        # 1) Ensure there is an admin
        admin = ensure_admin(session)
        if not admin:
            return


        # 2) Create sample leads (idempotent by unique email)
        first_names = ["John", "Jane", "Alice", "Bob", "Eve", "Tom", "Sarah", "David", "Liam", "Sophia"]
        statuses = ["new", "contacted", "qualified", "won", "lost"]
        sources = ["Website", "Referral", "LinkedIn", "Advertisement", "Cold Call"]
        property_types = ["Apartment", "Villa", "Plot", "Office", "Shop"]

        new_leads = 0
        for i in range(10):
            email = f"lead{i+1}@example.com"
            existing = session.query(models.Lead).filter_by(email=email).first()
            if existing:
                continue
            lead = models.Lead(
                first_name=random.choice(first_names),
                last_name=random.choice(["Smith", "Johnson", "Brown", "Williams", "Miller"]),
                email=email,
                phone=f"99999{random.randint(10000, 99999)}",
                status=random.choice(statuses),
                source=random.choice(sources),
                property_interest=random.choice(property_types),  # string field
                budget_min=random.randint(30000, 50000),
                budget_max=random.randint(60000, 100000),
                user_id=admin.id,
            )
            session.add(lead)
            new_leads += 1
        session.commit()
        print(f"✅ Sample leads added: {new_leads}")

        # 2b) Ensure 2 normal users (from env) and create 5 leads each
        u1_email = os.getenv("USER1_EMAIL")
        u1_password = os.getenv("USER1_PASSWORD")
        u1_first = os.getenv("USER1_FIRST_NAME", "User1")
        u1_last = os.getenv("USER1_LAST_NAME", "Member")

        u2_email = os.getenv("USER2_EMAIL")
        u2_password = os.getenv("USER2_PASSWORD")
        u2_first = os.getenv("USER2_FIRST_NAME", "User2")
        u2_last = os.getenv("USER2_LAST_NAME", "Member")

        def seed_leads_for(owner: models.User, count: int, email_prefix: str) -> int:
            added = 0
            for i in range(count):
                lead_email = f"{email_prefix}.lead{i+1}@example.com"
                exists = session.query(models.Lead).filter_by(email=lead_email).first()
                if exists:
                    continue
                lead = models.Lead(
                    first_name=random.choice(first_names),
                    last_name=random.choice(["Smith", "Johnson", "Brown", "Williams", "Miller"]),
                    email=lead_email,
                    phone=f"88888{random.randint(10000, 99999)}",
                    status=random.choice(statuses),
                    source=random.choice(sources),
                    property_interest=random.choice(property_types),
                    budget_min=random.randint(30000, 50000),
                    budget_max=random.randint(60000, 100000),
                    user_id=owner.id,
                )
                session.add(lead)
                added += 1
            session.commit()
            return added

        total_user_leads = 0
        if u1_email and u1_password:
            user1 = ensure_user(session, u1_email, u1_password, u1_first, u1_last, make_admin=False)
            prefix1 = u1_email.split("@")[0]
            total_user_leads += seed_leads_for(user1, 5, prefix1)
            print(f"👤 User1 ready: {u1_email}")
        else:
            print("ℹ️ USER1_EMAIL/USER1_PASSWORD not set. Skipping user1 seed.")

        if u2_email and u2_password:
            user2 = ensure_user(session, u2_email, u2_password, u2_first, u2_last, make_admin=False)
            prefix2 = u2_email.split("@")[0]
            added2 = seed_leads_for(user2, 5, prefix2)
            total_user_leads += added2
            print(f"👤 User2 ready: {u2_email} (added {added2} leads; total user leads {total_user_leads})")
        else:
            print("ℹ️ USER2_EMAIL/USER2_PASSWORD not set. Skipping user2 seed.")

        # 3) Create sample activities per lead (bounded/idempotent-enough)
        leads = session.query(models.Lead).all()
        act_types = ["call", "email", "meeting", "note"]
        new_acts = 0
        for lead in leads:
            # If the lead already has any activity, skip to keep idempotence
            already = session.query(models.Activity).filter(models.Activity.lead_id == lead.id).first()
            to_create = 0 if already else random.randint(1, 3)
            for _ in range(to_create):
                act = models.Activity(
                    lead_id=lead.id,
                    user_id=admin.id,
                    activity_type=random.choice(act_types),
                    title=random.choice(["Initial Contact", "Follow-up", "Negotiation", "Site Visit"]),
                    notes="Auto-generated sample activity",
                    duration=random.randint(5, 30),
                    activity_date=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 14)),
                )
                session.add(act)
                new_acts += 1
        session.commit()
        print(f"✅ Sample activities added: {new_acts}")
        total_leads = session.query(models.Lead).count()
        total_users = session.query(models.User).count()
        print(f"🎯 Seeding complete. Users: {total_users}, Leads: {total_leads}, Activities added this run: {new_acts}")

    finally:
        session.close()


if __name__ == "__main__":
    seed()