from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from .. import models
from ..schemas import LeadCreate, LeadUpdate, LeadOut, LeadPagination
from .users import get_current_user  # reuse auth dependency
from fastapi.responses import StreamingResponse
import io, csv


def _scoped_query(db: Session, user):
    """
    Return a base query scoped by user permissions.
    Admins see all active leads; regular users only see their own active leads.
    """
    q = db.query(models.Lead).filter(models.Lead.is_active.is_(True))
    if not getattr(user, "is_admin", False):
        q = q.filter(models.Lead.user_id == user.id)
    return q


def _display_name(u):
    """Best-effort full name for assigned_to/owner_name; fallback to email."""
    first = (getattr(u, "first_name", None) or "").strip()
    last = (getattr(u, "last_name", None) or "").strip()
    full = f"{first} {last}".strip()
    return full or getattr(u, "email", "")


def _add_owner_name(lead: models.Lead):
    """Attach owner_name (not stored column) for response models."""
    if getattr(lead, "owner", None):
        setattr(lead, "owner_name", _display_name(lead.owner))
    else:
        setattr(lead, "owner_name", None)
    return lead


router = APIRouter(prefix="/leads", tags=["leads"])

# -------- Create --------
@router.post("", response_model=LeadOut, status_code=201)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Attach creator as owner. If assigned_to not provided, use creator's display name.
    data = payload.dict()
    if not data.get("assigned_to"):
        data["assigned_to"] = _display_name(user)

    lead = models.Lead(**data, user_id=user.id)
    db.add(lead)
    db.commit()
    db.refresh(lead)

    return _add_owner_name(lead)

# -------- List (search + filter + pagination) --------
@router.get("", response_model=LeadPagination)
def list_leads(
    q: Optional[str] = Query(None, description="search in name/email"),
    status_filter: Optional[str] = Query(None, alias="status"),
    source: Optional[str] = Query(None, description="filter by source"),
    min_budget: Optional[int] = Query(None, ge=0, description="filter by minimum budget"),
    max_budget: Optional[int] = Query(None, ge=0, description="filter by maximum budget"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100, alias="page_size"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = _scoped_query(db, user)

    if q:
        like = f"%{q}%"
        query = query.filter(
            (models.Lead.first_name.ilike(like)) |
            (models.Lead.last_name.ilike(like)) |
            (models.Lead.email.ilike(like))
        )

    if status_filter:
        query = query.filter(models.Lead.status == status_filter)

    if source:
        query = query.filter(models.Lead.source == source)

    # Budget range filters (only apply when values are provided)
    if min_budget is not None:
        query = query.filter(models.Lead.budget_min != None).filter(models.Lead.budget_min >= min_budget)
    if max_budget is not None:
        query = query.filter(models.Lead.budget_max != None).filter(models.Lead.budget_max <= max_budget)

    total = query.count()
    items = (
        query.order_by(models.Lead.created_at.desc())
             .offset((page - 1) * page_size)
             .limit(page_size)
             .all()
    )

    # enrich each with owner_name for admins (and harmless for users)
    items = [_add_owner_name(l) for l in items]

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": page_size,
    }

# -------- Get by id --------
@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(lead_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    lead = _scoped_query(db, user).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    return _add_owner_name(lead)

# -------- Update --------
@router.put("/{lead_id}", response_model=LeadOut)
def update_lead(lead_id: int, payload: LeadUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    lead = _scoped_query(db, user).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    for k, v in payload.dict(exclude_unset=True).items():
        setattr(lead, k, v)

    db.commit()
    db.refresh(lead)
    return _add_owner_name(lead)

# -------- Soft delete --------
@router.delete("/{lead_id}", status_code=204)
def delete_lead(lead_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    lead = _scoped_query(db, user).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    lead.is_active = False
    db.commit()
    return

# -------- Export CSV (respects same filters) --------
@router.get("/export.csv")
def export_leads_csv(
    q: Optional[str] = Query(None, description="search in name/email"),
    status_filter: Optional[str] = Query(None, alias="status"),
    source: Optional[str] = Query(None, description="filter by source"),
    min_budget: Optional[int] = Query(None, ge=0, description="filter by minimum budget"),
    max_budget: Optional[int] = Query(None, ge=0, description="filter by maximum budget"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = _scoped_query(db, user)

    if q:
        like = f"%{q}%"
        query = query.filter(
            (models.Lead.first_name.ilike(like)) |
            (models.Lead.last_name.ilike(like)) |
            (models.Lead.email.ilike(like))
        )

    if status_filter:
        query = query.filter(models.Lead.status == status_filter)

    if source:
        query = query.filter(models.Lead.source == source)

    if min_budget is not None:
        query = query.filter(models.Lead.budget_min != None).filter(models.Lead.budget_min >= min_budget)
    if max_budget is not None:
        query = query.filter(models.Lead.budget_max != None).filter(models.Lead.budget_max <= max_budget)

    rows = (
        query.order_by(models.Lead.created_at.desc())
             .all()
    )

    # Prepare CSV in-memory
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "first_name", "last_name", "email", "phone", "status", "source",
        "budget_min", "budget_max", "property_interest", "created_at", "updated_at"
    ])

    for l in rows:
        writer.writerow([
            l.id,
            l.first_name or "",
            l.last_name or "",
            l.email or "",
            l.phone or "",
            l.status or "",
            l.source or "",
            l.budget_min if l.budget_min is not None else "",
            l.budget_max if l.budget_max is not None else "",
            l.property_interest or "",
            getattr(l, "created_at", "") or "",
            getattr(l, "updated_at", "") or "",
        ])

    output.seek(0)
    headers = {"Content-Disposition": "attachment; filename=leads.csv"}
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers=headers)