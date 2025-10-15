from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import logging

from ..database import get_db
from .. import models
from ..schemas import LeadCreate, LeadUpdate, LeadOut, LeadPagination
from .users import get_current_user  # reuse auth dependency
from fastapi.responses import StreamingResponse
import io, csv


logger = logging.getLogger(__name__)


def _to_int(v: Optional[str]) -> Optional[int]:
    """Convert a string query parameter to int; return None for blanks/non-digits."""
    if v is None:
        return None
    s = str(v).strip()
    return int(s) if s.isdigit() else None


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
    """Return best-effort full name for assigned_to/owner_name; fallback to email."""
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


def _filter_leads_query(
    query,
    q: Optional[str] = None,
    status_filter: Optional[str] = None,
    source: Optional[str] = None,
    min_budget: Optional[str] = None,
    max_budget: Optional[str] = None,
):
    """
    Apply search and filter parameters to the leads query.
    Raises HTTPException 400 for invalid filter inputs.
    """
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

    mb = _to_int(min_budget)
    xb = _to_int(max_budget)
    if min_budget is not None and mb is None and min_budget.strip() != "":
        logger.error(f"Invalid min_budget filter input: {min_budget}")
        raise HTTPException(status_code=400, detail="Invalid filter input for min_budget")
    if max_budget is not None and xb is None and max_budget.strip() != "":
        logger.error(f"Invalid max_budget filter input: {max_budget}")
        raise HTTPException(status_code=400, detail="Invalid filter input for max_budget")

    if mb is not None:
        query = query.filter(models.Lead.budget_min != None).filter(models.Lead.budget_min >= mb)
    if xb is not None:
        query = query.filter(models.Lead.budget_max != None).filter(models.Lead.budget_max <= xb)

    return query


router = APIRouter(prefix="/leads", tags=["leads"])

# -------- Create --------
@router.post("", response_model=LeadOut, status_code=201)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    data = payload.dict()
    if not data.get("assigned_to"):
        data["assigned_to"] = _display_name(user)

    lead = models.Lead(**data, user_id=user.id)
    try:
        db.add(lead)
        db.commit()
        db.refresh(lead)
        logger.info(f"Lead created with id={lead.id} by user_id={user.id}")
    except Exception as e:
        logger.error(f"Error creating lead: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create lead")

    return _add_owner_name(lead)

# -------- List (search + filter + pagination) --------
@router.get("", response_model=LeadPagination)
def list_leads(
    q: Optional[str] = Query(None, description="search in name/email"),
    status_filter: Optional[str] = Query(None, alias="status"),
    source: Optional[str] = Query(None, description="filter by source"),
    min_budget: Optional[str] = Query(None, description="filter by minimum budget (string, blank allowed)"),
    max_budget: Optional[str] = Query(None, description="filter by maximum budget (string, blank allowed)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100, alias="page_size"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        query = _scoped_query(db, user)
        query = _filter_leads_query(query, q, status_filter, source, min_budget, max_budget)

        total = query.count()
        items = (
            query.order_by(models.Lead.created_at.desc())
                 .offset((page - 1) * page_size)
                 .limit(page_size)
                 .all()
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing leads: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to list leads")

    items = [_add_owner_name(l) for l in items]

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": page_size,
    }

# -------- Export CSV (respects same filters) --------
@router.get("/export")
@router.get("/export.csv")
def export_leads_csv(
    q: Optional[str] = Query(None, description="search in name/email"),
    status_filter: Optional[str] = Query(None, alias="status"),
    source: Optional[str] = Query(None, description="filter by source"),
    min_budget: Optional[str] = Query(None, description="filter by minimum budget (string, blank allowed)"),
    max_budget: Optional[str] = Query(None, description="filter by maximum budget (string, blank allowed)"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        query = _scoped_query(db, user)
        query = _filter_leads_query(query, q, status_filter, source, min_budget, max_budget)

        rows = (
            query.order_by(models.Lead.created_at.desc())
                 .all()
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting leads CSV: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to export leads")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "first_name", "last_name", "email", "phone", "status", "source",
        "budget_min", "budget_max", "property_interest", "created_at", "updated_at", "owner_name"
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
            _display_name(l.owner) if getattr(l, "owner", None) else ""
        ])

    output.seek(0)
    headers = {"Content-Disposition": "attachment; filename=leads.csv"}
    logger.info(f"Leads CSV exported by user_id={user.id}, rows={len(rows)}")
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers=headers)

# -------- Get by id --------
@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(lead_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        lead = _scoped_query(db, user).filter(models.Lead.id == lead_id).first()
    except Exception as e:
        logger.error(f"Error fetching lead id={lead_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch lead")

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return _add_owner_name(lead)

# -------- Update --------
@router.put("/{lead_id}", response_model=LeadOut)
def update_lead(lead_id: int, payload: LeadUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        lead = _scoped_query(db, user).filter(models.Lead.id == lead_id).first()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")

        for k, v in payload.dict(exclude_unset=True).items():
            setattr(lead, k, v)

        db.commit()
        db.refresh(lead)
        logger.info(f"Lead updated with id={lead_id} by user_id={user.id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating lead id={lead_id}: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update lead")

    return _add_owner_name(lead)

# -------- Soft delete --------
@router.delete("/{lead_id}", status_code=204)
def delete_lead(lead_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        lead = _scoped_query(db, user).filter(models.Lead.id == lead_id).first()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        lead.is_active = False
        db.commit()
        logger.info(f"Lead soft deleted with id={lead_id} by user_id={user.id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting lead id={lead_id}: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete lead")
    return