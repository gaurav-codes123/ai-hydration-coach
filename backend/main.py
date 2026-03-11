"""
main.py — AI Hydration Coach FastAPI Backend (Production)
"""
import os
import json
import httpx
import joblib
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
# Load .env (local dev only — Render uses env vars directly)
load_dotenv()
# ─────────────────────────────────────────────
# App Setup
# ─────────────────────────────────────────────
app = FastAPI(
    title="AI Hydration Coach API",
    description="FastAPI + PostgreSQL + ML backend for AI Hydration Coach",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)
# ─────────────────────────────────────────────
# CORS — Allow Vercel frontend + localhost
# ─────────────────────────────────────────────
raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
)
ALLOWED_ORIGINS = [o.strip() for o in raw_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ─────────────────────────────────────────────
# Database Initialization
# ─────────────────────────────────────────────
from database import engine
from models import Base
@app.on_event("startup")
async def startup():
    print("🚀 Starting AI Hydration Coach API v2.0.0")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ PostgreSQL tables ready.")
    except Exception as e:
        print(f"⚠️  DB init failed: {e}")
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
        "database":     "PostgreSQL (Neon)",
        "docs":         "/docs",
    }
# ─────────────────────────────────────────────
# Model Info
# ─────────────────────────────────────────────
@app.get("/model/info", tags=["Model"])
async def get_model_info():
    info_path = Path("model/model_info.json")
    if not info_path.exists():
        raise HTTPException(status_code=503, detail="Model info not found.")
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
    async with httpx.AsyncClient(timeout=10.0) as client:
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
# Run directly (local dev)
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)