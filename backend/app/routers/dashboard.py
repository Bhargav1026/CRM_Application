from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from ..database import get_db
from .. import models
from .users import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("")
def dashboard(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """
    Returns a rich dashboard payload.
    NOTE: Existing fields (total_leads, leads_by_status, recent_activities)
    are kept for backward-compatibility. Additional metrics are appended.
    All metrics are scoped to the current user unless the user is admin.
    """
    is_admin = bool(getattr(user, "is_admin", False))
    now = datetime.now(timezone.utc)

    # Week starts Monday 00:00 (ISO week)
    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    # Month starts on the 1st 00:00
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # ---------- Base lead scope (active only) ----------
    lead_q = db.query(models.Lead).filter(models.Lead.is_active.is_(True))
    if not is_admin:
        lead_q = lead_q.filter(models.Lead.user_id == user.id)

    # ---------- Totals ----------
    total_leads = lead_q.count()

    # total activities (scoped)
    act_total_q = db.query(models.Activity).join(models.Lead, models.Activity.lead_id == models.Lead.id)
    if not is_admin:
        act_total_q = act_total_q.filter(models.Lead.user_id == user.id)
    total_activities = act_total_q.count()

    # by_status
    status_rows = (
        db.query(models.Lead.status, func.count(models.Lead.id))
        .filter(models.Lead.is_active.is_(True))
    )
    if not is_admin:
        status_rows = status_rows.filter(models.Lead.user_id == user.id)
    status_rows = status_rows.group_by(models.Lead.status).all()
    leads_by_status = {s: c for (s, c) in status_rows}

    # by_source
    source_rows = (
        db.query(models.Lead.source, func.count(models.Lead.id))
        .filter(models.Lead.is_active.is_(True))
    )
    if not is_admin:
        source_rows = source_rows.filter(models.Lead.user_id == user.id)
    source_rows = source_rows.group_by(models.Lead.source).all()
    # store None source as "unknown" for frontend convenience
    leads_by_source = { (s or "unknown"): c for (s, c) in source_rows }

    # ---------- Time buckets ----------
    d7_ago = now - timedelta(days=7)
    d30_ago = now - timedelta(days=30)

    new_leads_today = (
        lead_q.session.query(func.count(models.Lead.id))
        .select_from(models.Lead)
        .filter(
            models.Lead.is_active.is_(True),
            cast(models.Lead.created_at, Date) == cast(now, Date),
            *( [] if is_admin else [models.Lead.user_id == user.id] )
        )
        .scalar()
    )

    new_leads_7d = (
        lead_q.session.query(func.count(models.Lead.id))
        .select_from(models.Lead)
        .filter(
            models.Lead.is_active.is_(True),
            models.Lead.created_at >= d7_ago,
            *( [] if is_admin else [models.Lead.user_id == user.id] )
        )
        .scalar()
    )

    # New leads this week (from week_start)
    new_leads_this_week = (
        lead_q.session.query(func.count(models.Lead.id))
        .select_from(models.Lead)
        .filter(
            models.Lead.is_active.is_(True),
            models.Lead.created_at >= week_start,
            *( [] if is_admin else [models.Lead.user_id == user.id] )
        )
        .scalar()
    )

    new_leads_30d = (
        lead_q.session.query(func.count(models.Lead.id))
        .select_from(models.Lead)
        .filter(
            models.Lead.is_active.is_(True),
            models.Lead.created_at >= d30_ago,
            *( [] if is_admin else [models.Lead.user_id == user.id] )
        )
        .scalar()
    )

    # Win / loss (last 30 days)
    won_30d = (
        lead_q.session.query(func.count(models.Lead.id))
        .select_from(models.Lead)
        .filter(
            models.Lead.is_active.is_(True),
            models.Lead.status == "won",
            models.Lead.updated_at >= d30_ago,
            *( [] if is_admin else [models.Lead.user_id == user.id] )
        )
        .scalar()
    )
    lost_30d = (
        lead_q.session.query(func.count(models.Lead.id))
        .select_from(models.Lead)
        .filter(
            models.Lead.is_active.is_(True),
            models.Lead.status == "lost",
            models.Lead.updated_at >= d30_ago,
            *( [] if is_admin else [models.Lead.user_id == user.id] )
        )
        .scalar()
    )
    denom = won_30d + lost_30d
    win_rate_30d = (won_30d / denom) if denom else 0.0

    # Closed leads this month ("won" updated in current month)
    closed_leads_this_month = (
        lead_q.session.query(func.count(models.Lead.id))
        .select_from(models.Lead)
        .filter(
            models.Lead.is_active.is_(True),
            models.Lead.status == "won",
            models.Lead.updated_at >= month_start,
            *( [] if is_admin else [models.Lead.user_id == user.id] )
        )
        .scalar()
    )

    # ---------- Activities ----------
    act_q = db.query(models.Activity).join(models.Lead, models.Activity.lead_id == models.Lead.id)
    if not is_admin:
        act_q = act_q.filter(models.Lead.user_id == user.id)

    # recent activities (keep original shape)
    recent_activities = (
        act_q.order_by(models.Activity.activity_date.desc())
        .limit(10)
        .all()
    )

    # activities by type in last 30 days
    act_type_rows = (
        act_q.filter(models.Activity.activity_date >= d30_ago)
        .with_entities(models.Activity.activity_type, func.count(models.Activity.id))
        .group_by(models.Activity.activity_type)
        .all()
    )
    activities_by_type_30d = {t: c for (t, c) in act_type_rows}

    # average activities per active lead (last 30 days window)
    act_count_30d = act_q.filter(models.Activity.activity_date >= d30_ago).count()
    avg_activities_per_lead_30d = (act_count_30d / total_leads) if total_leads else 0.0

    # ---------- Weekly trend for the last 8 weeks ----------
    start_8w = now - timedelta(weeks=7)
    # Use Postgres date_trunc('week', ...) to bucket
    weekly_rows = (
        db.query(
            func.date_trunc('week', models.Lead.created_at).label('wk'),
            func.count(models.Lead.id)
        )
        .filter(
            models.Lead.is_active.is_(True),
            models.Lead.created_at >= start_8w,
            *( [] if is_admin else [models.Lead.user_id == user.id] )
        )
        .group_by('wk')
        .order_by('wk')
        .all()
    )
    # Convert to dict with ISO dates (YYYY-MM-DD) and fill missing weeks with 0
    week_counts = { (wk.date().isoformat() if hasattr(wk, "date") else str(wk)): c for (wk, c) in weekly_rows }
    # Build an ordered list of 8 week starts
    weeks_list = []
    # Normalize to week starts (Monday) for display
    # date_trunc('week') returns Monday 00:00 in Postgres
    for i in range(8):
        w = (start_8w + timedelta(weeks=i))
        w_key = w.date().isoformat()
        weeks_list.append({"week_start": w_key, "count": int(week_counts.get(w_key, 0))})

    # ---------- Recent leads list (for "Recent" widget) ----------
    recent_leads = (
        lead_q.order_by(models.Lead.created_at.desc())
        .limit(5)
        .with_entities(
            models.Lead.id,
            models.Lead.first_name,
            models.Lead.last_name,
            models.Lead.status,
            models.Lead.source,
            models.Lead.created_at,
        )
        .all()
    )
    recent_leads_out = [
        {
            "id": lid,
            "name": f"{fn or ''} {ln or ''}".strip(),
            "status": st,
            "source": src or "unknown",
            "created_at": ca,
        }
        for (lid, fn, ln, st, src, ca) in recent_leads
    ]

    return {
        # --- Backward compatible keys ---
        "total_leads": total_leads,
        "total_activities": int(total_activities or 0),
        "leads_by_status": leads_by_status,
        "recent_activities": [
            {"id": a.id, "lead_id": a.lead_id, "type": a.activity_type, "title": a.title, "at": a.activity_date}
            for a in recent_activities
        ],
        # --- New richer metrics ---
        "leads_by_source": leads_by_source,
        "new_leads_today": int(new_leads_today or 0),
        "new_leads_this_week": int(new_leads_this_week or 0),
        "new_leads_7d": int(new_leads_7d or 0),
        "new_leads_30d": int(new_leads_30d or 0),
        "won_30d": int(won_30d or 0),
        "lost_30d": int(lost_30d or 0),
        "closed_leads_this_month": int(closed_leads_this_month or 0),
        "win_rate_30d": win_rate_30d,
        "activities_by_type_30d": activities_by_type_30d,
        "avg_activities_per_lead_30d": avg_activities_per_lead_30d,
        "leads_trend_8w": weeks_list,
        "recent_leads": recent_leads_out,
    }