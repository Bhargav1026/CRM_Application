from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models
from ..schemas import ActivityCreate, ActivityOut
from .users import get_current_user

router = APIRouter(prefix="/leads/{lead_id}/activities", tags=["activities"])

def _get_active_lead(db: Session, lead_id: int, user) -> models.Lead:
    lead = db.get(models.Lead, lead_id)
    if not lead:
        raise HTTPException(404, "Lead not found or is archived")
    # Only owners can access unless admin
    if not getattr(user, "is_admin", False) and lead.user_id != user.id:
        raise HTTPException(403, "Not permitted")
    return lead

@router.get("", response_model=List[ActivityOut])
def list_activities(lead_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _get_active_lead(db, lead_id, user)
    return (
        db.query(models.Activity)
          .filter(models.Activity.lead_id == lead_id)
          .order_by(models.Activity.activity_date.desc())
          .all()
    )

@router.post("", response_model=ActivityOut, status_code=201)
def add_activity(
    lead_id: int,
    payload: ActivityCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    _get_active_lead(db, lead_id, user)
    act = models.Activity(lead_id=lead_id, user_id=user.id, **payload.dict())
    db.add(act)
    db.commit()
    db.refresh(act)
    return act