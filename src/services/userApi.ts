/**
 * userApi.ts — Database API Service
 * ===================================
 * Handles all communication with the FastAPI + PostgreSQL backend:
 *  - User registration & profile management
 *  - Water intake logging
 *  - Hydration history fetching
 *  - Prediction saving
 */
const BACKEND_URL: string = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";
// ─── Types ────────────────────────────────────────────────────────────────────
export interface DBUser {
  id: string;
  name: string;
  email: string;
  weight: number;
  age: number;
  gender: string;
  activity_level: string;
  city: string;
  created_at: string;
}
export interface IntakeLog {
  id: string;
  user_id: string;
  amount_ml: number;
  date: string;
  time: string;
  notes?: string;
}
export interface IntakeSummary {
  date: string;
  total_ml: number;
  total_liters: number;
  log_count: number;
  daily_goal_ml: number | null;
  percentage: number | null;
}
export interface IntakeHistory {
  date: string;
  day_label: string;
  total_ml: number;
  total_liters: number;
  goal_ml: number | null;
  goal_reached: boolean;
}
export interface SavedPrediction {
  id: string;
  user_id: string;
  recommended_water: number;
  temperature: number;
  humidity: number;
  activity_level: string;
  model_used: string;
  date: string;
}
// ─── Helper ───────────────────────────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options?: RequestInit,
  timeoutMs = 8000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail ?? `HTTP ${res.status}`);
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}
// ─── User API ─────────────────────────────────────────────────────────────────
/**
 * Register a new user in PostgreSQL.
 * Returns the created user with their UUID.
 */
export async function registerUser(payload: {
  name: string;
  email: string;
  weight: number;
  age: number;
  gender: string;
  activity_level: string;
  city: string;
}): Promise<DBUser> {
  return apiFetch<DBUser>("/users/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
/**
 * Get existing user by ID.
 */
export async function getUser(userId: string): Promise<DBUser> {
  return apiFetch<DBUser>(`/users/${userId}`);
}
/**
 * Get user by email — used for returning user login.
 */
export async function getUserByEmail(email: string): Promise<DBUser> {
  const normalized = email.trim().toLowerCase();
  return apiFetch<DBUser>(`/users/by-email?email=${encodeURIComponent(normalized)}`);
}
/**
 * Save user session to localStorage.
 */
export function saveUserSession(user: DBUser): void {
  localStorage.setItem("hydration_user_id",    user.id);
  localStorage.setItem("hydration_user_email",  user.email.trim().toLowerCase()); // always lowercase
  localStorage.setItem("hydration_user_name",   user.name);
  localStorage.setItem("hydration_user_city",   user.city ?? "");
  localStorage.setItem("hydration_user_weight", String(user.weight));
  localStorage.setItem("hydration_user_age",    String(user.age));
  localStorage.setItem("hydration_user_gender", user.gender);
  localStorage.setItem("hydration_user_activity", user.activity_level);
}
/**
 * Load saved user session from localStorage.
 * Returns null if no session found.
 */
export function loadUserSession(): { userId: string; email: string; name: string; city: string; weight: number; age: number; gender: string; activityLevel: string } | null {
  const userId = localStorage.getItem("hydration_user_id");
  const email  = localStorage.getItem("hydration_user_email");
  const name   = localStorage.getItem("hydration_user_name");
  if (!userId || !email || !name) return null;
  return {
    userId,
    email,
    name,
    city:          localStorage.getItem("hydration_user_city")     ?? "",
    weight:        Number(localStorage.getItem("hydration_user_weight") ?? 70),
    age:           Number(localStorage.getItem("hydration_user_age")    ?? 25),
    gender:        localStorage.getItem("hydration_user_gender")   ?? "male",
    activityLevel: localStorage.getItem("hydration_user_activity") ?? "moderate",
  };
}
/**
 * Clear user session from localStorage (logout).
 */
export function clearUserSession(): void {
  ["hydration_user_id","hydration_user_email","hydration_user_name",
   "hydration_user_city","hydration_user_weight","hydration_user_age",
   "hydration_user_gender","hydration_user_activity"].forEach(k => localStorage.removeItem(k));
}
// ─── Intake API ───────────────────────────────────────────────────────────────
/**
 * Log a water intake entry to PostgreSQL.
 */
export async function logIntake(payload: {
  user_id: string;
  amount_ml: number;
  notes?: string;
}): Promise<IntakeLog> {
  return apiFetch<IntakeLog>("/intake/log", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
/**
 * Get today's total water intake summary for a user.
 */
export async function getTodayIntake(userId: string): Promise<IntakeSummary> {
  return apiFetch<IntakeSummary>(`/intake/${userId}/today`);
}
/**
 * Get 7-day water intake history for the chart.
 */
export async function getIntakeHistory(
  userId: string,
  days = 7
): Promise<IntakeHistory[]> {
  return apiFetch<IntakeHistory[]>(`/intake/${userId}/history?days=${days}`);
}
// ─── Prediction API ───────────────────────────────────────────────────────────
/**
 * Save the AI prediction result to PostgreSQL.
 */
export async function savePrediction(payload: {
  user_id: string;
  recommended_water: number;
  temperature: number;
  humidity: number;
  activity_level: string;
  model_used: string;
}): Promise<SavedPrediction> {
  return apiFetch<SavedPrediction>("/predictions/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
/**
 * Get prediction history for a user.
 */
export async function getPredictionHistory(
  userId: string
): Promise<SavedPrediction[]> {
  return apiFetch<SavedPrediction[]>(`/predictions/${userId}`);
}
// ─── Backend Health ───────────────────────────────────────────────────────────
export async function isBackendOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}