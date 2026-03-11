// /**
//  * Dashboard.tsx
//  * ==============
//  * Main dashboard — fully wired to PostgreSQL via userApi.ts
//  * - Logs every water intake entry to the DB
//  * - Fetches real 7-day history from the DB
//  * - Falls back to localStorage when backend is offline
//  */
// import { logIntake } from "../services/userApi";
// import WaterTracker from "./WaterTracker";
// import AIRecommendation from "./AIRecommendation";
// import WeatherCard from "./WeatherCard";
// import HydrationHistory, { saveToHistory } from "./HydrationHistory";
// import { Droplets, RotateCcw, Database, WifiOff } from "lucide-react";
// import { useState, useEffect, useCallback } from "react";
// import type { UserProfile, HydrationPlan } from "../services/api";
// import type { WeatherData } from "../services/weather";
// interface DashboardProps {
//   profile: UserProfile;
//   plan: HydrationPlan;
//   weather: WeatherData;
//   userId: string | null;
//   backendOnline: boolean;
//   initialConsumed: number;  // ✅ today's real intake fetched from DB
//   onReset: () => void;
// }
// export default function Dashboard({
//   profile,
//   plan,
//   weather,
//   userId,
//   backendOnline,
//   initialConsumed,
//   onReset,
// }: DashboardProps) {
//   // ✅ Initialize with today's real DB value — not zero!
//    const [consumed, setConsumed] = useState(initialConsumed);
//   const goalMl = Math.round(plan.dailyGoalLiters * 1000);
//   // ✅ Sync if initialConsumed arrives late (async fetch after render)
//   useEffect(() => {
//     setConsumed(initialConsumed);
//   }, [initialConsumed]);
//   // Auto-save to localStorage fallback whenever consumed changes
//   useEffect(() => {
//     saveToHistory(consumed, goalMl);
//   }, [consumed, goalMl]);
//   /**
//    * handleAdd — called when user presses +250ml, +500ml, etc.
//    * 1. Updates local state instantly (optimistic UI)
//    * 2. Logs to PostgreSQL if backend is online
//    * 3. Falls back silently if DB call fails
//    */
//   const handleAdd = useCallback(
//     async (ml: number, notes?: string) => {
//       // Optimistic UI update — instant feedback
//       setConsumed((prev) => Math.min(prev + ml, goalMl * 2));
//       // Persist to PostgreSQL if we have a userId and backend is online
//       if (userId && backendOnline) {
//         try {
//           await logIntake({
//             user_id:  userId,
//             amount_ml: ml,
//             notes:    notes ?? undefined,
//           });
//           console.log(`✅ Logged ${ml}ml to PostgreSQL`);
//         } catch (err) {
//           console.warn("⚠️ Failed to log to DB (localStorage still updated):", err);
//         }
//       }
//     },
//     [userId, backendOnline, goalMl]
//   );
//   const handleResetIntake = useCallback(() => {
//     setConsumed(0);
//   }, []);
//   const percent = Math.min(100, Math.round((consumed / goalMl) * 100));
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-900">
//       {/* Background decorative blobs */}
//       <div className="fixed inset-0 overflow-hidden pointer-events-none">
//         <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500 opacity-10 rounded-full blur-3xl" />
//         <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-400 opacity-10 rounded-full blur-3xl" />
//         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500 opacity-5 rounded-full blur-3xl" />
//       </div>
//       <div className="relative max-w-7xl mx-auto px-4 py-8 space-y-6">
//         {/* ── Header ── */}
//         <div className="flex items-center justify-between flex-wrap gap-3">
//           <div className="flex items-center gap-3">
//             <div className="w-12 h-12 bg-cyan-400/20 border border-cyan-400/40 rounded-full flex items-center justify-center shadow-lg shadow-cyan-400/10">
//               <Droplets className="w-6 h-6 text-cyan-300" />
//             </div>
//               <h1 className="text-2xl font-bold text-white">
//                 {profile.name ? `👋 ${profile.name}'s Dashboard` : "AI Hydration Coach"}
//               </h1>
//               <p className="text-cyan-300 text-sm">
//                 {profile.gender === "male" ? "♂" : "♀"} {profile.age} yrs ·{" "}
//                 {profile.weight} kg ·{" "}
//                 <span className="capitalize">{profile.activityLevel}</span> ·{" "}
//                 {weather.city}
//               </p>
//               {profile.email && (
//                 <p className="text-white/30 text-xs mt-0.5">📧 {profile.email}</p>
//               )}
//             </div>
//           <div className="flex items-center gap-3">
//             {/* DB Status Badge */}
//             {backendOnline && userId ? (
//               <div className="flex items-center gap-2 px-3 py-1.5 bg-green-400/15 border border-green-400/30 rounded-xl">
//                 <Database className="w-3.5 h-3.5 text-green-400" />
//                 <span className="text-green-300 text-xs font-semibold">PostgreSQL Active</span>
//                 <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
//               </div>
//             ) : (
//               <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-400/15 border border-yellow-400/30 rounded-xl">
//                 <WifiOff className="w-3.5 h-3.5 text-yellow-400" />
//                 <span className="text-yellow-300 text-xs font-semibold">Offline Mode</span>
//               </div>
//             )}
//        <button
//               onClick={onReset}
//               className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-sm transition"
//             >
//               <RotateCcw className="w-4 h-4" /> {profile.name ? "Logout" : "New Profile"}
//             </button>
//           </div>
//         </div>
//         {/* ── DB Info Strip (when online) ── */}
//       {/* ── DB Info Strip + Login Email Reminder ── */}
//         {backendOnline && userId && (
//           <div className="bg-green-400/10 border border-green-400/20 rounded-2xl px-5 py-4 space-y-3">
//             <div className="flex flex-wrap items-center gap-4">
//               <div className="flex items-center gap-2">
//                 <Database className="w-4 h-4 text-green-400" />
//                 <span className="text-green-300 text-sm font-semibold">Connected to PostgreSQL</span>
//               </div>
//               <div className="flex flex-wrap gap-4 text-xs text-green-200/70">
//                 <span>✅ User registered in DB</span>
//                 <span>✅ AI prediction saved</span>
//                 <span>✅ Water intake syncing live</span>
//                 <span>✅ 7-day history from DB</span>
//               </div>
//             </div>
//             {/* Email reminder — so user knows how to login next time */}
//             {profile.email && (
//               <div className="flex items-center gap-3 bg-cyan-400/10 border border-cyan-400/20 rounded-xl px-4 py-2.5">
//                 <span className="text-xl">🔑</span>
//                 <div>
//                   <p className="text-cyan-200 text-xs font-semibold">Your Login Email (save this!)</p>
//                   <p className="text-white font-mono text-sm">{profile.email}</p>
//                 </div>
//                 <div className="ml-auto text-xs text-cyan-200/50 text-right">
//                   <p>Use this email to</p>
//                   <p>restore your history</p>
//                 </div>
//               </div>
//             )}
//           </div>
//         )}
//         {/* ── Hero Goal Card ── */}
//         <div className="bg-gradient-to-r from-cyan-500/25 to-blue-600/25 backdrop-blur-md border border-cyan-400/30 rounded-3xl p-6 shadow-xl">
//           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//             {/* Left: Goal */}
//             <div>
//               <p className="text-cyan-200 text-sm mb-1">🤖 AI Recommended Daily Goal</p>
//               <div className="flex items-end gap-3">
//                 <span className="text-6xl font-black text-white">{plan.dailyGoalLiters}</span>
//                 <span className="text-3xl font-bold text-cyan-300 mb-2">Liters</span>
//               </div>
//               <p className="text-white/60 text-sm mt-1">
//                 Drink every{" "}
//                 <span className="text-cyan-300 font-semibold">
//                   {plan.drinkIntervalHours} hour{plan.drinkIntervalHours !== 1 ? "s" : ""}
//                 </span>{" "}
//                 to stay on track
//               </p>
//             </div>
//             {/* Right: Quick stats */}
//             <div className="flex gap-4 sm:gap-6">
//               <div className="text-center">
//                 <p className="text-3xl font-black text-green-400">
//                   {(consumed / 1000).toFixed(1)}L
//                 </p>
//                 <p className="text-white/50 text-xs">Consumed</p>
//               </div>
//               <div className="w-px bg-white/10 hidden sm:block" />
//               <div className="text-center">
//                 <p className="text-3xl font-black text-orange-400">
//                   {(Math.max(0, goalMl - consumed) / 1000).toFixed(1)}L
//                 </p>
//                 <p className="text-white/50 text-xs">Remaining</p>
//               </div>
//               <div className="w-px bg-white/10 hidden sm:block" />
//               <div className="text-center">
//                 <p className="text-3xl font-black text-cyan-300">{percent}%</p>
//                 <p className="text-white/50 text-xs">Progress</p>
//               </div>
//             </div>
//           </div>
//           {/* Hero progress bar */}
//           <div className="mt-4 h-2.5 bg-white/10 rounded-full overflow-hidden">
//             <div
//               className={`h-full rounded-full transition-all duration-700 ${
//                 percent >= 100
//                   ? "bg-gradient-to-r from-green-400 to-emerald-400"
//                   : "bg-gradient-to-r from-cyan-400 to-blue-500"
//               }`}
//               style={{ width: `${Math.min(100, percent)}%` }}
//             />
//           </div>
//         </div>
//         {/* ── Main Grid ── */}
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           {/* Left column: Water Tracker + History (takes 2 cols on large) */}
//           <div className="lg:col-span-2 space-y-6">
//             <WaterTracker
//               consumed={consumed}
//               goal={goalMl}
//               onAdd={handleAdd}
//               onReset={handleResetIntake}
//               backendOnline={backendOnline}
//             />
//             {/* Feature 3: Hydration History — real DB data or localStorage */}
//             <HydrationHistory
//               todayConsumed={consumed}
//               goalMl={goalMl}
//               userId={userId}
//               backendOnline={backendOnline}
//             />
//           </div>
//           {/* Right column: Weather + AI Insight */}
//           <div className="space-y-6">
//             <WeatherCard weather={weather} />
//             <AIRecommendation plan={plan} weather={weather} />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
// import { UserProfile, HydrationPlan, predictHydration } from "../services/api";
// import { WeatherData, fetchWeatherByCity } from "../services/weather";
// import WaterTracker from "./WaterTracker";
// import AIRecommendation from "./AIRecommendation";
// import WeatherCard from "./WeatherCard";
// import HydrationHistory, { saveToHistory } from "./HydrationHistory";
// import { Droplets, RotateCcw, Database, WifiOff, Pencil } from "lucide-react";
// import { useState, useEffect, useCallback } from "react";
// import EditProfileModal from "./EditProfileModal";
// import { logIntake } from "../services/userApi"; // Import the direct API function

// interface DashboardProps {
//   profile:         UserProfile;
//   plan:            HydrationPlan;
//   weather:         WeatherData;
//   userId:          string | null;
//   backendOnline:   boolean;
//   initialConsumed: number;
//   onReset:         () => void;
// }

// export default function Dashboard({
//   profile,
//   plan,
//   weather,
//   userId,
//   backendOnline,
//   initialConsumed,
//   onReset,
// }: DashboardProps) {
//   // ── Mutable copies — updated when user edits profile ─────────────────────
//   const [currentProfile, setCurrentProfile] = useState<UserProfile>(profile);
//   const [currentPlan,    setCurrentPlan]    = useState<HydrationPlan>(plan);
//   const [currentWeather, setCurrentWeather] = useState<WeatherData>(weather);
//   const [showEditModal,  setShowEditModal]  = useState(false);
//   const [recalculating,  setRecalculating]  = useState(false);
  
//   // ── Water intake state ────────────────────────────────────────────────────
//   const [consumed, setConsumed] = useState(initialConsumed);
//   const [dbLoaded, setDbLoaded] = useState(false);
//   const [isLogging, setIsLogging] = useState(false); // For loading state
  
//   const goalMl = Math.round(currentPlan.dailyGoalLiters * 1000);

//   useEffect(() => { setConsumed(initialConsumed); }, [initialConsumed]);
//   useEffect(() => { if (initialConsumed >= 0) setDbLoaded(true); }, [initialConsumed]);
//   useEffect(() => {
//     if (!dbLoaded) return;
//     saveToHistory(consumed, goalMl);
//   }, [consumed, goalMl, dbLoaded]);

//   // ── Profile edit & re-prediction ──────────────────────────────────────────
//   async function handleProfileSave(updatedProfile: UserProfile) {
//     setShowEditModal(false);
//     setRecalculating(true);
//     try {
//       const newWeather = await fetchWeatherByCity(updatedProfile.city);
//       const newPlan    = await predictHydration(
//         updatedProfile,
//         newWeather.temperature,
//         newWeather.humidity,
//         userId
//       );
//       setCurrentProfile(updatedProfile);
//       setCurrentWeather(newWeather);
//       setCurrentPlan(newPlan);
//     } catch (err) {
//       console.error("Recalculation failed:", err);
//     } finally {
//       setRecalculating(false);
//     }
//   }

//   // ── Water add handler ─────────────────────────────────────────────────────
//   const handleAdd = useCallback(
//     async (ml: number, notes?: string) => {
//       // Update local state immediately for responsive UI
//       setConsumed((prev) => Math.min(prev + ml, goalMl * 2));
      
//       // If user is logged in and backend is online, sync to database
//       if (userId && backendOnline) {
//         setIsLogging(true);
//         try {
//           await logIntake({ 
//             user_id: userId, 
//             amount_ml: ml, 
//             notes: notes ?? undefined 
//           });
//         } catch (error) {
//           console.error("Failed to log intake to database:", error);
//           // Optionally show an error toast here
//         } finally {
//           setIsLogging(false);
//         }
//       }
//     },
//     [userId, backendOnline, goalMl]
//   );

//   const handleResetIntake = useCallback(() => setConsumed(0), []);
  
//   const percent = Math.min(100, Math.round((consumed / goalMl) * 100));

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-900">
//       {/* ── Edit Profile Modal ── */}
//       {showEditModal && userId && (
//         <EditProfileModal
//           profile={currentProfile}
//           userId={userId}
//           onSave={handleProfileSave}
//           onClose={() => setShowEditModal(false)}
//         />
//       )}

//       {/* ── Recalculating Overlay ── */}
//       {recalculating && (
//         <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center">
//           <div className="bg-blue-900/90 border border-cyan-400/30 rounded-2xl px-8 py-6 text-center shadow-2xl">
//             <div className="w-12 h-12 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
//             <p className="text-white font-bold text-lg">Recalculating your plan...</p>
//             <p className="text-cyan-300 text-sm mt-1">🤖 AI is processing your updated profile</p>
//           </div>
//         </div>
//       )}

//       {/* ── Background blobs ── */}
//       <div className="fixed inset-0 overflow-hidden pointer-events-none">
//         <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500 opacity-10 rounded-full blur-3xl" />
//         <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-400 opacity-10 rounded-full blur-3xl" />
//         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500 opacity-5 rounded-full blur-3xl" />
//       </div>

//       <div className="relative max-w-7xl mx-auto px-4 py-8 space-y-6">
//         {/* ── Header ── */}
//         <div className="flex items-center justify-between flex-wrap gap-3">
//           <div className="flex items-center gap-3">
//             <div className="w-12 h-12 bg-cyan-400/20 border border-cyan-400/40 rounded-full flex items-center justify-center shadow-lg shadow-cyan-400/10">
//               <Droplets className="w-6 h-6 text-cyan-300" />
//             </div>
//             <div>
//               <h1 className="text-2xl font-bold text-white">
//                 {currentProfile.name ? `👋 ${currentProfile.name}'s Dashboard` : "AI Hydration Coach"}
//               </h1>
//               <p className="text-cyan-300 text-sm">
//                 {currentProfile.gender === "male" ? "♂" : "♀"} {currentProfile.age} yrs ·{" "}
//                 {currentProfile.weight} kg ·{" "}
//                 <span className="capitalize">{currentProfile.activityLevel}</span> ·{" "}
//                 {currentWeather.city}
//               </p>
//               {currentProfile.email && (
//                 <p className="text-white/30 text-xs mt-0.5">📧 {currentProfile.email}</p>
//               )}
//             </div>
//           </div>

//           <div className="flex items-center gap-3 flex-wrap">
//             {/* DB Status */}
//             {backendOnline && userId ? (
//               <div className="flex items-center gap-2 px-3 py-1.5 bg-green-400/15 border border-green-400/30 rounded-xl">
//                 <Database className="w-3.5 h-3.5 text-green-400" />
//                 <span className="text-green-300 text-xs font-semibold">PostgreSQL Active</span>
//                 <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
//               </div>
//             ) : (
//               <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-400/15 border border-yellow-400/30 rounded-xl">
//                 <WifiOff className="w-3.5 h-3.5 text-yellow-400" />
//                 <span className="text-yellow-300 text-xs font-semibold">Offline Mode</span>
//               </div>
//             )}

//             {/* Syncing indicator */}
//             {isLogging && (
//               <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-400/15 border border-blue-400/30 rounded-xl">
//                 <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
//                 <span className="text-blue-300 text-xs font-semibold">Syncing...</span>
//               </div>
//             )}

//             {/* ✅ Edit Profile Button */}
//             {userId && (
//               <button
//                 onClick={() => setShowEditModal(true)}
//                 className="flex items-center gap-2 px-4 py-2 bg-cyan-400/15 hover:bg-cyan-400/25 border border-cyan-400/30 rounded-xl text-cyan-300 text-sm font-semibold transition"
//               >
//                 <Pencil className="w-4 h-4" /> Edit Profile
//               </button>
//             )}

//             <button
//               onClick={onReset}
//               className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-sm transition"
//             >
//               <RotateCcw className="w-4 h-4" />
//               {currentProfile.name ? "Logout" : "New Profile"}
//             </button>
//           </div>
//         </div>

//         {/* ── DB Info Strip ── */}
//         {backendOnline && userId && (
//           <div className="bg-green-400/10 border border-green-400/20 rounded-2xl px-5 py-4 space-y-3">
//             <div className="flex flex-wrap items-center gap-4">
//               <div className="flex items-center gap-2">
//                 <Database className="w-4 h-4 text-green-400" />
//                 <span className="text-green-300 text-sm font-semibold">Connected to PostgreSQL</span>
//               </div>
//               <div className="flex flex-wrap gap-4 text-xs text-green-200/70">
//                 <span>✅ User registered in DB</span>
//                 <span>✅ AI prediction saved</span>
//                 <span>✅ Water intake syncing live</span>
//                 <span>✅ 7-day history from DB</span>
//               </div>
//             </div>
//             {currentProfile.email && (
//               <div className="flex items-center gap-3 bg-cyan-400/10 border border-cyan-400/20 rounded-xl px-4 py-2.5">
//                 <span className="text-xl">🔑</span>
//                 <div>
//                   <p className="text-cyan-200 text-xs font-semibold">Your Login Email (save this!)</p>
//                   <p className="text-white font-mono text-sm">{currentProfile.email}</p>
//                 </div>
//                 <div className="ml-auto text-xs text-cyan-200/50 text-right">
//                   <p>Use this email to</p>
//                   <p>restore your history</p>
//                 </div>
//               </div>
//             )}
//           </div>
//         )}

//         {/* ── Hero Goal Card ── */}
//         <div className="bg-gradient-to-r from-cyan-500/25 to-blue-600/25 backdrop-blur-md border border-cyan-400/30 rounded-3xl p-6 shadow-xl">
//           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//             <div>
//               <p className="text-cyan-200 text-sm mb-1">🤖 AI Recommended Daily Goal</p>
//               <div className="flex items-end gap-3">
//                 <span className="text-6xl font-black text-white">{currentPlan.dailyGoalLiters}</span>
//                 <span className="text-3xl font-bold text-cyan-300 mb-2">Liters</span>
//               </div>
//               <p className="text-white/60 text-sm mt-1">
//                 Drink every{" "}
//                 <span className="text-cyan-300 font-semibold">
//                   {currentPlan.drinkIntervalHours} hour{currentPlan.drinkIntervalHours !== 1 ? "s" : ""}
//                 </span>{" "}
//                 to stay on track
//               </p>
//             </div>
//             <div className="flex gap-4 sm:gap-6">
//               <div className="text-center">
//                 <p className="text-3xl font-black text-green-400">{(consumed / 1000).toFixed(1)}L</p>
//                 <p className="text-white/50 text-xs">Consumed</p>
//               </div>
//               <div className="w-px bg-white/10 hidden sm:block" />
//               <div className="text-center">
//                 <p className="text-3xl font-black text-orange-400">
//                   {(Math.max(0, goalMl - consumed) / 1000).toFixed(1)}L
//                 </p>
//                 <p className="text-white/50 text-xs">Remaining</p>
//               </div>
//               <div className="w-px bg-white/10 hidden sm:block" />
//               <div className="text-center">
//                 <p className="text-3xl font-black text-cyan-300">{percent}%</p>
//                 <p className="text-white/50 text-xs">Progress</p>
//               </div>
//             </div>
//           </div>
//           <div className="mt-4 h-2.5 bg-white/10 rounded-full overflow-hidden">
//             <div
//               className={`h-full rounded-full transition-all duration-700 ${
//                 percent >= 100
//                   ? "bg-gradient-to-r from-green-400 to-emerald-400"
//                   : "bg-gradient-to-r from-cyan-400 to-blue-500"
//               }`}
//               style={{ width: `${Math.min(100, percent)}%` }}
//             />
//           </div>
//         </div>

//         {/* ── Main Grid ── */}
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           <div className="lg:col-span-2 space-y-6">
//             <WaterTracker
//               consumed={consumed}
//               goal={goalMl}
//               onAdd={handleAdd}
//               onReset={handleResetIntake}
//               backendOnline={backendOnline}
//               isSyncing={isLogging} // Optional: pass this to show loading state in WaterTracker
//             />
//             <HydrationHistory
//               todayConsumed={consumed}
//               goalMl={goalMl}
//               userId={userId}
//               backendOnline={backendOnline}
//             />
//           </div>
//           <div className="space-y-6">
//             <WeatherCard weather={currentWeather} />
//             <AIRecommendation plan={currentPlan} weather={currentWeather} />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

import { UserProfile, HydrationPlan, predictHydration } from "../services/api";
import { WeatherData, fetchWeatherByCity } from "../services/weather";
import WaterTracker from "./WaterTracker";
import AIRecommendation from "./AIRecommendation";
import WeatherCard from "./WeatherCard";
import HydrationHistory, { saveToHistory } from "./HydrationHistory";
import { Droplets, RotateCcw, Database, WifiOff, Pencil } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import EditProfileModal from "./EditProfileModal";
import { logIntake, saveUserSession } from "../services/userApi";
interface DashboardProps {
  profile:         UserProfile;
  plan:            HydrationPlan;
  weather:         WeatherData;
  userId:          string | null;
  backendOnline:   boolean;
  initialConsumed: number;
  onReset:         () => void;
}
export default function Dashboard({
  profile,
  plan,
  weather,
  userId,
  backendOnline,
  initialConsumed,
  onReset,
}: DashboardProps) {
  // ── Mutable copies — updated when user edits profile ─────────────────────
  const [currentProfile, setCurrentProfile] = useState<UserProfile>(profile);
  const [currentPlan,    setCurrentPlan]    = useState<HydrationPlan>(plan);
  const [currentWeather, setCurrentWeather] = useState<WeatherData>(weather);
  const [showEditModal,  setShowEditModal]  = useState(false);
  const [recalculating,  setRecalculating]  = useState(false);
  // ── Water intake state ────────────────────────────────────────────────────
  const [consumed,   setConsumed]   = useState(initialConsumed);
  const [lastAdded,  setLastAdded]  = useState(0);        // Fix 3: for undo
  const [dbLoaded,   setDbLoaded]   = useState(false);    // Fix 3: guard localStorage write
  const [isLogging,  setIsLogging]  = useState(false);
  const goalMl = Math.round(currentPlan.dailyGoalLiters * 1000);
  // ── Sync initialConsumed from DB when it arrives ─────────────────────────
  useEffect(() => { setConsumed(initialConsumed); }, [initialConsumed]);
  // Fix 3: only mark dbLoaded=true once we have a real value from DB
  useEffect(() => {
    if (initialConsumed >= 0) setDbLoaded(true);
  }, [initialConsumed]);
  // Fix 3: NEVER write to localStorage until DB value has loaded
  // This prevents overwriting real history with 0 during the async fetch
  useEffect(() => {
    if (!dbLoaded) return;
    saveToHistory(consumed, goalMl);
  }, [consumed, goalMl, dbLoaded]);
  // ── Fix 1: Midnight auto-reset ────────────────────────────────────────────
  // Checks every 60 seconds if the date has changed
  useEffect(() => {
    const checkMidnight = () => {
      const lastDate = localStorage.getItem("hydration_last_date");
      const today    = new Date().toISOString().slice(0, 10); // "2025-01-15"
      if (lastDate && lastDate !== today) {
        // New day — reset consumed counter
        setConsumed(0);
        setLastAdded(0);
        console.log("🌙 Midnight reset — new day started:", today);
      }
      localStorage.setItem("hydration_last_date", today);
    };
    checkMidnight();                                      // run immediately on mount
    const interval = setInterval(checkMidnight, 60_000); // check every minute
    return () => clearInterval(interval);
  }, []);
  // ── Fix 2: Drink reminder notifications ───────────────────────────────────
  // Requests permission once, then fires every X hours based on AI recommendation
  useEffect(() => {
    if (!("Notification" in window)) return;
    // Ask for permission politely
    if (Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          new Notification("💧 AI Hydration Coach", {
            body: "Notifications enabled! I'll remind you to drink water.",
            icon: "/favicon.ico",
          });
        }
      });
    }
    const intervalHours = currentPlan.drinkIntervalHours ?? 2;
    const intervalMs    = intervalHours * 60 * 60 * 1000;
    const timer = setInterval(() => {
      if (Notification.permission === "granted") {
        const remaining = Math.max(0, goalMl - consumed);
        new Notification("💧 Time to drink water!", {
          body: `Your AI coach recommends drinking every ${intervalHours} hour${
            intervalHours !== 1 ? "s" : ""
          }. ${remaining > 0 ? `${(remaining / 1000).toFixed(1)}L remaining today!` : "You've hit your goal! 🎉"}`,
          icon: "/favicon.ico",
        });
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [currentPlan.drinkIntervalHours, goalMl, consumed]);
  // ── Fix 4: Edit Profile — updates BOTH PostgreSQL AND localStorage ────────
  async function handleProfileSave(updatedProfile: UserProfile) {
    setShowEditModal(false);
    setRecalculating(true);
    try {
      const newWeather = await fetchWeatherByCity(updatedProfile.city);
      const newPlan    = await predictHydration(
        updatedProfile,
        newWeather.temperature,
        newWeather.humidity,
        userId
      );
      setCurrentProfile(updatedProfile);
      setCurrentWeather(newWeather);
      setCurrentPlan(newPlan);
      // Fix 4: Always update localStorage session after profile edit
      // so the pre-filled form and returning login reflect new values
      if (userId) {
        saveUserSession({
          id:             userId,
          name:           updatedProfile.name,
          email:          updatedProfile.email,
          weight:         updatedProfile.weight,
          age:            updatedProfile.age,
          gender:         updatedProfile.gender,
          activity_level: updatedProfile.activityLevel,
          city:           updatedProfile.city,
          created_at:     new Date().toISOString(),
        });
        console.log("✅ Profile updated in localStorage:", updatedProfile.email);
      }
    } catch (err) {
      console.error("Recalculation failed:", err);
    } finally {
      setRecalculating(false);
    }
  }
  // ── Water add handler — optimistic UI + DB sync ───────────────────────────
  const handleAdd = useCallback(
    async (ml: number, notes?: string) => {
      // Update UI immediately (optimistic)
      setConsumed((prev) => Math.min(prev + ml, goalMl * 2));
      setLastAdded(ml); // Fix 5: track last added for undo
      // Sync to PostgreSQL in background
      if (userId && backendOnline) {
        setIsLogging(true);
        try {
          await logIntake({ user_id: userId, amount_ml: ml, notes: notes ?? undefined });
        } catch (error) {
          console.error("Failed to log intake to database:", error);
        } finally {
          setIsLogging(false);
        }
      }
    },
    [userId, backendOnline, goalMl]
  );
  // ── Fix 5: Undo last entry ────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (lastAdded > 0) {
      setConsumed((prev) => Math.max(0, prev - lastAdded));
      setLastAdded(0); // can only undo once
    }
  }, [lastAdded]);
  // ── Reset day ─────────────────────────────────────────────────────────────
  const handleResetIntake = useCallback(() => {
    setConsumed(0);
    setLastAdded(0);
  }, []);
  const percent = Math.min(100, Math.round((consumed / goalMl) * 100));
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-900">
      {/* ── Edit Profile Modal ── */}
      {showEditModal && userId && (
        <EditProfileModal
          profile={currentProfile}
          userId={userId}
          onSave={handleProfileSave}
          onClose={() => setShowEditModal(false)}
        />
      )}
      {/* ── Recalculating Overlay ── */}
      {recalculating && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-blue-900/90 border border-cyan-400/30 rounded-2xl px-8 py-6 text-center shadow-2xl">
            <div className="w-12 h-12 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-bold text-lg">Recalculating your plan...</p>
            <p className="text-cyan-300 text-sm mt-1">🤖 AI is processing your updated profile</p>
          </div>
        </div>
      )}
      {/* ── Background blobs ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500 opacity-10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-400 opacity-10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500 opacity-5 rounded-full blur-3xl" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-cyan-400/20 border border-cyan-400/40 rounded-full flex items-center justify-center shadow-lg shadow-cyan-400/10">
              <Droplets className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {currentProfile.name
                  ? `👋 ${currentProfile.name}'s Dashboard`
                  : "AI Hydration Coach"}
              </h1>
              <p className="text-cyan-300 text-sm">
                {currentProfile.gender === "male" ? "♂" : "♀"} {currentProfile.age} yrs ·{" "}
                {currentProfile.weight} kg ·{" "}
                <span className="capitalize">{currentProfile.activityLevel}</span> ·{" "}
                {currentWeather.city}
              </p>
              {currentProfile.email && (
                <p className="text-white/30 text-xs mt-0.5">📧 {currentProfile.email}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* DB Status badge */}
            {backendOnline && userId ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-400/15 border border-green-400/30 rounded-xl">
                <Database className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-300 text-xs font-semibold">PostgreSQL Active</span>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-400/15 border border-yellow-400/30 rounded-xl">
                <WifiOff className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-yellow-300 text-xs font-semibold">Offline Mode</span>
              </div>
            )}
            {/* Syncing indicator */}
            {isLogging && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-400/15 border border-blue-400/30 rounded-xl">
                <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                <span className="text-blue-300 text-xs font-semibold">Syncing...</span>
              </div>
            )}
            {/* Edit Profile button */}
            {userId && (
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-400/15 hover:bg-cyan-400/25 border border-cyan-400/30 rounded-xl text-cyan-300 text-sm font-semibold transition"
              >
                <Pencil className="w-4 h-4" /> Edit Profile
              </button>
            )}
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-sm transition"
            >
              <RotateCcw className="w-4 h-4" />
              {currentProfile.name ? "Logout" : "New Profile"}
            </button>
          </div>
        </div>
        {/* ── DB Info Strip ── */}
        {backendOnline && userId && (
          <div className="bg-green-400/10 border border-green-400/20 rounded-2xl px-5 py-4 space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-green-400" />
                <span className="text-green-300 text-sm font-semibold">Connected to PostgreSQL</span>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-green-200/70">
                <span>✅ User registered in DB</span>
                <span>✅ AI prediction saved</span>
                <span>✅ Water intake syncing live</span>
                <span>✅ 7-day history from DB</span>
              </div>
            </div>
            {currentProfile.email && (
              <div className="flex items-center gap-3 bg-cyan-400/10 border border-cyan-400/20 rounded-xl px-4 py-2.5">
                <span className="text-xl">🔑</span>
                <div>
                  <p className="text-cyan-200 text-xs font-semibold">Your Login Email (save this!)</p>
                  <p className="text-white font-mono text-sm">{currentProfile.email}</p>
                </div>
                <div className="ml-auto text-xs text-cyan-200/50 text-right">
                  <p>Use this email to</p>
                  <p>restore your history</p>
                </div>
              </div>
            )}
          </div>
        )}
        {/* ── Hero Goal Card ── */}
        <div className="bg-gradient-to-r from-cyan-500/25 to-blue-600/25 backdrop-blur-md border border-cyan-400/30 rounded-3xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-cyan-200 text-sm mb-1">🤖 AI Recommended Daily Goal</p>
              <div className="flex items-end gap-3">
                <span className="text-6xl font-black text-white">{currentPlan.dailyGoalLiters}</span>
                <span className="text-3xl font-bold text-cyan-300 mb-2">Liters</span>
              </div>
              <p className="text-white/60 text-sm mt-1">
                Drink every{" "}
                <span className="text-cyan-300 font-semibold">
                  {currentPlan.drinkIntervalHours} hour
                  {currentPlan.drinkIntervalHours !== 1 ? "s" : ""}
                </span>{" "}
                to stay on track
              </p>
            </div>
           <div className="flex gap-4 sm:gap-6">
  <div className="text-center">
    <p className="text-3xl font-black text-green-400">{(consumed / 1000).toFixed(2)}L</p> {/* ← Changed to .toFixed(2) */}
    <p className="text-white/50 text-xs">Consumed</p>
  </div>
  <div className="w-px bg-white/10 hidden sm:block" />
  <div className="text-center">
    <p className="text-3xl font-black text-orange-400">
      {(Math.max(0, goalMl - consumed) / 1000).toFixed(2)}L {/* ← Changed to .toFixed(2) */}
    </p>
    <p className="text-white/50 text-xs">Remaining</p>
  </div>
  <div className="w-px bg-white/10 hidden sm:block" />
  <div className="text-center">
    <p className="text-3xl font-black text-cyan-300">{percent}%</p>
    <p className="text-white/50 text-xs">Progress</p>
  </div>
</div>
          </div>
          <div className="mt-4 h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                percent >= 100
                  ? "bg-gradient-to-r from-green-400 to-emerald-400"
                  : "bg-gradient-to-r from-cyan-400 to-blue-500"
              }`}
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </div>
        </div>
        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <WaterTracker
              consumed={consumed}
              goal={goalMl}
              onAdd={handleAdd}
              onUndo={handleUndo}
              onReset={handleResetIntake}
              backendOnline={backendOnline}
              isSyncing={isLogging}
              lastAdded={lastAdded}
            />
            <HydrationHistory
              todayConsumed={consumed}
              goalMl={goalMl}
              userId={userId}
              backendOnline={backendOnline}
            />
          </div>
          <div className="space-y-6">
            <WeatherCard weather={currentWeather} />
            <AIRecommendation plan={currentPlan} weather={currentWeather} />
          </div>
        </div>
      </div>
    </div>
  );
}