"""
train_model.py — AI Hydration Coach
=====================================
Trains a Scikit-learn Gradient Boosting Regressor on synthetic hydration data.
Features used:
  - age
  - weight (kg)
  - gender (0=female, 1=male)
  - activity_level (0=sedentary, 1=light, 2=moderate, 3=high, 4=extreme)
  - temperature (°C)
  - humidity (%)
Target:
  - daily_water_liters (regression target)
Usage:
  python train_model.py
Output:
  model/hydration_model.pkl   — trained model pipeline
  model/model_info.json       — feature names, score, training stats
"""
import os
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, r2_score
# ─────────────────────────────────────────────
# 1. Generate Synthetic Training Data
# ─────────────────────────────────────────────
def generate_hydration_data(n_samples: int = 5000, seed: int = 42) -> pd.DataFrame:
    """
    Generates realistic synthetic hydration data using domain knowledge.
    Each row represents one person on one day.
    """
    rng = np.random.default_rng(seed)
    age          = rng.integers(10, 80, size=n_samples).astype(float)
    weight       = rng.uniform(35, 130, size=n_samples)
    gender       = rng.integers(0, 2, size=n_samples).astype(float)   # 0=female, 1=male
    activity     = rng.integers(0, 5, size=n_samples).astype(float)   # 0–4
    temperature  = rng.uniform(-5, 45, size=n_samples)
    humidity     = rng.uniform(10, 100, size=n_samples)
    # ── Deterministic formula (ground truth for ML to learn) ──
    # Base: 35 ml per kg
    base = weight * 0.035
    # Gender: male +5%, female −5%
    gender_mult = np.where(gender == 1, 1.05, 0.95)
    base = base * gender_mult
    # Age: young +10%, elderly −5%
    age_adj = np.where(age < 18, 1.10, np.where(age > 55, 0.95, 1.0))
    base = base * age_adj
    # Activity multipliers: 0→1.0, 1→1.15, 2→1.30, 3→1.50, 4→1.75
    activity_mult = np.array([1.0, 1.15, 1.30, 1.50, 1.75])
    base = base * activity_mult[activity.astype(int)]
    # Temperature additions
    temp_add = np.where(temperature >= 40, 1.0,
               np.where(temperature >= 35, 0.7,
               np.where(temperature >= 30, 0.5,
               np.where(temperature >= 25, 0.25,
               np.where(temperature < 10, -0.1, 0.0)))))
    base = base + temp_add
    # Humidity additions
    hum_add = np.where(humidity > 70, 0.2, np.where(humidity < 30, 0.1, 0.0))
    base = base + hum_add
    # Clip to safe range and add realistic noise
    noise = rng.normal(0, 0.1, size=n_samples)
    daily_water = np.clip(base + noise, 1.5, 5.0)
    daily_water = np.round(daily_water, 2)
    df = pd.DataFrame({
        "age":          age,
        "weight":       weight,
        "gender":       gender,
        "activity_level": activity,
        "temperature":  temperature,
        "humidity":     humidity,
        "daily_water_liters": daily_water,
    })
    return df
# ─────────────────────────────────────────────
# 2. Train the Model
# ─────────────────────────────────────────────
def train(n_samples: int = 5000):
    print("=" * 55)
    print("  AI Hydration Coach — Model Training")
    print("=" * 55)
    # Generate data
    print(f"\n[1/5] Generating {n_samples} synthetic training samples...")
    df = generate_hydration_data(n_samples=n_samples)
    print(f"      Dataset shape: {df.shape}")
    print(f"      Water range:   {df['daily_water_liters'].min():.2f}L – {df['daily_water_liters'].max():.2f}L")
    print(f"      Mean water:    {df['daily_water_liters'].mean():.2f}L")
    # Features / target
    FEATURES = ["age", "weight", "gender", "activity_level", "temperature", "humidity"]
    X = df[FEATURES]
    y = df["daily_water_liters"]
    # Train / test split
    print("\n[2/5] Splitting data (80% train / 20% test)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"      Train: {len(X_train)} | Test: {len(X_test)}")
    # Build pipeline
    print("\n[3/5] Building Gradient Boosting pipeline...")
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", GradientBoostingRegressor(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=5,
            min_samples_split=10,
            min_samples_leaf=5,
            subsample=0.8,
            random_state=42,
        )),
    ])
    # Train
    print("\n[4/5] Training model...")
    pipeline.fit(X_train, y_train)
    # Evaluate
    print("\n[5/5] Evaluating model...")
    y_pred = pipeline.predict(X_test)
    y_pred_clipped = np.clip(y_pred, 1.5, 5.0)
    mae  = mean_absolute_error(y_test, y_pred_clipped)
    r2   = r2_score(y_test, y_pred_clipped)
    cv   = cross_val_score(pipeline, X_train, y_train, cv=5, scoring="r2")
    print(f"\n  ✅ Test MAE  : {mae:.4f} L  (lower is better)")
    print(f"  ✅ Test R²   : {r2:.4f}     (1.0 = perfect)")
    print(f"  ✅ CV R² (5-fold): {cv.mean():.4f} ± {cv.std():.4f}")
    # Feature importances
    importances = pipeline.named_steps["model"].feature_importances_
    print("\n  Feature Importances:")
    for feat, imp in sorted(zip(FEATURES, importances), key=lambda x: -x[1]):
        bar = "█" * int(imp * 60)
        print(f"    {feat:<18} {imp:.4f}  {bar}")
    # Save model
    os.makedirs("model", exist_ok=True)
    model_path = "model/hydration_model.pkl"
    joblib.dump(pipeline, model_path)
    print(f"\n  💾 Model saved → {model_path}")
    # Save model metadata
    info = {
        "features":      FEATURES,
        "n_samples":     n_samples,
        "test_mae":      round(float(mae), 4),
        "test_r2":       round(float(r2), 4),
        "cv_r2_mean":    round(float(cv.mean()), 4),
        "cv_r2_std":     round(float(cv.std()), 4),
        "feature_importances": {f: round(float(i), 4) for f, i in zip(FEATURES, importances)},
        "model_type":    "GradientBoostingRegressor",
        "output_range":  [1.5, 5.0],
    }
    with open("model/model_info.json", "w") as f:
        json.dump(info, f, indent=2)
    print(f"  💾 Model info saved → model/model_info.json")
    print("\n" + "=" * 55)
    print("  Training Complete! ✅")
    print("=" * 55 + "\n")
    return pipeline, info
# ─────────────────────────────────────────────
# 3. Entry Point
# ─────────────────────────────────────────────
if __name__ == "__main__":
    train()
