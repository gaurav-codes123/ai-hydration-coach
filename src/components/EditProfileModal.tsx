/**
 * EditProfileModal.tsx
 * =====================
 * Allows a logged-in user to update their profile parameters.
 * When saved:
 *  1. Updates user record in PostgreSQL (PUT /users/{id})
 *  2. Recalculates AI hydration prediction with new values
 *  3. Updates localStorage session
 *  4. Refreshes dashboard instantly
 */
import { useState } from "react";
import { UserProfile } from "../services/api";
import { X, Save, User, Weight, Activity, MapPin } from "lucide-react";
interface EditProfileModalProps {
  profile: UserProfile;
  userId: string;
  onSave: (updatedProfile: UserProfile) => void;
  onClose: () => void;
}
const ACTIVITY_OPTIONS = [
  { value: "sedentary",  label: "Sedentary",  emoji: "🪑", desc: "Little or no exercise" },
  { value: "light",      label: "Light",      emoji: "🚶", desc: "Light exercise 1–3 days/week" },
  { value: "moderate",   label: "Moderate",   emoji: "🏃", desc: "Moderate exercise 3–5 days/week" },
  { value: "high",       label: "High",       emoji: "⚡", desc: "Hard exercise 6–7 days/week" },
  { value: "extreme",    label: "Extreme",    emoji: "🔥", desc: "Very hard exercise & physical job" },
];
export default function EditProfileModal({
  profile,
  userId,
  onSave,
  onClose,
}: EditProfileModalProps) {
  const [form, setForm] = useState({
    name:          profile.name,
    weight:        String(profile.weight),
    age:           String(profile.age),
    gender:        profile.gender,
    activityLevel: profile.activityLevel,
    city:          profile.city,
  });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }
  async function handleSave() {
    // Validate
    const weight = parseFloat(form.weight);
    const age    = parseInt(form.age);
    if (!form.name.trim())              return setError("Name is required.");
    if (!form.city.trim())              return setError("City is required.");
    if (isNaN(weight) || weight < 20 || weight > 300)
      return setError("Weight must be between 20 and 300 kg.");
    if (isNaN(age) || age < 5 || age > 110)
      return setError("Age must be between 5 and 110.");
    setSaving(true);
    setError(null);
    try {
      // ── 1. Update PostgreSQL via PUT /users/{id} ──────────────────────────
        const res = await fetch(`https://ai-hydration-coach-api.onrender.com/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:           form.name.trim(),
          weight,
          age,
          gender:         form.gender,
          activity_level: form.activityLevel,
          city:           form.city.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Failed to update profile.");
      }
      // ── 2. Build updated profile object ───────────────────────────────────
      const updatedProfile: UserProfile = {
        ...profile,
        name:          form.name.trim(),
        weight,
        age,
        gender:        form.gender as UserProfile["gender"],
        activityLevel: form.activityLevel as UserProfile["activityLevel"],
        city:          form.city.trim(),
      };
      // ── 3. Update localStorage session ────────────────────────────────────
      localStorage.setItem("hydration_user_name",     updatedProfile.name);
      localStorage.setItem("hydration_user_weight",   String(weight));
      localStorage.setItem("hydration_user_age",      String(age));
      localStorage.setItem("hydration_user_gender",   form.gender);
      localStorage.setItem("hydration_user_activity", form.activityLevel);
      localStorage.setItem("hydration_user_city",     updatedProfile.city);
      setSuccess(true);
      // Short delay to show success, then notify parent
      setTimeout(() => {
        onSave(updatedProfile);
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }
  // What changed compared to original profile
  const changes: string[] = [];
  if (form.name.trim()   !== profile.name)          changes.push("Name");
  if (parseFloat(form.weight) !== profile.weight)   changes.push(`Weight: ${profile.weight}kg → ${form.weight}kg`);
  if (parseInt(form.age)      !== profile.age)      changes.push(`Age: ${profile.age} → ${form.age}`);
  if (form.gender        !== profile.gender)        changes.push("Gender");
  if (form.activityLevel !== profile.activityLevel) changes.push(`Activity: ${profile.activityLevel} → ${form.activityLevel}`);
  if (form.city.trim()   !== profile.city)          changes.push(`City: ${profile.city} → ${form.city}`);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-blue-900 to-blue-950 border border-white/20 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-400/20 border border-cyan-400/30 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Edit Profile</h2>
              <p className="text-white/50 text-xs">Changes trigger a new AI prediction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-cyan-200 text-sm font-semibold mb-2">
              <User className="inline w-4 h-4 mr-1" />Full Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60 transition"
              placeholder="Your full name"
            />
          </div>
          {/* Weight + Age */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-cyan-200 text-sm font-semibold mb-2">
                <Weight className="inline w-4 h-4 mr-1" />Weight (kg)
              </label>
              <input
                type="number"
                value={form.weight}
                onChange={(e) => handleChange("weight", e.target.value)}
                min={20} max={300} step={0.5}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60 transition"
                placeholder="75"
              />
              {parseFloat(form.weight) !== profile.weight && (
                <p className="text-yellow-400 text-xs mt-1">
                  Was: {profile.weight} kg
                </p>
              )}
            </div>
            <div>
              <label className="block text-cyan-200 text-sm font-semibold mb-2">
                🎂 Age (years)
              </label>
              <input
                type="number"
                value={form.age}
                onChange={(e) => handleChange("age", e.target.value)}
                min={5} max={110}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60 transition"
                placeholder="28"
              />
              {parseInt(form.age) !== profile.age && (
                <p className="text-yellow-400 text-xs mt-1">
                  Was: {profile.age} yrs
                </p>
              )}
            </div>
          </div>
          {/* Gender */}
          <div>
            <label className="block text-cyan-200 text-sm font-semibold mb-2">
              Gender
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(["male", "female"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => handleChange("gender", g)}
                  className={`py-3 rounded-xl border font-semibold text-sm capitalize transition ${
                    form.gender === g
                      ? "bg-cyan-400/25 border-cyan-400/60 text-cyan-200"
                      : "bg-white/5 border-white/15 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {g === "male" ? "♂ Male" : "♀ Female"}
                </button>
              ))}
            </div>
          </div>
          {/* Activity Level */}
          <div>
            <label className="block text-cyan-200 text-sm font-semibold mb-2">
              <Activity className="inline w-4 h-4 mr-1" />Activity Level
            </label>
            <div className="space-y-2">
              {ACTIVITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleChange("activityLevel", opt.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition ${
                    form.activityLevel === opt.value
                      ? "bg-cyan-400/20 border-cyan-400/50 text-white"
                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                  }`}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <div>
                    <p className="font-semibold text-sm">{opt.label}</p>
                    <p className="text-xs opacity-60">{opt.desc}</p>
                  </div>
                  {form.activityLevel === opt.value && (
                    <span className="ml-auto text-cyan-400 text-lg">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          {/* City */}
          <div>
            <label className="block text-cyan-200 text-sm font-semibold mb-2">
              <MapPin className="inline w-4 h-4 mr-1" />City
            </label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => handleChange("city", e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60 transition"
              placeholder="Mumbai"
            />
            <p className="text-white/30 text-xs mt-1">Used to fetch live weather for your prediction</p>
          </div>
          {/* What will change preview */}
          {changes.length > 0 && (
            <div className="bg-yellow-400/10 border border-yellow-400/25 rounded-xl px-4 py-3">
              <p className="text-yellow-300 text-sm font-semibold mb-2">
                📝 Changes detected — AI will recalculate:
              </p>
              <ul className="space-y-1">
                {changes.map((c, i) => (
                  <li key={i} className="text-yellow-200/70 text-xs flex items-center gap-2">
                    <span className="text-yellow-400">→</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Error */}
          {error && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 text-red-300 text-sm">
              ⚠️ {error}
            </div>
          )}
          {/* Success */}
          {success && (
            <div className="bg-green-500/20 border border-green-400/30 rounded-xl px-4 py-3 text-green-300 text-sm flex items-center gap-2">
              <span className="text-green-400 text-lg">✅</span>
              Profile updated! Recalculating your hydration plan...
            </div>
          )}
          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 transition font-semibold text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || changes.length === 0}
              className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${
                changes.length === 0
                  ? "bg-white/10 text-white/30 cursor-not-allowed"
                  : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg"
              }`}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save & Recalculate
                </>
              )}
            </button>
          </div>
          <p className="text-white/30 text-xs text-center">
            🤖 Saving triggers a new AI prediction with your updated parameters
          </p>
        </div>
      </div>
    </div>
  );
}