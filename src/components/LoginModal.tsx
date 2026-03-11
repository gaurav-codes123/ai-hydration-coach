/**
 * LoginModal.tsx — Returning User Login
 * =======================================
 * Allows a returning user to enter their email
 * to restore their profile, history and daily goal.
 */
import { useState } from "react";
import { Droplets, Mail, X, LogIn, UserPlus, Clock, Database } from "lucide-react";
import { getUserByEmail, type DBUser } from "../services/userApi";
interface LoginModalProps {
  onClose: () => void;
  onLogin: (user: DBUser) => void;
}
export default function LoginModal({ onClose, onLogin }: LoginModalProps) {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [found, setFound]     = useState<DBUser | null>(null);
async function handleLookup() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setError(null);
    console.log(`🔍 Searching for account with email: "${trimmedEmail}"`);
    try {
      const user = await getUserByEmail(trimmedEmail);
      console.log("✅ Found user:", user);
      setFound(user);
    } catch (err) {
      console.error("❌ Login lookup failed:", err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      // Show the exact email searched so user can verify
      setError(`No account found for "${trimmedEmail}". Make sure you used this exact email when registering. (${msg})`);
    } finally {
      setLoading(false);
    }
  }
  function handleConfirmLogin() {
    if (found) {
      // Save session to localStorage so user stays logged in
      localStorage.setItem("hydration_user_id",    found.id);
      localStorage.setItem("hydration_user_email",  found.email);
      localStorage.setItem("hydration_user_name",   found.name);
      onLogin(found);
    }
  }
  const activityEmoji: Record<string, string> = {
    sedentary: "🪑",
    light:     "🚶",
    moderate:  "🏃",
    high:      "🏋️",
    extreme:   "🔥",
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-900 border border-white/20 rounded-3xl shadow-2xl p-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-400/20 border border-cyan-400/40 rounded-full mb-3">
            <LogIn className="w-8 h-8 text-cyan-300" />
          </div>
          <h2 className="text-2xl font-bold text-white">Welcome Back!</h2>
          <p className="text-cyan-200 text-sm mt-1">
            Enter your email to restore your profile & history
          </p>
        </div>
        {/* What gets restored info */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 grid grid-cols-3 gap-3 text-center">
          <div>
            <Database className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
            <p className="text-white text-xs font-medium">Your Profile</p>
            <p className="text-white/50 text-xs">Weight, age, etc.</p>
          </div>
          <div>
            <Clock className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <p className="text-white text-xs font-medium">7-Day History</p>
            <p className="text-white/50 text-xs">All intake logs</p>
          </div>
          <div>
            <Droplets className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-white text-xs font-medium">Daily Goal</p>
            <p className="text-white/50 text-xs">AI recommendation</p>
          </div>
        </div>
        {/* Email Input */}
        {!found && (
          <>
            <div className="mb-4">
              <label className="text-cyan-200 text-sm font-medium mb-1 block">
                Your Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  placeholder="gaurav@example.com"
                  className="w-full bg-white/10 border border-white/30 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                />
              </div>
              {error && (
                <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                  ⚠️ {error}
                </p>
              )}
            </div>
            <button
              onClick={handleLookup}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-white font-bold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Looking up your account...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Find My Account
                </>
              )}
            </button>
          </>
        )}
        {/* Found User Card */}
        {found && (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-400/30 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-400/20 rounded-full flex items-center justify-center text-lg">
                  {activityEmoji[found.activity_level] ?? "👤"}
                </div>
                <div>
                  <p className="text-green-300 text-xs font-medium">✅ Account Found!</p>
                  <p className="text-white font-bold text-lg">{found.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/50 text-xs">Email</p>
                  <p className="text-white font-medium text-xs truncate">{found.email}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/50 text-xs">City</p>
                  <p className="text-white font-medium">{found.city ?? "—"}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/50 text-xs">Weight</p>
                  <p className="text-white font-medium">{found.weight} kg</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/50 text-xs">Activity</p>
                  <p className="text-white font-medium capitalize">{found.activity_level}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/50 text-xs">Age</p>
                  <p className="text-white font-medium">{found.age} yrs</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/50 text-xs">Gender</p>
                  <p className="text-white font-medium capitalize">{found.gender}</p>
                </div>
              </div>
              <p className="text-white/40 text-xs mt-3 text-center">
                Member since {new Date(found.created_at).toLocaleDateString("en-US", {
                  year: "numeric", month: "long", day: "numeric"
                })}
              </p>
            </div>
            {/* Confirm Login */}
            <button
              onClick={handleConfirmLogin}
              className="w-full py-3 bg-gradient-to-r from-green-400 to-cyan-500 hover:from-green-300 hover:to-cyan-400 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Login as {found.name}
            </button>
            {/* Try different email */}
            <button
              onClick={() => { setFound(null); setEmail(""); }}
              className="w-full py-2 text-white/50 hover:text-white text-sm transition text-center"
            >
              ← Try a different email
            </button>
          </div>
        )}
        {/* Divider */}
        {!found && (
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
        )}
        {/* New user CTA */}
        {!found && (
          <button
            onClick={onClose}
            className="w-full py-3 bg-white/10 border border-white/20 hover:bg-white/20 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Create New Profile
          </button>
        )}
      </div>
    </div>
  );
}
