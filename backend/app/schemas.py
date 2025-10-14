from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# ---- Users ----
class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserOut(UserBase):
    id: int
    is_admin: bool

    class Config:
        from_attributes = True


# ---- Auth ----
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginInput(BaseModel):
    email: EmailStr
    password: str


# ---- Leads ----
class LeadBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: Optional[str] = "new"  # new/contacted/qualified/lost/won
    source: Optional[str] = None
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    property_interest: Optional[str] = None
    location: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = None
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    property_interest: Optional[str] = None
    location: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class LeadOut(LeadBase):
    id: int
    user_id: int
    is_active: bool
    # NEW: Helpful for admin dashboards & audits
    owner_name: Optional[str] = None

    class Config:
        from_attributes = True


# ---- Pagination ----
class LeadPagination(BaseModel):
    total: int
    page: int
    size: int
    items: List[LeadOut]

    class Config:
        from_attributes = True


# ---- Activities ----
class ActivityBase(BaseModel):
    activity_type: str  # "call" | "meeting" | "note" | "email"
    title: Optional[str] = None
    notes: Optional[str] = None
    duration: Optional[int] = None  # minutes
    activity_date: Optional[datetime] = None  # keep datetime to avoid date-only validation errors


class ActivityCreate(ActivityBase):
    pass


class ActivityOut(ActivityBase):
    id: int
    lead_id: int
    user_id: Optional[int] = None
    activity_date: Optional[datetime] = None

    class Config:
        from_attributes = True