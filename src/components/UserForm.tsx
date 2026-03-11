import React, { useState, useEffect } from "react";
import { UserProfile } from "../services/api";
import { Droplets, User, Weight, Thermometer, MapPin, Activity, LogIn, Mail } from "lucide-react";
import { loadUserSession } from "../services/userApi";
import LoginModal from "./LoginModal";
import { DBUser } from "../services/userApi";
interface UserFormProps {
  onSubmit:       (profile: UserProfile) => void;
  onLoginSuccess: (user: DBUser) => void;
  loading: boolean;
}
const activityOptions = [
  { value: "sedentary", label: "Sedentary", desc: "Little or no exercise",    emoji: "🪑" },
  { value: "light",     label: "Light",     desc: "1–3 days/week",            emoji: "🚶" },
  { value: "moderate",  label: "Moderate",  desc: "3–5 days/week",            emoji: "🏃" },
  { value: "high",      label: "High",      desc: "6–7 days/week",            emoji: "💪" },
  { value: "extreme",   label: "Extreme",   desc: "Athlete / 2× daily",       emoji: "🏋️" },
];
export default function UserForm({ onSubmit, onLoginSuccess, loading }: UserFormProps) {
  const [form, setForm] = useState<UserProfile>({
    name:          "",
    email:         "",
    age:           25,
    weight:        70,
    gender:        "male",
    activityLevel: "moderate",
    city:          "",
  });
  const [errors, setErrors]                 = useState<Record<string, string>>({});
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [savedSession, setSavedSession]     = useState<ReturnType<typeof loadUserSession>>(null);
  useEffect(() => {
    const session = loadUserSession();
    setSavedSession(session);
    if (session) {
      setForm(f => ({
        ...f,
        name:          session.name,
        email:         session.email,
        age:           session.age,
        weight:        session.weight,
        gender:        session.gender as UserProfile["gender"],
        activityLevel: session.activityLevel as UserProfile["activityLevel"],
        city:          session.city || f.city,
      }));
    }
  }, []);
  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim())                       e.name   = "Please enter your name";
    if (!form.email.trim())                      e.email  = "Please enter your email";
    else if (!/\S+@\S+\.\S+/.test(form.email))  e.email  = "Please enter a valid email";
    if (form.age < 5 || form.age > 110)          e.age    = "Age must be between 5 and 110";
    if (form.weight < 20 || form.weight > 300)   e.weight = "Weight must be between 20 and 300 kg";
    if (!form.city.trim())                       e.city   = "Please enter your city";
    return e;
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    onSubmit(form);
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-900 flex items-center justify-center p-4">
      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLogin={(user: DBUser) => {
            setShowLoginModal(false);
            onLoginSuccess(user);
          }}
        />
      )}
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500 opacity-10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-400 opacity-10 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-cyan-400/20 border border-cyan-400/40 rounded-full mb-4 backdrop-blur-sm">
            <Droplets className="w-10 h-10 text-cyan-300" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">AI Hydration Coach</h1>
          <p className="text-cyan-200 text-lg">Personalized water intake powered by AI</p>
        </div>
        {/* Returning User Banner */}
        {savedSession ? (
          <div className="mb-4 bg-cyan-400/10 border border-cyan-400/30 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-cyan-300 text-sm font-semibold">👋 Welcome back, {savedSession.name}!</p>
              <p className="text-white/50 text-xs mt-0.5">Your profile is pre-filled below. Or login to restore your history.</p>
            </div>
            <button
              onClick={() => setShowLoginModal(true)}
              className="ml-3 flex items-center gap-1 bg-cyan-400/20 hover:bg-cyan-400/30 border border-cyan-400/40 text-cyan-300 text-xs font-semibold px-3 py-2 rounded-xl transition"
            >
              <LogIn className="w-3 h-3" /> Login
            </button>
          </div>
        ) : (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
            >
              <LogIn className="w-4 h-4 text-cyan-300" />
              Returning User? Login
            </button>
          </div>
        )}
        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl"
        >
          <h2 className="text-white text-xl font-semibold mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-300" />
            Your Profile
          </h2>
          {/* ── Name & Email ── */}
          <div className="grid grid-cols-1 gap-4 mb-4">
            {/* Name */}
            <div>
              <label className="text-cyan-200 text-sm font-medium mb-1 flex items-center gap-1 block">
                <User className="w-3.5 h-3.5" /> Full Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Gaurav Sharma"
                className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">⚠ {errors.name}</p>}
            </div>
            {/* Email */}
            <div>
              <label className="text-cyan-200 text-sm font-medium mb-1 flex items-center gap-1 block">
                <Mail className="w-3.5 h-3.5" /> Email Address
                <span className="text-white/30 text-xs ml-1">(used to retrieve your history)</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="e.g. gaurav@example.com"
                className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">⚠ {errors.email}</p>}
              <p className="text-white/30 text-xs mt-1">
                💡 You'll use this email to log back in and see your hydration history
              </p>
            </div>
          </div>
          {/* ── Age & Weight ── */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-cyan-200 text-sm font-medium mb-1 block">Age (years)</label>
              <input
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: +e.target.value })}
                className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                min={5}
                max={110}
              />
              {errors.age && <p className="text-red-400 text-xs mt-1">⚠ {errors.age}</p>}
            </div>
            <div>
              <label className="text-cyan-200 text-sm font-medium mb-1 block">Weight (kg)</label>
              <div className="relative">
                <input
                  type="number"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: +e.target.value })}
                  className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                  min={20}
                  max={300}
                />
                <Weight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              </div>
              {errors.weight && <p className="text-red-400 text-xs mt-1">⚠ {errors.weight}</p>}
            </div>
          </div>
          {/* ── Gender ── */}
          <div className="mb-4">
            <label className="text-cyan-200 text-sm font-medium mb-2 block">Gender</label>
            <div className="grid grid-cols-2 gap-3">
              {(["male", "female"] as const).map((g) => (
                <button
                  type="button"
                  key={g}
                  onClick={() => setForm({ ...form, gender: g })}
                  className={`py-3 rounded-xl border font-medium capitalize transition-all ${
                    form.gender === g
                      ? "bg-cyan-400 border-cyan-400 text-blue-950 shadow-lg shadow-cyan-400/30"
                      : "bg-white/10 border-white/30 text-white hover:bg-white/20"
                  }`}
                >
                  {g === "male" ? "♂ Male" : "♀ Female"}
                </button>
              ))}
            </div>
          </div>
          {/* ── Activity Level ── */}
          <div className="mb-4">
            <label className="text-cyan-200 text-sm font-medium mb-2 flex items-center gap-1 block">
              <Activity className="w-4 h-4" /> Activity Level
            </label>
            <div className="grid grid-cols-1 gap-2">
              {activityOptions.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setForm({ ...form, activityLevel: opt.value as UserProfile["activityLevel"] })}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                    form.activityLevel === opt.value
                      ? "bg-cyan-400 border-cyan-400 text-blue-950 shadow-lg shadow-cyan-400/20"
                      : "bg-white/10 border-white/30 text-white hover:bg-white/20"
                  }`}
                >
                  <span className="font-semibold flex items-center gap-2">
                    <span>{opt.emoji}</span> {opt.label}
                  </span>
                  <span className={`text-sm ${form.activityLevel === opt.value ? "text-blue-900" : "text-white/60"}`}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {/* ── City ── */}
          <div className="mb-6">
            <label className="text-cyan-200 text-sm font-medium mb-1 flex items-center gap-1 block">
              <MapPin className="w-4 h-4" /> City (for live weather)
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="e.g. Mumbai, Dubai, New York"
                className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
              />
              <Thermometer className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            </div>
            {errors.city && <p className="text-red-400 text-xs mt-1">⚠ {errors.city}</p>}
          </div>
          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-cyan-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Fetching weather & calculating...
              </>
            ) : (
              <>
                <Droplets className="w-5 h-5" />
                Generate My Hydration Plan
              </>
            )}
          </button>
        </form>
        {/* Bottom hint */}
        <p className="text-center text-white/30 text-xs mt-4">
          🔒 Your data is stored securely. Use your email to login next time.
        </p>
      </div>
    </div>
  );
}