-- ============================================================
-- init.sql — AI Hydration Coach Database Schema
-- ============================================================
-- Run this to manually create tables (SQLAlchemy auto-creates
-- them on startup, but this is useful for reference/migration).
--
-- Usage:
--   psql -U hydration_user -d hydration_db -f init.sql
-- ============================================================
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- ─────────────────────────────────────────────
-- 1. Users Table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100)    NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    weight          FLOAT           NOT NULL,           -- in kg
    age             INTEGER         NOT NULL,
    gender          VARCHAR(10)     NOT NULL,           -- 'male' | 'female'
    activity_level  VARCHAR(20)     NOT NULL,           -- sedentary → extreme
    city            VARCHAR(100),                       -- for weather fetching
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
COMMENT ON TABLE  users                 IS 'Registered user profiles';
COMMENT ON COLUMN users.weight          IS 'Body weight in kilograms';
COMMENT ON COLUMN users.activity_level  IS 'One of: sedentary, light, moderate, high, extreme';
COMMENT ON COLUMN users.city            IS 'City name used for live weather fetching';
-- ─────────────────────────────────────────────
-- 2. Water Intake Table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS water_intake (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_ml   INTEGER         NOT NULL,               -- e.g. 250, 500, 1000
    date        DATE            NOT NULL DEFAULT CURRENT_DATE,
    time        TIME            NOT NULL DEFAULT CURRENT_TIME,
    notes       VARCHAR(255),                           -- optional e.g. 'After workout'
    created_at  TIMESTAMPTZ     DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_intake_user_id   ON water_intake(user_id);
CREATE INDEX IF NOT EXISTS idx_intake_date      ON water_intake(date);
CREATE INDEX IF NOT EXISTS idx_intake_user_date ON water_intake(user_id, date);
COMMENT ON TABLE  water_intake            IS 'Individual water intake log entries';
COMMENT ON COLUMN water_intake.amount_ml  IS 'Amount of water consumed in milliliters';
COMMENT ON COLUMN water_intake.notes      IS 'Optional note about the intake entry';
-- ─────────────────────────────────────────────
-- 3. Predictions Table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recommended_water   FLOAT           NOT NULL,       -- in liters e.g. 3.2
    temperature         FLOAT,                          -- °C at time of prediction
    humidity            FLOAT,                          -- % at time of prediction
    activity_level      VARCHAR(20)     NOT NULL,
    model_used          VARCHAR(100),                   -- e.g. 'GradientBoostingRegressor'
    confidence_note     TEXT,                           -- R², MAE note
    drink_interval      FLOAT,                          -- hours between drinks
    date                DATE            NOT NULL DEFAULT CURRENT_DATE,
    created_at          TIMESTAMPTZ     DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id   ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_date      ON predictions(date);
CREATE INDEX IF NOT EXISTS idx_predictions_user_date ON predictions(user_id, date);
COMMENT ON TABLE  predictions                     IS 'AI model predictions for daily water intake';
COMMENT ON COLUMN predictions.recommended_water   IS 'Recommended daily water intake in liters';
COMMENT ON COLUMN predictions.model_used          IS 'Name of the ML model used for prediction';
COMMENT ON COLUMN predictions.drink_interval      IS 'Suggested hours between each drink';
-- ─────────────────────────────────────────────
-- Sample Queries
-- ─────────────────────────────────────────────
-- Get today's total intake for a user:
-- SELECT SUM(amount_ml) FROM water_intake
-- WHERE user_id = '<uuid>' AND date = CURRENT_DATE;
-- Get 7-day history:
-- SELECT date, SUM(amount_ml) as total_ml
-- FROM water_intake
-- WHERE user_id = '<uuid>' AND date >= CURRENT_DATE - INTERVAL '6 days'
-- GROUP BY date ORDER BY date;
-- Get latest prediction:
-- SELECT * FROM predictions
-- WHERE user_id = '<uuid>'
-- ORDER BY created_at DESC LIMIT 1;