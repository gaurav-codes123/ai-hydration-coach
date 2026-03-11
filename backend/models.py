"""
models.py — SQLAlchemy ORM Table Definitions
=============================================
Defines 3 tables:
  1. users         — user profiles
  2. water_intake  — daily water logs
  3. predictions   — AI prediction history
"""
import uuid
from datetime import datetime, date, time
from sqlalchemy import (
    Column, String, Float, Integer,
    DateTime, Date, Time, ForeignKey, Text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
# ─────────────────────────────────────────────
# 1. Users Table
# ─────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    name            = Column(String(100), nullable=False)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    weight          = Column(Float, nullable=False)           # in kg
    age             = Column(Integer, nullable=False)
    gender          = Column(String(10), nullable=False)      # male / female
    activity_level  = Column(String(20), nullable=False)      # sedentary → extreme
    city            = Column(String(100), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())
    # Relationships
    intake_logs = relationship("WaterIntake",  back_populates="user", cascade="all, delete-orphan")
    predictions = relationship("Prediction",   back_populates="user", cascade="all, delete-orphan")
    def __repr__(self):
        return f"<User id={self.id} name={self.name} email={self.email}>"
# ─────────────────────────────────────────────
# 2. Water Intake Table
# ─────────────────────────────────────────────
class WaterIntake(Base):
    __tablename__ = "water_intake"
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    amount_ml   = Column(Integer, nullable=False)              # e.g. 250, 500, 1000
    date        = Column(Date, default=date.today, nullable=False, index=True)
    time        = Column(Time, default=datetime.now().time, nullable=False)
    notes       = Column(String(255), nullable=True)           # optional note
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    # Relationship back to user
    user = relationship("User", back_populates="intake_logs")
    def __repr__(self):
        return f"<WaterIntake id={self.id} user_id={self.user_id} amount={self.amount_ml}ml date={self.date}>"
# ─────────────────────────────────────────────
# 3. Predictions Table
# ─────────────────────────────────────────────
class Prediction(Base):
    __tablename__ = "predictions"
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    user_id             = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    recommended_water   = Column(Float, nullable=False)         # in liters
    temperature         = Column(Float, nullable=True)          # °C at time of prediction
    humidity            = Column(Float, nullable=True)          # % at time of prediction
    activity_level      = Column(String(20), nullable=False)
    model_used          = Column(String(100), nullable=True)    # e.g. GradientBoostingRegressor
    confidence_note     = Column(Text, nullable=True)           # R², MAE note
    drink_interval      = Column(Float, nullable=True)          # hours between drinks
    date                = Column(Date, default=date.today, nullable=False, index=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    # Relationship back to user
    user = relationship("User", back_populates="predictions")
    def __repr__(self):
        return f"<Prediction id={self.id} user_id={self.user_id} recommended={self.recommended_water}L date={self.date}>"