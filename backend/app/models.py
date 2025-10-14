from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    is_admin = Column(Boolean, nullable=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    activities = relationship("Activity", back_populates="user")
    leads = relationship("Lead", back_populates="owner", cascade="all, delete-orphan")


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), index=True)
    phone = Column(String(50))
    status = Column(String(50), index=True, default="new")  # new/contacted/qualified/won/lost
    source = Column(String(100))
    budget_min = Column(Integer)
    budget_max = Column(Integer)
    property_interest = Column(String(255))

    # ✅ Newly added optional fields so they persist & round-trip
    location = Column(String(255))
    assigned_to = Column(String(255))
    notes = Column(Text)

    is_active = Column(Boolean, default=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    activities = relationship("Activity", back_populates="lead", cascade="all, delete-orphan")
    owner = relationship("User", back_populates="leads")


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    activity_type = Column(String(50))  # call / meeting / note / email
    title = Column(String(200))
    notes = Column(Text)
    duration = Column(Integer)  # minutes (optional)
    activity_date = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lead = relationship("Lead", back_populates="activities")
    user = relationship("User", back_populates="activities")