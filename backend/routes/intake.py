"""
routes/intake.py — Water Intake Logging Endpoints
==================================================
POST  /intake/log                    → Log a water intake entry
GET   /intake/{user_id}/today        → Get today's total intake
GET   /intake/{user_id}/history      → Get 7-day intake history
GET   /intake/{user_id}/logs         → Get all individual logs for today
DELETE /intake/log/{log_id}          → Delete a single log entry
"""
import uuid
from datetime import date, datetime, timedelta
from typing import List
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from models import WaterIntake, User, Prediction
from schemas import (
    IntakeCreate, IntakeResponse,
    IntakeSummary, IntakeHistory,
    MessageResponse,
)
router = APIRouter(prefix="/intake", tags=["Water Intake"])
# ─────────────────────────────────────────────
# Helper: Get user or raise 404
# ─────────────────────────────────────────────
def get_user_or_404(user_id: uuid.UUID, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{user_id}' not found.",
        )
    return user
# ─────────────────────────────────────────────
# POST /intake/log
# ─────────────────────────────────────────────
@router.post(
    "/log",
    response_model=IntakeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log water intake",
)
def log_intake(data: IntakeCreate, db: Session = Depends(get_db)):
    """
    Log a water intake entry for a user.
    - **user_id**: UUID of the user
    - **amount_ml**: Amount in ml (50–5000)
    - **notes**: Optional note (e.g. 'After workout')
    """
    # Verify user exists
    get_user_or_404(data.user_id, db)
    now = datetime.now()
    log = WaterIntake(
        id=uuid.uuid4(),
        user_id=data.user_id,
        amount_ml=data.amount_ml,
        date=now.date(),
        time=now.time(),
        notes=data.notes,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
# ─────────────────────────────────────────────
# GET /intake/{user_id}/today
# ─────────────────────────────────────────────
@router.get(
    "/{user_id}/today",
    response_model=IntakeSummary,
    summary="Get today's water intake summary",
)
def get_today_intake(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """
    Returns total water consumed today and compares against
    TODAY's AI-recommended daily goal (not the latest ever).
    Falls back to latest prediction if no prediction exists for today.
    """
    user = get_user_or_404(user_id, db)
    today = date.today()
    # Sum today's intake
    result = db.query(
        func.sum(WaterIntake.amount_ml).label("total_ml"),
        func.count(WaterIntake.id).label("log_count"),
    ).filter(
        WaterIntake.user_id == user_id,
        WaterIntake.date == today,
    ).first()
    total_ml  = result.total_ml  or 0
    log_count = result.log_count or 0
    # ✅ FIX: Get TODAY's prediction first, fallback to latest if none today
    today_pred = db.query(Prediction).filter(
        Prediction.user_id == user_id,
        Prediction.date == today,
    ).order_by(Prediction.created_at.desc()).first()
    if not today_pred:
        # Fallback to most recent prediction
        today_pred = db.query(Prediction).filter(
            Prediction.user_id == user_id,
        ).order_by(Prediction.created_at.desc()).first()
    daily_goal_ml = None
    percentage    = None
    if today_pred:
        daily_goal_ml = int(today_pred.recommended_water * 1000)
        percentage    = round((total_ml / daily_goal_ml) * 100, 1) if daily_goal_ml > 0 else 0.0
    return IntakeSummary(
        date=today,
        total_ml=total_ml,
        total_liters=round(total_ml / 1000, 2),
        log_count=log_count,
        daily_goal_ml=daily_goal_ml,
        percentage=percentage,
    )
# ─────────────────────────────────────────────
# GET /intake/{user_id}/history
# ─────────────────────────────────────────────
@router.get(
    "/{user_id}/history",
    response_model=List[IntakeHistory],
    summary="Get 7-day hydration history",
)
def get_intake_history(user_id: uuid.UUID, days: int = 7, db: Session = Depends(get_db)):
    """
    Returns last N days of water intake data.
    Each day uses its OWN prediction goal (not a single global goal).
    Default is 7 days. Used to render the history chart.
    """
    get_user_or_404(user_id, db)
    today = date.today()
    history = []
    # ✅ FIX: Fetch ALL predictions for this user once (efficient)
    all_predictions = db.query(Prediction).filter(
        Prediction.user_id == user_id,
    ).order_by(Prediction.date.asc(), Prediction.created_at.asc()).all()
    # Build a dict: date -> goal_ml for quick lookup
    # If multiple predictions on same day, use the latest one
    pred_by_date: dict = {}
    for pred in all_predictions:
        pred_by_date[str(pred.date)] = int(pred.recommended_water * 1000)
    # Get fallback goal (latest prediction ever) for days with no prediction
    fallback_goal_ml = all_predictions[-1].recommended_water * 1000 if all_predictions else None
    for i in range(days - 1, -1, -1):
        target_date = today - timedelta(days=i)
        date_str    = str(target_date)
        # Sum intake for this specific day
        result = db.query(
            func.sum(WaterIntake.amount_ml).label("total_ml"),
        ).filter(
            WaterIntake.user_id == user_id,
            WaterIntake.date == target_date,
        ).first()
        total_ml = result.total_ml or 0
        # ✅ Use THIS day's goal, fallback to latest prediction
        day_goal_ml = pred_by_date.get(date_str, fallback_goal_ml)
        goal_reached = (day_goal_ml is not None) and (total_ml >= day_goal_ml)
        history.append(IntakeHistory(
            date=target_date,
            day_label=target_date.strftime("%a"),   # "Mon", "Tue", etc.
            total_ml=total_ml,
            total_liters=round(total_ml / 1000, 2),
            goal_ml=int(day_goal_ml) if day_goal_ml else None,
            goal_reached=goal_reached,
        ))
    return history
# ─────────────────────────────────────────────
# GET /intake/{user_id}/logs
# ─────────────────────────────────────────────
@router.get(
    "/{user_id}/logs",
    response_model=List[IntakeResponse],
    summary="Get all intake logs for today",
)
def get_today_logs(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """Returns all individual intake log entries for today."""
    get_user_or_404(user_id, db)
    today = date.today()
    logs = db.query(WaterIntake).filter(
        WaterIntake.user_id == user_id,
        WaterIntake.date == today,
    ).order_by(WaterIntake.created_at.desc()).all()
    return logs
# ─────────────────────────────────────────────
# DELETE /intake/log/{log_id}
# ─────────────────────────────────────────────
@router.delete(
    "/log/{log_id}",
    response_model=MessageResponse,
    summary="Delete a water intake log",
)
def delete_log(log_id: uuid.UUID, db: Session = Depends(get_db)):
    """Delete a single water intake log entry by its UUID."""
    log = db.query(WaterIntake).filter(WaterIntake.id == log_id).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Log entry '{log_id}' not found.",
        )
    db.delete(log)
    db.commit()
    return {"message": f"Log entry deleted successfully.", "success": True}
