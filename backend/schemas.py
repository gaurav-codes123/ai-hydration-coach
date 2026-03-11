"""
schemas.py — Pydantic Request/Response Schemas
===============================================
Defines all data shapes for API input and output.
Separate from SQLAlchemy models (which are DB-only).
"""
import uuid
from datetime import date, time, datetime
from typing import Literal, List, Optional
from pydantic import BaseModel, Field, EmailStr, validator
# ─────────────────────────────────────────────
# User Schemas
# ─────────────────────────────────────────────
class UserCreate(BaseModel):
    """Schema for creating a new user (POST /users/register)"""
    name:           str   = Field(..., min_length=2, max_length=100, example="Gaurav")
    email:          str   = Field(..., example="gaurav@example.com")
    weight:         float = Field(..., ge=20, le=300, description="Weight in kg", example=75.0)
    age:            int   = Field(..., ge=5,  le=110, description="Age in years",  example=28)
    gender:         Literal["male", "female"] = Field(..., example="male")
    activity_level: Literal["sedentary", "light", "moderate", "high", "extreme"] = Field(..., example="high")
    city:           Optional[str] = Field(None, max_length=100, example="Mumbai")
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Gaurav",
                "email": "gaurav@example.com",
                "weight": 75.0,
                "age": 28,
                "gender": "male",
                "activity_level": "high",
                "city": "Mumbai"
            }
        }
class UserUpdate(BaseModel):
    """Schema for updating a user (PUT /users/{id})"""
    name:           Optional[str]   = Field(None, min_length=2, max_length=100)
    weight:         Optional[float] = Field(None, ge=20, le=300)
    age:            Optional[int]   = Field(None, ge=5,  le=110)
    gender:         Optional[Literal["male", "female"]] = None
    activity_level: Optional[Literal["sedentary", "light", "moderate", "high", "extreme"]] = None
    city:           Optional[str]   = Field(None, max_length=100)
class UserResponse(BaseModel):
    """Schema for user response data"""
    id:             uuid.UUID
    name:           str
    email:          str
    weight:         float
    age:            int
    gender:         str
    activity_level: str
    city:           Optional[str]
    created_at:     Optional[datetime]
    class Config:
        from_attributes = True   # Allow ORM model → Pydantic conversion
# ─────────────────────────────────────────────
# Water Intake Schemas
# ─────────────────────────────────────────────
class IntakeCreate(BaseModel):
    """Schema for logging water intake (POST /intake/log)"""
    user_id:   uuid.UUID = Field(..., description="User UUID")
    amount_ml: int       = Field(..., ge=50, le=5000, description="Amount in ml", example=500)
    notes:     Optional[str] = Field(None, max_length=255, example="After workout")
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "amount_ml": 500,
                "notes": "After workout"
            }
        }
class IntakeResponse(BaseModel):
    """Schema for intake log response"""
    id:         uuid.UUID
    user_id:    uuid.UUID
    amount_ml:  int
    date:       date
    time:       time
    notes:      Optional[str]
    created_at: Optional[datetime]
    class Config:
        from_attributes = True
class IntakeSummary(BaseModel):
    """Schema for daily intake summary"""
    date:            date
    total_ml:        int
    total_liters:    float
    log_count:       int
    daily_goal_ml:   Optional[int]
    percentage:      Optional[float]
class IntakeHistory(BaseModel):
    """Schema for 7-day history entry"""
    date:         date
    day_label:    str           # e.g. "Mon", "Tue"
    total_ml:     int
    total_liters: float
    goal_ml:      Optional[int]
    goal_reached: bool
# ─────────────────────────────────────────────
# Prediction Schemas
# ─────────────────────────────────────────────
class PredictRequest(BaseModel):
    """Schema for ML prediction request (POST /predictions/)"""
    user_id:        Optional[uuid.UUID] = Field(None, description="Optional — saves to DB if provided")
    age:            float = Field(..., ge=5,   le=110, example=28)
    weight:         float = Field(..., ge=20,  le=300, example=75.0)
    gender:         Literal["male", "female"] = Field(..., example="male")
    activity_level: Literal["sedentary", "light", "moderate", "high", "extreme"] = Field(..., example="high")
    temperature:    float = Field(..., ge=-30, le=60,  example=34.0)
    humidity:       float = Field(..., ge=0,   le=100, example=65.0)
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": None,
                "age": 28,
                "weight": 75.0,
                "gender": "male",
                "activity_level": "high",
                "temperature": 34.0,
                "humidity": 65.0
            }
        }
class FactorDetail(BaseModel):
    """Schema for individual factor in prediction explanation"""
    factor:      str
    value:       str
    impact:      str
    description: str
class PredictResponse(BaseModel):
    """Schema for ML prediction response"""
    prediction_id:      Optional[uuid.UUID]
    daily_goal_liters:  float
    drink_interval_hours: float
    factors:            List[FactorDetail]
    tips:               List[str]
    model_used:         str
    confidence_note:    str
    saved_to_db:        bool = False
class PredictionRecord(BaseModel):
    """Schema for a saved prediction record"""
    id:                 uuid.UUID
    user_id:            uuid.UUID
    recommended_water:  float
    temperature:        Optional[float]
    humidity:           Optional[float]
    activity_level:     str
    model_used:         Optional[str]
    drink_interval:     Optional[float]
    date:               date
    created_at:         Optional[datetime]
    class Config:
        from_attributes = True
# ─────────────────────────────────────────────
# Batch Prediction Schema
# ─────────────────────────────────────────────
class BatchPredictRequest(BaseModel):
    """Schema for batch prediction"""
    profiles: List[PredictRequest]
# ─────────────────────────────────────────────
# Weather Schema
# ─────────────────────────────────────────────
class WeatherResponse(BaseModel):
    """Schema for weather API response"""
    city:         str
    temperature:  float
    humidity:     float
    feels_like:   float
    description:  str
    weather_code: int
# ─────────────────────────────────────────────
# Generic Response Schemas
# ─────────────────────────────────────────────
class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
    success: bool = True
class ErrorResponse(BaseModel):
    """Generic error response"""
    detail:  str
    success: bool = False