# """
# main.py — AI Hydration Coach FastAPI Backend
# =============================================
# Serves the trained Scikit-learn model via a REST API.
# Endpoints:
#   GET  /                        → Health check
#   GET  /model/info              → Model metadata (features, score, importances)
#   POST /predict                 → Predict daily water intake
#   POST /predict/batch           → Batch predictions
#   GET  /weather/{city}          → Fetch live weather for a city (proxy)
# Run with:
#   uvicorn main:app --reload --port 8000
# Or for production:
#   uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
# """
# import os
# import json
# import numpy as np
# import joblib
# import httpx
# from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel, Field, validator
# from typing import Literal, List, Optional
# from pathlib import Path
# # ─────────────────────────────────────────────
# # App Setup
# # ─────────────────────────────────────────────
# app = FastAPI(
#     title="AI Hydration Coach API",
#     description="Predicts daily water intake using a trained Gradient Boosting model.",
#     version="1.0.0",
#     docs_url="/docs",
#     redoc_url="/redoc",
# )
# # Allow React frontend to call this API
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],          # In production, restrict to your domain
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
# # ─────────────────────────────────────────────
# # Load Model at Startup
# # ─────────────────────────────────────────────
# MODEL_PATH    = Path("model/hydration_model.pkl")
# MODEL_INFO_PATH = Path("model/model_info.json")
# model    = None
# model_info = {}
# @app.on_event("startup")
# async def load_model():
#     global model, model_info
#     if not MODEL_PATH.exists():
#         print("⚠️  Model not found. Running train_model.py...")
#         import train_model
#         train_model.train()
#     model = joblib.load(MODEL_PATH)
#     print(f"✅ Model loaded from {MODEL_PATH}")
#     if MODEL_INFO_PATH.exists():
#         with open(MODEL_INFO_PATH) as f:
#             model_info = json.load(f)
#         print(f"✅ Model info loaded: R²={model_info.get('test_r2')}, MAE={model_info.get('test_mae')}")
# # ─────────────────────────────────────────────
# # Schemas
# # ─────────────────────────────────────────────
# ACTIVITY_MAP = {
#     "sedentary": 0,
#     "light":     1,
#     "moderate":  2,
#     "high":      3,
#     "extreme":   4,
# }
# ACTIVITY_LABELS = {v: k for k, v in ACTIVITY_MAP.items()}
# ACTIVITY_REASONS = {
#     "sedentary": "minimal physical activity, low sweat loss",
#     "light":     "light walking or desk job with occasional movement",
#     "moderate":  "regular exercise 3–5 days/week",
#     "high":      "intense daily training increases fluid loss significantly",
#     "extreme":   "athlete-level exertion demands maximum hydration",
# }
# class PredictRequest(BaseModel):
#     age: float = Field(..., ge=5, le=110, description="Age in years")
#     weight: float = Field(..., ge=20, le=300, description="Weight in kg")
#     gender: Literal["male", "female"] = Field(..., description="Biological gender")
#     activity_level: Literal["sedentary", "light", "moderate", "high", "extreme"]
#     temperature: float = Field(..., ge=-30, le=60, description="Air temperature in °C")
#     humidity: float = Field(..., ge=0, le=100, description="Relative humidity %")
#     class Config:
#         json_schema_extra = {
#             "example": {
#                 "age": 28,
#                 "weight": 75,
#                 "gender": "male",
#                 "activity_level": "high",
#                 "temperature": 34,
#                 "humidity": 65,
#             }
#         }
# class FactorDetail(BaseModel):
#     factor: str
#     value: str
#     impact: str
#     description: str
# class PredictResponse(BaseModel):
#     daily_goal_liters: float
#     drink_interval_hours: float
#     factors: List[FactorDetail]
#     tips: List[str]
#     model_used: str
#     confidence_note: str
# class BatchPredictRequest(BaseModel):
#     profiles: List[PredictRequest]
# class WeatherResponse(BaseModel):
#     city: str
#     temperature: float
#     humidity: float
#     feels_like: float
#     description: str
#     weather_code: int
# # ─────────────────────────────────────────────
# # Helper Functions
# # ─────────────────────────────────────────────
# def build_features(req: PredictRequest) -> np.ndarray:
#     """Convert request to model feature array."""
#     gender_enc   = 1 if req.gender == "male" else 0
#     activity_enc = ACTIVITY_MAP[req.activity_level]
#     return np.array([[
#         req.age,
#         req.weight,
#         gender_enc,
#         activity_enc,
#         req.temperature,
#         req.humidity,
#     ]])
# def build_factors(req: PredictRequest, liters: float) -> List[FactorDetail]:
#     """Generate human-readable factor breakdown."""
#     factors = []
#     # Temperature
#     if req.temperature >= 40:
#         temp_impact = "+1.0L (extreme heat)"
#     elif req.temperature >= 35:
#         temp_impact = "+0.7L (very hot)"
#     elif req.temperature >= 30:
#         temp_impact = "+0.5L (hot)"
#     elif req.temperature >= 25:
#         temp_impact = "+0.25L (warm)"
#     elif req.temperature < 10:
#         temp_impact = "−0.1L (cool)"
#     else:
#         temp_impact = "neutral"
#     factors.append(FactorDetail(
#         factor="Temperature",
#         value=f"{req.temperature}°C",
#         impact=temp_impact,
#         description="High temperatures increase sweating and fluid loss.",
#     ))
#     # Humidity
#     if req.humidity > 70:
#         hum_impact = "+0.2L (high — sweat evaporates slower)"
#     elif req.humidity < 30:
#         hum_impact = "+0.1L (low — dry air increases moisture loss)"
#     else:
#         hum_impact = "neutral"
#     factors.append(FactorDetail(
#         factor="Humidity",
#         value=f"{req.humidity:.0f}%",
#         impact=hum_impact,
#         description="Low humidity dries airways; high humidity slows cooling.",
#     ))
#     # Activity
#     act_mult = [1.0, 1.15, 1.30, 1.50, 1.75][ACTIVITY_MAP[req.activity_level]]
#     factors.append(FactorDetail(
#         factor="Activity Level",
#         value=req.activity_level.capitalize(),
#         impact=f"×{act_mult} multiplier",
#         description=ACTIVITY_REASONS[req.activity_level].capitalize() + ".",
#     ))
#     # Weight
#     base_liters = round(req.weight * 0.035, 2)
#     factors.append(FactorDetail(
#         factor="Body Weight",
#         value=f"{req.weight} kg",
#         impact=f"Base {base_liters}L (35ml/kg)",
#         description="Larger body mass requires more water for metabolic functions.",
#     ))
#     # Age
#     if req.age < 18:
#         age_impact = "+10% (youth — higher water turnover)"
#         age_desc   = "Younger bodies have faster metabolism and higher water turnover."
#     elif req.age > 55:
#         age_impact = "−5% (senior — reduced thirst sensation)"
#         age_desc   = "Older adults may underestimate thirst; monitoring is important."
#     else:
#         age_impact = "neutral (adult range)"
#         age_desc   = "Standard adult metabolic water needs."
#     factors.append(FactorDetail(
#         factor="Age",
#         value=f"{int(req.age)} years",
#         impact=age_impact,
#         description=age_desc,
#     ))
#     # Gender
#     g_impact = "+5% (male — higher muscle mass)" if req.gender == "male" else "−5% (female — standard adjustment)"
#     factors.append(FactorDetail(
#         factor="Gender",
#         value=req.gender.capitalize(),
#         impact=g_impact,
#         description="Biological differences in muscle mass and metabolism affect hydration needs.",
#     ))
#     return factors
# def build_tips(req: PredictRequest, liters: float, interval: float) -> List[str]:
#     """Generate personalized hydration tips."""
#     interval_str = f"{interval:.1f}".rstrip("0").rstrip(".")
#     tips = [
#         f"Drink ~250ml every {interval_str} hour(s) throughout your {16}-hour day.",
#         "Start your morning with 500ml of water immediately after waking.",
#     ]
#     if req.activity_level in ("high", "extreme"):
#         tips.append("Drink 500ml 30 minutes before exercise and replace every 20 min during.")
#         tips.append("Consider electrolyte drinks for sessions longer than 60 minutes.")
#     else:
#         tips.append("Drink 250ml before each meal to stay on track.")
#     if req.temperature >= 30:
#         tips.append(f"At {req.temperature}°C, carry a water bottle at all times — avoid outdoor exposure without water.")
#     elif req.temperature < 15:
#         tips.append("In cool weather, warm herbal teas and soups count toward your daily intake.")
#     if req.humidity > 70:
#         tips.append("High humidity slows sweat evaporation — your body may overheat faster, so hydrate proactively.")
#     elif req.humidity < 30:
#         tips.append("Dry air increases moisture loss through breathing — sip water regularly even if not thirsty.")
#     if req.age > 55:
#         tips.append("Set hourly phone reminders — older adults often underestimate thirst.")
#     tips.append("Eat water-rich foods: cucumber (96% water), watermelon (92%), oranges (86%).")
#     tips.append("Your urine should be pale yellow — dark yellow means you need more water.")
#     return tips
# def wmo_description(code: int) -> str:
#     """Translate WMO weather codes to descriptions."""
#     if code == 0:   return "Clear sky"
#     if code == 1:   return "Mainly clear"
#     if code == 2:   return "Partly cloudy"
#     if code == 3:   return "Overcast"
#     if code in (45, 48): return "Foggy"
#     if code in (51, 53, 55): return "Drizzle"
#     if code in (61, 63, 65): return "Rain"
#     if code in (71, 73, 75): return "Snow"
#     if code in (80, 81, 82): return "Rain showers"
#     if code in (95, 96, 99): return "Thunderstorm"
#     return "Unknown"
# # ─────────────────────────────────────────────
# # Routes
# # ─────────────────────────────────────────────
# @app.get("/", tags=["Health"])
# async def root():
#     """Health check endpoint."""
#     return {
#         "status":  "ok",
#         "service": "AI Hydration Coach API",
#         "version": "1.0.0",
#         "model_loaded": model is not None,
#     }
# @app.get("/model/info", tags=["Model"])
# async def get_model_info():
#     """Returns metadata about the trained model."""
#     if not model_info:
#         raise HTTPException(status_code=503, detail="Model info not available.")
#     return model_info
# @app.post("/predict", response_model=PredictResponse, tags=["Prediction"])
# async def predict(req: PredictRequest):
#     """
#     Predict daily water intake using the trained ML model.
#     Returns:
#     - daily_goal_liters: recommended intake
#     - drink_interval_hours: how often to drink
#     - factors: breakdown of each input's impact
#     - tips: personalized hydration tips
#     """
#     if model is None:
#         raise HTTPException(status_code=503, detail="Model not loaded. Try again in a moment.")
#     try:
#         features = build_features(req)
#         raw_pred = model.predict(features)[0]
#         liters   = float(np.clip(raw_pred, 1.5, 5.0))
#         liters   = round(liters, 1)
#         # Drink interval: assume 16 awake hours, 250ml per glass
#         glasses  = max(1, int(liters * 1000 / 250))
#         interval = round(16 / glasses, 1)
#         factors = build_factors(req, liters)
#         tips    = build_tips(req, liters, interval)
#         return PredictResponse(
#             daily_goal_liters=liters,
#             drink_interval_hours=interval,
#             factors=factors,
#             tips=tips,
#             model_used="GradientBoostingRegressor (scikit-learn)",
#             confidence_note=f"Model R²={model_info.get('test_r2', 'N/A')}, MAE={model_info.get('test_mae', 'N/A')}L on test set.",
#         )
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
# @app.post("/predict/batch", tags=["Prediction"])
# async def predict_batch(batch: BatchPredictRequest):
#     """Predict hydration for multiple profiles at once."""
#     if model is None:
#         raise HTTPException(status_code=503, detail="Model not loaded.")
#     results = []
#     for req in batch.profiles:
#         features = build_features(req)
#         raw_pred = model.predict(features)[0]
#         liters   = float(np.clip(raw_pred, 1.5, 5.0))
#         results.append({
#             "age":           req.age,
#             "weight":        req.weight,
#             "gender":        req.gender,
#             "activity_level": req.activity_level,
#             "temperature":   req.temperature,
#             "humidity":      req.humidity,
#             "daily_goal_liters": round(liters, 1),
#         })
#     return {"count": len(results), "predictions": results}
# @app.get("/weather/{city}", response_model=WeatherResponse, tags=["Weather"])
# async def get_weather(city: str):
#     """
#     Proxy endpoint: fetches live weather for a city using Open-Meteo + Geocoding API.
#     This avoids CORS issues when calling from the browser directly.
#     """
#     async with httpx.AsyncClient(timeout=10.0) as client:
#         # Step 1: Geocode the city
#         geo_url = "https://geocoding-api.open-meteo.com/v1/search"
#         geo_resp = await client.get(geo_url, params={"name": city, "count": 1, "language": "en"})
#         geo_data = geo_resp.json()
#         if not geo_data.get("results"):
#             raise HTTPException(status_code=404, detail=f"City '{city}' not found.")
#         result  = geo_data["results"][0]
#         lat     = result["latitude"]
#         lon     = result["longitude"]
#         city_name = result.get("name", city)
#         # Step 2: Fetch weather
#         wx_url  = "https://api.open-meteo.com/v1/forecast"
#         wx_resp = await client.get(wx_url, params={
#             "latitude":  lat,
#             "longitude": lon,
#             "current":   "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code",
#             "timezone":  "auto",
#         })
#         wx_data = wx_resp.json()
#         current = wx_data.get("current", {})
#         temperature  = current.get("temperature_2m", 25.0)
#         humidity     = current.get("relative_humidity_2m", 50.0)
#         feels_like   = current.get("apparent_temperature", temperature)
#         weather_code = current.get("weather_code", 0)
#     return WeatherResponse(
#         city=city_name,
#         temperature=round(temperature, 1),
#         humidity=round(humidity, 1),
#         feels_like=round(feels_like, 1),
#         description=wmo_description(weather_code),
#         weather_code=weather_code,
#     )
# # ─────────────────────────────────────────────
# # Run directly (dev mode)
# # ─────────────────────────────────────────────
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

"""
main.py — AI Hydration Coach FastAPI Backend
=============================================
Production-level backend with:
  - PostgreSQL database (SQLAlchemy ORM)
  - ML model (GradientBoostingRegressor)
  - Modular routes (users, intake, predictions, weather)
Endpoints:
  GET  /                            → Health check
  GET  /docs                        → Swagger UI
  GET  /model/info                  → Model metadata
  POST /users/register              → Create user
  GET  /users/{id}                  → Get user
  PUT  /users/{id}                  → Update user
  DELETE /users/{id}                → Delete user
  POST /intake/log                  → Log water intake
  GET  /intake/{user_id}/today      → Today's summary
  GET  /intake/{user_id}/history    → 7-day history
  GET  /intake/{user_id}/logs       → All logs today
  POST /predictions/                → AI prediction (+ save to DB)
  GET  /predictions/{user_id}       → Prediction history
  GET  /predictions/{user_id}/latest → Latest prediction
  GET  /weather/{city}              → Live weather proxy
Run with:
  uvicorn main:app --reload --port 8000
"""
import os
import json
import httpx
import joblib
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
# Load .env
load_dotenv()
# ─────────────────────────────────────────────
# App Setup
# ─────────────────────────────────────────────
app = FastAPI(
    title="AI Hydration Coach API",
    description="""
## 💧 AI Hydration Coach — Production API
A **FastAPI** backend with:
- 🤖 **ML Model** — GradientBoostingRegressor (scikit-learn)
- 🗄️ **PostgreSQL** — Users, Water Intake, Predictions
- 🌤️ **Weather** — Open-Meteo API proxy
### Quick Start
1. `POST /users/register` — Create a user profile
2. `POST /predictions/` — Get AI water intake prediction (pass user_id to save)
3. `POST /intake/log` — Log water consumed
4. `GET /intake/{user_id}/today` — Check today's progress
5. `GET /intake/{user_id}/history` — See 7-day chart data
    """,
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)
# CORS — Allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # In production: ["https://yourdomain.com"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ─────────────────────────────────────────────
# Database Initialization
# ─────────────────────────────────────────────
from database import init_db, engine
from models import Base
@app.on_event("startup")
async def startup():
    """Initialize DB tables and load ML model on startup."""
    print("🚀 Starting AI Hydration Coach API v2.0.0")
    # Create all DB tables if they don't exist
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ PostgreSQL tables ready.")
    except Exception as e:
        print(f"⚠️  DB init failed: {e}")
    # Load ML model
    model_path = Path("model/hydration_model.pkl")
    if not model_path.exists():
        print("⚠️  Model not found — run: python3 train_model.py")
    else:
        print(f"✅ ML model loaded from {model_path}")
    info_path = Path("model/model_info.json")
    if info_path.exists():
        with open(info_path) as f:
            info = json.load(f)
        print(f"✅ Model info: R²={info.get('test_r2')}, MAE={info.get('test_mae')}L")
# ─────────────────────────────────────────────
# Register Routers
# ─────────────────────────────────────────────
from routes.users       import router as users_router
from routes.intake      import router as intake_router
from routes.predictions import router as predictions_router
app.include_router(users_router)
app.include_router(intake_router)
app.include_router(predictions_router)
# ─────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    """Health check — returns API status and model info."""
    model_loaded = Path("model/hydration_model.pkl").exists()
    model_info   = {}
    if Path("model/model_info.json").exists():
        with open("model/model_info.json") as f:
            model_info = json.load(f)
    return {
        "status":       "ok",
        "service":      "AI Hydration Coach API",
        "version":      "2.0.0",
        "model_loaded": model_loaded,
        "model_info":   model_info,
        "database":     "PostgreSQL (SQLAlchemy)",
        "docs":         "/docs",
    }
# ─────────────────────────────────────────────
# Model Info
# ─────────────────────────────────────────────
@app.get("/model/info", tags=["Model"])
async def get_model_info():
    """Returns ML model metadata — R², MAE, feature importances."""
    info_path = Path("model/model_info.json")
    if not info_path.exists():
        raise HTTPException(status_code=503, detail="Model info not found. Run train_model.py first.")
    with open(info_path) as f:
        return json.load(f)
# ─────────────────────────────────────────────
# Weather Proxy
# ─────────────────────────────────────────────
def wmo_description(code: int) -> str:
    if code == 0:            return "Clear sky"
    if code == 1:            return "Mainly clear"
    if code == 2:            return "Partly cloudy"
    if code == 3:            return "Overcast"
    if code in (45, 48):     return "Foggy"
    if code in (51, 53, 55): return "Drizzle"
    if code in (61, 63, 65): return "Rain"
    if code in (71, 73, 75): return "Snow"
    if code in (80, 81, 82): return "Rain showers"
    if code in (95, 96, 99): return "Thunderstorm"
    return "Unknown"
@app.get("/weather/{city}", tags=["Weather"])
async def get_weather(city: str):
    """
    Proxy to Open-Meteo + Geocoding API.
    Returns: temperature, humidity, feels_like, weather description.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Step 1: Geocode city → lat/lon
        geo = await client.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": city, "count": 1, "language": "en"},
        )
        geo_data = geo.json()
        if not geo_data.get("results"):
            raise HTTPException(status_code=404, detail=f"City '{city}' not found.")
        result    = geo_data["results"][0]
        lat       = result["latitude"]
        lon       = result["longitude"]
        city_name = result.get("name", city)
        # Step 2: Fetch weather
        wx = await client.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude":  lat,
                "longitude": lon,
                "current":   "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code",
                "timezone":  "auto",
            },
        )
        wx_data = wx.json()
        current = wx_data.get("current", {})
    return {
        "city":         city_name,
        "temperature":  round(current.get("temperature_2m", 25.0), 1),
        "humidity":     round(current.get("relative_humidity_2m", 50.0), 1),
        "feels_like":   round(current.get("apparent_temperature", 25.0), 1),
        "description":  wmo_description(current.get("weather_code", 0)),
        "weather_code": current.get("weather_code", 0),
    }
# ─────────────────────────────────────────────
# Run directly
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)