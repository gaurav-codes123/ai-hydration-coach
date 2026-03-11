/**
 * api.ts — AI Hydration Coach
 * ============================
 * Calls the FastAPI + Scikit-learn backend for predictions.
 * Falls back to a built-in formula if the backend is offline.
 */
export interface UserProfile {
  name: string;
  email: string;
  age: number;
  weight: number;
  gender: "male" | "female";
  activityLevel: "sedentary" | "light" | "moderate" | "high" | "extreme";
  city: string;
}

export interface FactorDetail {
  factor: string;
  value: string;
  impact: string;
  description: string;
}
export interface HydrationPlan {
  dailyGoalLiters: number;
  drinkIntervalHours: number;
  reasons: string[];          // kept for backward compat (mapped from factors)
  tips: string[];
  factors: FactorDetail[];
  modelUsed: string;
  confidenceNote: string;
  source: "backend" | "fallback";
}
// ─── Backend URL ────────────────────────────────────────────────────────────
// Change this to your deployed backend URL in production.
// e.g. "https://hydration-api.onrender.com"
const BACKEND_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";// Main prediction function
// ─────────────────────────────────────────────
export async function predictHydration(
  profile: UserProfile,
  temperature: number,
  humidity: number,
  userId?: string | null
): Promise<HydrationPlan> {
  try {
    const plan = await predictFromBackend(profile, temperature, humidity, userId);
    return plan;
  } catch (err) {
    console.warn("⚠️  Backend unavailable — using fallback formula.", err);
    return predictFallback(profile, temperature, humidity);
  }
}
// ─────────────────────────────────────────────
// Backend prediction (FastAPI + Scikit-learn)
// ─────────────────────────────────────────────
async function predictFromBackend(
  profile: UserProfile,
  temperature: number,
  humidity: number,
  userId?: string | null
): Promise<HydrationPlan> {
  const payload = {
    age:            profile.age,
    weight:         profile.weight,
    gender:         profile.gender,
    activity_level: profile.activityLevel,
    temperature,
    humidity,
    ...(userId ? { user_id: userId } : {}),
  };
   const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/predictions/`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
      signal:  controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    throw new Error(`Backend returned ${res.status}`);
  }

  const data = await res.json();
  // Map snake_case backend response → camelCase frontend interface
  const factors: FactorDetail[] = (data.factors ?? []).map((f: any) => ({
    factor:      f.factor,
    value:       f.value,
    impact:      f.impact,
    description: f.description,
  }));
  // Build legacy `reasons` array from factors for backward-compat components
  const reasons = factors.map(
    (f) => `${f.factor}: ${f.value} — ${f.description}`
  );
  return {
    dailyGoalLiters:    data.daily_goal_liters,
    drinkIntervalHours: data.drink_interval_hours,
    factors,
    reasons,
    tips:           data.tips ?? [],
    modelUsed:      data.model_used ?? "GradientBoostingRegressor",
    confidenceNote: data.confidence_note ?? "",
    source:         "backend",
  };
}
// ─────────────────────────────────────────────
// Fallback prediction (runs in browser, no backend needed)
// Mirrors the Scikit-learn training formula exactly.
// ─────────────────────────────────────────────
function predictFallback(
  profile: UserProfile,
  temperature: number,
  humidity: number
): HydrationPlan {
  // Base: 35ml per kg
  let base = profile.weight * 0.035;
  // Gender
  base *= profile.gender === "male" ? 1.05 : 0.95;
  // Age
  if (profile.age < 18) base *= 1.1;
  else if (profile.age > 55) base *= 0.95;
  // Activity
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.0,
    light:     1.15,
    moderate:  1.30,
    high:      1.50,
    extreme:   1.75,
  };
  base *= activityMultipliers[profile.activityLevel] ?? 1.0;
  // Temperature
  if      (temperature >= 40) base += 1.0;
  else if (temperature >= 35) base += 0.7;
  else if (temperature >= 30) base += 0.5;
  else if (temperature >= 25) base += 0.25;
  else if (temperature < 10)  base -= 0.1;
  // Humidity
  if      (humidity > 70) base += 0.2;
  else if (humidity < 30) base += 0.1;
  // Clamp & round
  base = Math.max(1.5, Math.min(5.0, base));
  base = Math.round(base * 10) / 10;
  // Drink interval
  const glasses  = Math.max(1, Math.ceil((base * 1000) / 250));
  const interval = Math.round((16 / glasses) * 2) / 2;
  // Factors breakdown
  const factors: FactorDetail[] = [
    {
      factor:      "Temperature",
      value:       `${temperature}°C`,
      impact:      temperature >= 30 ? `+${temperature >= 40 ? "1.0" : temperature >= 35 ? "0.7" : "0.5"}L (hot)` : "neutral",
      description: "High temperatures increase sweating and fluid loss.",
    },
    {
      factor:      "Humidity",
      value:       `${humidity}%`,
      impact:      humidity > 70 ? "+0.2L (high)" : humidity < 30 ? "+0.1L (low)" : "neutral",
      description: "Low humidity dries airways; high humidity slows cooling.",
    },
    {
      factor:      "Activity Level",
      value:       profile.activityLevel.charAt(0).toUpperCase() + profile.activityLevel.slice(1),
      impact:      `×${activityMultipliers[profile.activityLevel]} multiplier`,
      description: ACTIVITY_REASONS[profile.activityLevel],
    },
    {
      factor:      "Body Weight",
      value:       `${profile.weight} kg`,
      impact:      `Base ${(profile.weight * 0.035).toFixed(2)}L (35ml/kg)`,
      description: "Larger body mass requires more water for metabolic functions.",
    },
    {
      factor:      "Age",
      value:       `${profile.age} years`,
      impact:      profile.age < 18 ? "+10% (youth)" : profile.age > 55 ? "−5% (senior)" : "neutral",
      description: AGE_REASON(profile.age),
    },
    {
      factor:      "Gender",
      value:       profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1),
      impact:      profile.gender === "male" ? "+5% (male)" : "−5% (female)",
      description: "Biological differences in muscle mass affect hydration needs.",
    },
  ];
  const reasons = factors.map(
    (f) => `${f.factor}: ${f.value} — ${f.description}`
  );
  const tips: string[] = [
    `Drink ~250ml every ${interval} hour(s) throughout your 16-hour day.`,
    "Start your morning with 500ml of water immediately after waking.",
  ];
  if (["high", "extreme"].includes(profile.activityLevel)) {
    tips.push("Drink 500ml 30 min before exercise and replace every 20 min during.");
    tips.push("Consider electrolyte drinks for sessions longer than 60 minutes.");
  } else {
    tips.push("Drink 250ml before each meal to stay on track.");
  }
  if (temperature >= 30) {
    tips.push(`At ${temperature}°C, carry a water bottle at all times.`);
  } else if (temperature < 15) {
    tips.push("Warm herbal teas and soups count toward your daily intake.");
  }
  if (humidity > 70) tips.push("High humidity — hydrate proactively before feeling thirsty.");
  if (humidity < 30) tips.push("Dry air increases moisture loss — sip water regularly.");
  if (profile.age > 55) tips.push("Set hourly reminders — older adults often underestimate thirst.");
  tips.push("Eat water-rich foods: cucumber (96%), watermelon (92%), oranges (86%).");
  tips.push("Urine should be pale yellow — dark yellow = drink more now.");
  return {
    dailyGoalLiters:    base,
    drinkIntervalHours: interval,
    factors,
    reasons,
    tips,
    modelUsed:      "Built-in formula (backend offline)",
    confidenceNote: "Using evidence-based hydration formula — connect backend for ML prediction.",
    source:         "fallback",
  };
}
// ─────────────────────────────────────────────
// Check if the backend is reachable
// ─────────────────────────────────────────────
export async function checkBackendStatus(): Promise<{
  online: boolean;
  modelLoaded: boolean;
  modelR2?: number;
  modelMAE?: number;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    let res: Response;
    try {
      res = await fetch(`${BACKEND_URL}/`, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) return { online: false, modelLoaded: false };
    const data = await res.json();
    // Optionally fetch model info
    let modelR2: number | undefined;
    let modelMAE: number | undefined;
    try {
      const infoRes = await fetch(`${BACKEND_URL}/model/info`);
      if (infoRes.ok) {
        const info = await infoRes.json();
        modelR2  = info.test_r2;
        modelMAE = info.test_mae;
      }
    } catch {/* ignore */}
    return {
      online:      true,
      modelLoaded: data.model_loaded ?? false,
      modelR2,
      modelMAE,
    };
  } catch {
    return { online: false, modelLoaded: false };
  }
}
// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const ACTIVITY_REASONS: Record<string, string> = {
  sedentary: "Minimal physical activity, low sweat loss.",
  light:     "Light walking or desk job with occasional movement.",
  moderate:  "Regular exercise 3–5 days/week.",
  high:      "Intense daily training increases fluid loss significantly.",
  extreme:   "Athlete-level exertion demands maximum hydration.",
};
function AGE_REASON(age: number): string {
  if (age < 18) return "Younger bodies have faster metabolism and higher water turnover.";
  if (age > 55) return "Older adults may underestimate thirst; monitoring is important.";
  return "Standard adult metabolic water needs.";
}