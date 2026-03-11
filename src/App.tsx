

import { useState, useEffect } from "react";
import UserForm from "./components/UserForm";
import Dashboard from "./components/Dashboard";
import { predictHydration } from "./services/api";
import { fetchWeatherByCity } from "./services/weather";

import type { UserProfile, HydrationPlan } from "./services/api";
import type { WeatherData } from "./services/weather";
import {
  registerUser,
  isBackendOnline,
  saveUserSession,
  loadUserSession,
  clearUserSession,
  getTodayIntake,

} from "./services/userApi";
import type { DBUser } from "./services/userApi";
type AppState = "form" | "dashboard";
interface ErrorState {
  message: string;
}
export default function App() {
  const [appState, setAppState]           = useState<AppState>("form");
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<ErrorState | null>(null);
  const [profile, setProfile]             = useState<UserProfile | null>(null);
  const [plan, setPlan]                   = useState<HydrationPlan | null>(null);
  const [weather, setWeather]             = useState<WeatherData | null>(null);
  const [userId, setUserId]               = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [initialConsumed, setInitialConsumed] = useState<number>(0);
  // ─── On mount: restore userId from localStorage if available ─────────────────
  useEffect(() => {
    const session = loadUserSession();
    if (session) {
      setUserId(session.userId);
    }
  }, []);
  // ─── Handle Returning User Login (via email lookup) ──────────────────────────
  async function handleLoginSuccess(user: DBUser) {
    setLoading(true);
    setError(null);
    try {
      // Save session to localStorage
      saveUserSession(user);
      setUserId(user.id);
      // Rebuild UserProfile from DB record
      const restoredProfile: UserProfile = {
        name:          user.name,
        email:         user.email,
        age:           user.age,
        weight:        user.weight,
        gender:        user.gender as UserProfile["gender"],
        activityLevel: user.activity_level as UserProfile["activityLevel"],
        city:          user.city ?? "London",
      };
      // Check backend status
      const online = await isBackendOnline();
      setBackendOnline(online);
      // Fetch current weather for their city
      const weatherData = await fetchWeatherByCity(restoredProfile.city);
      // Get fresh AI prediction
     const hydrationPlan = await predictHydration(
        restoredProfile,
        weatherData.temperature,
        weatherData.humidity,
        user.id
      );
      // ✅ Fetch today's existing intake from DB so progress is restored
      try {
        const todaySummary = await getTodayIntake(user.id);
        setInitialConsumed(todaySummary.total_ml); // restore real consumed value
        console.log(`✅ Restored today's intake: ${todaySummary.total_ml}ml`);
      } catch {
        setInitialConsumed(0);
      }
      setProfile(restoredProfile);
      setWeather(weatherData);
      setPlan(hydrationPlan);
      setAppState("dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to restore session.";
      setError({ message: msg });
    } finally {
      setLoading(false);
    }
  }
  // ─── Handle New User Form Submit ──────────────────────────────────────────────
  async function handleFormSubmit(userProfile: UserProfile) {
    setLoading(true);
    setError(null);
    try {
      // 1️⃣ Fetch live weather
      const weatherData = await fetchWeatherByCity(userProfile.city);
      // 2️⃣ Check if backend is online
      const online = await isBackendOnline();
      setBackendOnline(online);
      // 3️⃣ Register user in PostgreSQL (if backend online)
      let registeredUserId: string | null = null;
      if (online) {
        try {
         const dbUser = await registerUser({
            name:           userProfile.name,
            email:          userProfile.email.trim().toLowerCase(), // always lowercase
            weight:         userProfile.weight,
            age:            userProfile.age,
            gender:         userProfile.gender,
            activity_level: userProfile.activityLevel,
            city:           userProfile.city,
          });
          registeredUserId = dbUser.id;
          setUserId(dbUser.id);
          // Save session so returning user can login with email next time
          saveUserSession(dbUser);
          console.log("✅ User registered & session saved:", dbUser.id);
        } catch (dbErr) {
          console.warn("⚠️ DB registration failed (non-fatal):", dbErr);
        }
      } else {
        console.warn("⚠️ Backend offline — using localStorage fallback");
      }
      // 4️⃣ Get AI prediction — passes userId so backend auto-saves it
   const hydrationPlan = await predictHydration(
        userProfile,
        weatherData.temperature,
        weatherData.humidity,
        registeredUserId
      );
      // ✅ Fetch today's existing intake from DB (handles re-login same day)
      if (registeredUserId && online) {
        try {
          const todaySummary = await getTodayIntake(registeredUserId);
          setInitialConsumed(todaySummary.total_ml);
          console.log(`✅ Today's existing intake: ${todaySummary.total_ml}ml`);
        } catch {
          setInitialConsumed(0);
        }
      } else {
        setInitialConsumed(0);
      }
      setProfile(userProfile);
      setWeather(weatherData);
      setPlan(hydrationPlan);
      setAppState("dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError({ message: msg });
    } finally {
      setLoading(false);
    }
  }
  // ─── Reset / Logout ───────────────────────────────────────────────────────────
 function handleReset() {
    clearUserSession();
    setAppState("form");
    setProfile(null);
    setPlan(null);
    setWeather(null);
    setUserId(null);
    setError(null);
    setBackendOnline(false);
    setInitialConsumed(0);
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  if (appState === "dashboard" && profile && plan && weather) {
   return (
      <Dashboard
        profile={profile}
        plan={plan}
        weather={weather}
        userId={userId}
        backendOnline={backendOnline}
        initialConsumed={initialConsumed}
        onReset={handleReset}
      />
    );
  }
  return (
    <div>
      {/* Error toast */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 border border-red-400 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 max-w-sm w-full mx-4">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-semibold text-sm">Error</p>
            <p className="text-xs text-red-100">{error.message}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-200 hover:text-white text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}
      <UserForm
        onSubmit={handleFormSubmit}
        onLoginSuccess={handleLoginSuccess}
        loading={loading}
      />
    </div>
  );
}