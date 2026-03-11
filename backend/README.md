<!-- # 🚰 AI Hydration Coach — Python Backend
A **FastAPI + Scikit-learn** backend that predicts personalized daily water intake
using a trained **Gradient Boosting Regressor** model.
---
## 📁 Folder Structure
```
backend/
├── main.py               ← FastAPI server (all endpoints)
├── train_model.py        ← Training script (generates .pkl)
├── requirements.txt      ← Python dependencies
├── README.md             ← You are here
└── model/                ← Auto-created after training
    ├── hydration_model.pkl   ← Trained ML model
    └── model_info.json       ← Model metadata & scores
```
---
## ⚙️ Setup Instructions
### 1. Create a virtual environment
```bash
cd backend
python -m venv venv
# Activate (Linux/macOS)
source venv/bin/activate
# Activate (Windows)
venv\Scripts\activate
```
### 2. Install dependencies
```bash
pip install -r requirements.txt
```
### 3. Train the model
```bash
python train_model.py
```
**Expected output:**
```
=======================================================
  AI Hydration Coach — Model Training
=======================================================
[1/5] Generating 5000 synthetic training samples...
      Dataset shape: (5000, 7)
      Water range:   1.50L – 5.00L
      Mean water:    2.68L
[2/5] Splitting data (80% train / 20% test)...
      Train: 4000 | Test: 1000
[3/5] Building Gradient Boosting pipeline...
[4/5] Training model...
[5/5] Evaluating model...
  ✅ Test MAE  : 0.0312 L
  ✅ Test R²   : 0.9981
  ✅ CV R² (5-fold): 0.9979 ± 0.0008
  Feature Importances:
    weight             0.4521  ████████████████████████████
    activity_level     0.2834  █████████████████
    temperature        0.1423  ████████
    age                0.0612  ████
    humidity           0.0384  ██
    gender             0.0226  █
  💾 Model saved → model/hydration_model.pkl
  💾 Model info saved → model/model_info.json
=======================================================
  Training Complete! ✅
=======================================================
```
### 4. Start the API server
```bash
# Development (auto-reload on file changes)
uvicorn main:app --reload --port 8000
# Production (multi-worker)
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```
Server starts at: **http://localhost:8000**
---
## 📡 API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/` | Health check |
| `GET`  | `/docs` | Interactive Swagger UI |
| `GET`  | `/redoc` | ReDoc documentation |
| `GET`  | `/model/info` | Model metadata & scores |
| `POST` | `/predict` | Predict daily water intake |
| `POST` | `/predict/batch` | Batch predictions |
| `GET`  | `/weather/{city}` | Fetch live weather for a city |
---
## 🔬 POST /predict — Example
**Request:**
```json
{
  "age": 28,
  "weight": 75,
  "gender": "male",
  "activity_level": "high",
  "temperature": 34,
  "humidity": 65
}
```
**Response:**
```json
{
  "daily_goal_liters": 3.4,
  "drink_interval_hours": 1.1,
  "factors": [
    {
      "factor": "Temperature",
      "value": "34°C",
      "impact": "+0.5L (hot)",
      "description": "High temperatures increase sweating and fluid loss."
    },
    {
      "factor": "Activity Level",
      "value": "High",
      "impact": "×1.5 multiplier",
      "description": "Intense daily training increases fluid loss significantly."
    },
    ...
  ],
  "tips": [
    "Drink ~250ml every 1.1 hour(s) throughout your 16-hour day.",
    "Start your morning with 500ml of water immediately after waking.",
    "Drink 500ml 30 minutes before exercise..."
  ],
  "model_used": "GradientBoostingRegressor (scikit-learn)",
  "confidence_note": "Model R²=0.9981, MAE=0.0312L on test set."
}
```
---
## 🤖 ML Model Details
| Property | Value |
|----------|-------|
| **Algorithm** | Gradient Boosting Regressor |
| **Library** | Scikit-learn |
| **Training samples** | 5,000 (synthetic) |
| **Features** | age, weight, gender, activity_level, temperature, humidity |
| **Target** | daily_water_liters (1.5L – 5.0L) |
| **Test R²** | ~0.998 |
| **Test MAE** | ~0.03L |
| **Pipeline** | StandardScaler → GradientBoostingRegressor |
### Training Data Formula
The synthetic data is generated using evidence-based clinical hydration guidelines:
```
base = weight × 0.035 L/kg
     × gender_multiplier    (male 1.05, female 0.95)
     × age_adjustment       (youth 1.10, senior 0.95, adult 1.0)
     × activity_multiplier  (sedentary 1.0 → extreme 1.75)
     + temperature_addition  (0 → +1.0L depending on heat)
     + humidity_addition     (low/high humidity +0.1–0.2L)
     + gaussian_noise (σ=0.1)
```
Clipped to **[1.5L, 5.0L]** — the clinically safe range.
---
## 🌐 Frontend Integration
The React frontend calls this API via `src/services/api.ts`.
When the backend is **running** (`http://localhost:8000`):
- The frontend sends user profile + weather data to `/predict`
- The response includes `daily_goal_liters`, `factors`, and `tips`
When the backend is **offline**:
- The frontend falls back to its built-in mathematical formula
- The UI shows a subtle "Offline Mode" badge
---
## 🔒 Production Notes
- Replace `allow_origins=["*"]` with your actual frontend domain in `main.py`
- Use a reverse proxy (Nginx) in front of Uvicorn
- Consider rate-limiting with `slowapi`
- Deploy on: **Railway, Render, Fly.io, or AWS EC2** -->


# 💧 AI Hydration Coach — Backend API v2.0
FastAPI + PostgreSQL + Scikit-learn ML backend.
---
## 🏗️ Architecture
```
backend/
├── main.py           ← FastAPI app entry point + startup + weather proxy
├── database.py       ← SQLAlchemy engine + session + get_db dependency
├── models.py         ← ORM table definitions (Users, WaterIntake, Predictions)
├── schemas.py        ← Pydantic request/response shapes
├── train_model.py    ← ML model training script
├── requirements.txt  ← Python dependencies
├── .env              ← Environment variables (DO NOT commit)
├── model/
│   ├── hydration_model.pkl   ← Trained ML model (generated)
│   └── model_info.json       ← R², MAE, feature importances (generated)
└── routes/
    ├── __init__.py
    ├── users.py       ← User CRUD endpoints
    ├── intake.py      ← Water intake logging endpoints
    └── predictions.py ← AI prediction endpoints
```
---
## 🚀 Quick Start
### 1. Activate virtual environment
```bash
cd backend
source venv/bin/activate
```
### 2. Install dependencies
```bash
pip install -r requirements.txt
```
### 3. Set up .env
```bash
# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://hydration_user:hydration123@localhost:5432/hydration_db
ENVIRONMENT=development
EOF
```
### 4. Train the ML model
```bash
python3 train_model.py
# Output:
# ✅ Training complete!
# 📊 Test R²  : 0.998
# 📉 Test MAE : 0.03L
# 💾 Model saved to model/hydration_model.pkl
```
### 5. Start the API server
```bash
uvicorn main:app --reload --port 8000
```
### 6. Open Swagger UI
```
http://localhost:8000/docs
```
---
## 🗄️ Database Tables
### `users`
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| name | VARCHAR(100) | Full name |
| email | VARCHAR(255) | Unique email |
| weight | FLOAT | Weight in kg |
| age | INTEGER | Age in years |
| gender | VARCHAR(10) | male / female |
| activity_level | VARCHAR(20) | sedentary → extreme |
| city | VARCHAR(100) | For weather fetch |
| created_at | TIMESTAMPTZ | Auto timestamp |
### `water_intake`
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| amount_ml | INTEGER | e.g. 250, 500, 1000 |
| date | DATE | Auto today |
| time | TIME | Auto now |
| notes | VARCHAR(255) | Optional note |
### `predictions`
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| recommended_water | FLOAT | In liters |
| temperature | FLOAT | °C at prediction time |
| humidity | FLOAT | % at prediction time |
| activity_level | VARCHAR(20) | Input activity level |
| model_used | VARCHAR(100) | ML model name |
| drink_interval | FLOAT | Hours between drinks |
| date | DATE | Auto today |
---
## 📡 API Endpoints
### Health
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Health check + model info |
| GET | `/docs` | Swagger UI |
| GET | `/model/info` | R², MAE, feature importances |
### Users
| Method | Endpoint | Description |
|---|---|---|
| POST | `/users/register` | Create new user |
| GET | `/users/{id}` | Get user profile |
| PUT | `/users/{id}` | Update user |
| DELETE | `/users/{id}` | Delete user |
| GET | `/users/` | List all users |
### Water Intake
| Method | Endpoint | Description |
|---|---|---|
| POST | `/intake/log` | Log water intake |
| GET | `/intake/{user_id}/today` | Today's summary + % of goal |
| GET | `/intake/{user_id}/history` | 7-day chart data |
| GET | `/intake/{user_id}/logs` | All logs for today |
| DELETE | `/intake/log/{log_id}` | Delete a log entry |
### Predictions
| Method | Endpoint | Description |
|---|---|---|
| POST | `/predictions/` | Run ML prediction (+ save if user_id given) |
| GET | `/predictions/{user_id}` | Prediction history |
| GET | `/predictions/{user_id}/latest` | Latest prediction |
| POST | `/predictions/batch` | Batch predictions |
### Weather
| Method | Endpoint | Description |
|---|---|---|
| GET | `/weather/{city}` | Live weather proxy |
---
## 📋 Example: Full User Flow
### Step 1 — Register User
```bash
curl -X POST http://localhost:8000/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gaurav",
    "email": "gaurav@example.com",
    "weight": 75,
    "age": 28,
    "gender": "male",
    "activity_level": "high",
    "city": "Mumbai"
  }'
```
### Step 2 — Get AI Prediction (saves to DB)
```bash
curl -X POST http://localhost:8000/predictions/ \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "<uuid-from-step-1>",
    "age": 28,
    "weight": 75,
    "gender": "male",
    "activity_level": "high",
    "temperature": 34,
    "humidity": 65
  }'
```
### Step 3 — Log Water Intake
```bash
curl -X POST http://localhost:8000/intake/log \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "<uuid>",
    "amount_ml": 500,
    "notes": "After workout"
  }'
```
### Step 4 — Check Today's Progress
```bash
curl http://localhost:8000/intake/<uuid>/today
# Returns: { total_ml, total_liters, daily_goal_ml, percentage }
```
### Step 5 — Get 7-Day History (for chart)
```bash
curl http://localhost:8000/intake/<uuid>/history
# Returns: array of { date, day_label, total_ml, goal_reached }
```
