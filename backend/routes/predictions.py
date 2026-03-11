"""
routes/predictions.py — AI Prediction Endpoints
================================================
POST  /predictions/              → Run ML prediction (+ optionally save to DB)
GET   /predictions/{user_id}     → Get prediction history for a user
GET   /predictions/{user_id}/latest → Get latest prediction
"""
import uuid
import json
import numpy as np
import joblib
from datetime import date
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from database import get_db
from models import Prediction, User
from schemas import (
    PredictRequest, PredictResponse,
    PredictionRecord, FactorDetail,
    BatchPredictRequest, MessageResponse,
)
router = APIRouter(prefix="/predictions", tags=["Predictions"])
# ─────────────────────────────────────────────
# Load Model
# ─────────────────────────────────────────────
MODEL_PATH      = Path("model/hydration_model.pkl")
MODEL_INFO_PATH = Path("model/model_info.json")
model      = None
model_info = {}
def load_model():
    global model, model_info
    if MODEL_PATH.exists():
        model = joblib.load(MODEL_PATH)
        if MODEL_INFO_PATH.exists():
            with open(MODEL_INFO_PATH) as f:
                model_info = json.load(f)
load_model()
# ─────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────
ACTIVITY_MAP = {
    "sedentary": 0,
    "light":     1,
    "moderate":  2,
    "high":      3,
    "extreme":   4,
}
ACTIVITY_REASONS = {
    "sedentary": "minimal physical activity, low sweat loss",
    "light":     "light walking or desk job with occasional movement",
    "moderate":  "regular exercise 3–5 days/week",
    "high":      "intense daily training increases fluid loss significantly",
    "extreme":   "athlete-level exertion demands maximum hydration",
}
# ─────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────
def build_features(req: PredictRequest) -> np.ndarray:
    gender_enc   = 1 if req.gender == "male" else 0
    activity_enc = ACTIVITY_MAP[req.activity_level]
    return np.array([[req.age, req.weight, gender_enc, activity_enc, req.temperature, req.humidity]])
def build_factors(req: PredictRequest) -> List[FactorDetail]:
    factors = []
    # Temperature
    if req.temperature >= 40:
        temp_impact = "+1.0L (extreme heat)"
    elif req.temperature >= 35:
        temp_impact = "+0.7L (very hot)"
    elif req.temperature >= 30:
        temp_impact = "+0.5L (hot)"
    elif req.temperature >= 25:
        temp_impact = "+0.25L (warm)"
    elif req.temperature < 10:
        temp_impact = "−0.1L (cool weather)"
    else:
        temp_impact = "neutral"
    factors.append(FactorDetail(
        factor="Temperature",
        value=f"{req.temperature}°C",
        impact=temp_impact,
        description="High temperatures increase sweating and fluid loss.",
    ))
    # Humidity
    if req.humidity > 70:
        hum_impact = "+0.2L (high — sweat evaporates slower)"
    elif req.humidity < 30:
        hum_impact = "+0.1L (low — dry air increases moisture loss)"
    else:
        hum_impact = "neutral"
    factors.append(FactorDetail(
        factor="Humidity",
        value=f"{req.humidity:.0f}%",
        impact=hum_impact,
        description="Low humidity dries airways; high humidity slows cooling.",
    ))
    # Activity
    act_mult = [1.0, 1.15, 1.30, 1.50, 1.75][ACTIVITY_MAP[req.activity_level]]
    factors.append(FactorDetail(
        factor="Activity Level",
        value=req.activity_level.capitalize(),
        impact=f"×{act_mult} multiplier",
        description=ACTIVITY_REASONS[req.activity_level].capitalize() + ".",
    ))
    # Weight
    base_liters = round(req.weight * 0.035, 2)
    factors.append(FactorDetail(
        factor="Body Weight",
        value=f"{req.weight} kg",
        impact=f"Base {base_liters}L (35ml/kg)",
        description="Larger body mass requires more water for metabolic functions.",
    ))
    # Age
    if req.age < 18:
        age_impact = "+10% (youth — higher water turnover)"
        age_desc   = "Younger bodies have faster metabolism and higher water turnover."
    elif req.age > 55:
        age_impact = "−5% (senior — reduced thirst sensation)"
        age_desc   = "Older adults may underestimate thirst; regular monitoring is key."
    else:
        age_impact = "neutral (adult range)"
        age_desc   = "Standard adult metabolic water needs."
    factors.append(FactorDetail(
        factor="Age",
        value=f"{int(req.age)} years",
        impact=age_impact,
        description=age_desc,
    ))
    # Gender
    g_impact = "+5% (male — higher muscle mass)" if req.gender == "male" else "−5% (female — standard adjustment)"
    factors.append(FactorDetail(
        factor="Gender",
        value=req.gender.capitalize(),
        impact=g_impact,
        description="Biological differences in muscle mass and metabolism affect hydration needs.",
    ))
    return factors
def build_tips(req: PredictRequest, liters: float, interval: float) -> List[str]:
    tips = [
        f"Drink ~250ml every {round(interval, 1)} hour(s) throughout your day.",
        "Start your morning with 500ml of water immediately after waking.",
    ]
    if req.activity_level in ("high", "extreme"):
        tips.append("Drink 500ml 30 minutes before exercise and replace every 20 min during.")
        tips.append("Consider electrolyte drinks for sessions longer than 60 minutes.")
    else:
        tips.append("Drink 250ml before each meal to stay on track.")
    if req.temperature >= 30:
        tips.append(f"At {req.temperature}°C, carry a water bottle at all times.")
    elif req.temperature < 15:
        tips.append("Warm herbal teas and soups count toward your daily intake.")
    if req.humidity > 70:
        tips.append("High humidity slows sweat evaporation — hydrate proactively.")
    elif req.humidity < 30:
        tips.append("Dry air increases moisture loss through breathing — sip regularly.")
    if req.age > 55:
        tips.append("Set hourly phone reminders — older adults often underestimate thirst.")
    tips.append("Eat water-rich foods: cucumber (96%), watermelon (92%), oranges (86%).")
    tips.append("Your urine should be pale yellow — dark yellow means drink more.")
    return tips
# ─────────────────────────────────────────────
# POST /predictions/
# ─────────────────────────────────────────────
@router.post(
    "/",
    response_model=PredictResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Run AI prediction",
)
def predict(req: PredictRequest, db: Session = Depends(get_db)):
    """
    Run the ML model to predict daily water intake.
    - Optionally provide **user_id** to save prediction to the database.
    - Returns: goal in liters, drink interval, factor breakdown, tips.
    """
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML model not loaded. Run train_model.py first.",
        )
    try:
        features = build_features(req)
        raw_pred = model.predict(features)[0]
        liters   = float(np.clip(raw_pred, 1.5, 5.0))
        liters   = round(liters, 1)
        glasses  = max(1, int(liters * 1000 / 250))
        interval = round(16 / glasses, 1)
        factors  = build_factors(req)
        tips     = build_tips(req, liters, interval)
        # Save to DB if user_id provided
        saved_to_db   = False
        prediction_id = None
        if req.user_id:
            user = db.query(User).filter(User.id == req.user_id).first()
            if user:
                today = date.today()
                # ✅ UPSERT: Check if a prediction already exists for today
                existing_pred = db.query(Prediction).filter(
                    Prediction.user_id == req.user_id,
                    Prediction.date == today,
                ).first()
                if existing_pred:
                    # Update today's prediction instead of creating a duplicate
                    existing_pred.recommended_water = liters
                    existing_pred.temperature       = req.temperature
                    existing_pred.humidity          = req.humidity
                    existing_pred.activity_level    = req.activity_level
                    existing_pred.drink_interval    = interval
                    db.commit()
                    db.refresh(existing_pred)
                    saved_to_db   = True
                    prediction_id = existing_pred.id
                else:
                    # Create new prediction for today
                    pred_record = Prediction(
                        id=uuid.uuid4(),
                        user_id=req.user_id,
                        recommended_water=liters,
                        temperature=req.temperature,
                        humidity=req.humidity,
                        activity_level=req.activity_level,
                        model_used="GradientBoostingRegressor (scikit-learn)",
                        confidence_note=f"R²={model_info.get('test_r2', 'N/A')}, MAE={model_info.get('test_mae', 'N/A')}L",
                        drink_interval=interval,
                        date=today,
                    )
                    db.add(pred_record)
                    db.commit()
                    db.refresh(pred_record)
                    saved_to_db   = True
                    prediction_id = pred_record.id
        return PredictResponse(
            prediction_id=prediction_id,
            daily_goal_liters=liters,
            drink_interval_hours=interval,
            factors=factors,
            tips=tips,
            model_used="GradientBoostingRegressor (scikit-learn)",
            confidence_note=f"Model R²={model_info.get('test_r2', 'N/A')}, MAE={model_info.get('test_mae', 'N/A')}L on test set.",
            saved_to_db=saved_to_db,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}",
        )
# ─────────────────────────────────────────────
# GET /predictions/{user_id}
# ─────────────────────────────────────────────
@router.get(
    "/{user_id}",
    response_model=List[PredictionRecord],
    summary="Get prediction history for a user",
)
def get_predictions(user_id: uuid.UUID, limit: int = 30, db: Session = Depends(get_db)):
    """Returns the last N AI predictions made for a user (default 30)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")
    preds = db.query(Prediction).filter(
        Prediction.user_id == user_id,
    ).order_by(Prediction.created_at.desc()).limit(limit).all()
    return preds
# ─────────────────────────────────────────────
# GET /predictions/{user_id}/latest
# ─────────────────────────────────────────────
@router.get(
    "/{user_id}/latest",
    response_model=PredictionRecord,
    summary="Get latest prediction for a user",
)
def get_latest_prediction(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """Returns the most recent AI prediction for a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")
    pred = db.query(Prediction).filter(
        Prediction.user_id == user_id,
    ).order_by(Prediction.created_at.desc()).first()
    if not pred:
        raise HTTPException(
            status_code=404,
            detail=f"No predictions found for user '{user_id}'.",
        )
    return pred
# ─────────────────────────────────────────────
# POST /predictions/batch
# ─────────────────────────────────────────────
@router.post(
    "/batch",
    summary="Batch predictions (no DB save)",
)
def predict_batch(batch: BatchPredictRequest):
    """Run predictions for multiple profiles at once. Does not save to DB."""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded.")
    results = []
    for req in batch.profiles:
        features = build_features(req)
        raw_pred = model.predict(features)[0]
        liters   = float(np.clip(raw_pred, 1.5, 5.0))
        results.append({
            "age":              req.age,
            "weight":           req.weight,
            "gender":           req.gender,
            "activity_level":   req.activity_level,
            "temperature":      req.temperature,
            "humidity":         req.humidity,
            "daily_goal_liters": round(liters, 1),
        })
    return {"count": len(results), "predictions": results}