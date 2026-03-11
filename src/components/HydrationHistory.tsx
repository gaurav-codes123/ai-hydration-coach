/**
 * HydrationHistory.tsx
 * =====================
 * Shows the last 7 days of water intake as a bar chart using Recharts.
 * - If backendOnline + userId: fetches real data from PostgreSQL
 * - Otherwise: falls back to localStorage
 */
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { format, subDays } from "date-fns";
import { BarChart2, Droplets, TrendingUp, Award, Database, RefreshCw } from "lucide-react";
import { getIntakeHistory, type IntakeHistory } from "../services/userApi";
// ─── Types ────────────────────────────────────────────────────────────────────
type DBHistory = IntakeHistory;

export interface DayRecord {
  date: string;     // "YYYY-MM-DD"
  consumed: number; // ml
  goal: number;     // ml
}
interface ChartEntry {
  date: string;
  label: string;
  consumed: number; // liters
  goal: number;     // liters
  isToday: boolean;
}
interface HydrationHistoryProps {
  todayConsumed: number; // ml — live today value
  goalMl: number;
  userId: string | null;
  backendOnline: boolean;
}
// ─── localStorage helpers ─────────────────────────────────────────────────────
const STORAGE_KEY = "hydration_history";
export function loadHistory(): DayRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
export function saveToHistory(consumed: number, goalMl: number): void {
  const today = format(new Date(), "yyyy-MM-dd");
  const history = loadHistory();
  const idx = history.findIndex((r) => r.date === today);
  
  // Store the exact value, no rounding
  if (idx >= 0) {
    history[idx].consumed = consumed;  // Store exact ml value
    history[idx].goal = goalMl;        // Store exact ml value
  } else {
    history.push({ date: today, consumed, goal: goalMl });  // Store exact ml values
  }
  
  // Keep only last 30 days
  const trimmed = history.slice(-30);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  
  // Debug log to verify
  console.log(`Saved to history: ${today} = ${consumed}ml`);
}
// ─── Build chart data from localStorage ──────────────────────────────────────
// Build chart data from localStorage ──────────────────────────────────────
// In HydrationHistory.tsx, update both build functions:

// Build chart data from localStorage ──────────────────────────────────────
function buildFromLocalStorage(
  history: DayRecord[],
  todayConsumed: number,
  goalMl: number
): ChartEntry[] {
  const today = format(new Date(), "yyyy-MM-dd");
  return Array.from({ length: 7 }, (_, i) => {
    const date  = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
    const label = i === 6 ? "Today" : format(subDays(new Date(), 6 - i), "EEE");
    if (date === today) {
      return { 
        date, 
        label, 
        consumed: todayConsumed / 1000,  // Direct division, no rounding
        goal: goalMl / 1000, 
        isToday: true 
      };
    }
    const record = history.find((r) => r.date === date);
    return {
      date,
      label,
      consumed: record ? record.consumed / 1000 : 0,  // Direct division, no rounding
      goal: record ? record.goal / 1000 : goalMl / 1000,
      isToday: false,
    };
  });
}

// Build chart data from PostgreSQL response ────────────────────────────────
function buildFromDB(
  dbHistory: DBHistory[],
  todayConsumed: number,
  goalMl: number
): ChartEntry[] {
  const today = format(new Date(), "yyyy-MM-dd");
  return dbHistory.map((entry) => {
    const isToday = entry.date === today;
    return {
      date:     entry.date,
      label:    isToday ? "Today" : entry.day_label,
      consumed: isToday
        ? todayConsumed / 1000   // Use the live value from props
        : entry.total_liters,    // DB returns in liters
      goal:     entry.goal_ml ? entry.goal_ml / 1000 : goalMl / 1000,
      isToday,
    };
  });
}

// Also fix the CustomTooltip to show exact values:
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const consumed = payload[0]?.value ?? 0;
  const goal     = payload[0]?.payload?.goal ?? 0;
  const pct      = goal > 0 ? Math.round((consumed / goal) * 100) : 0;
  return (
    <div className="bg-blue-950/95 border border-cyan-400/30 rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-cyan-300 font-semibold mb-1">{label}</p>
      <p className="text-white">💧 <span className="font-bold">{consumed.toFixed(2)}L</span> consumed</p> {/* Show 2 decimals */}
      <p className="text-white/60">🎯 Goal: {goal.toFixed(1)}L</p>
      <p className={`font-semibold mt-1 ${pct >= 100 ? "text-green-400" : pct >= 60 ? "text-yellow-400" : "text-red-400"}`}>
        {pct}% of goal {pct >= 100 ? "✅" : pct >= 60 ? "🔸" : "❌"}
      </p>
    </div>
  );
}
// ─── Stats Strip ─────────────────────���────────────────────────────────────────
function StatsStrip({ data }: { data: ChartEntry[] }) {
  const nonZero      = data.filter((d) => d.consumed > 0);
  const avgConsumed  = nonZero.length > 0
    ? nonZero.reduce((s, d) => s + d.consumed, 0) / nonZero.length : 0;
  const goalMet      = nonZero.filter((d) => d.consumed >= d.goal).length;
  const streak       = (() => {
    let s = 0;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].consumed >= data[i].goal && data[i].consumed > 0) s++;
      else break;
    }
    return s;
  })();
  return (
    <div className="grid grid-cols-3 gap-3 mt-4">
      <div className="bg-white/5 rounded-2xl p-3 text-center">
        <TrendingUp className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
        <p className="text-white font-bold text-lg">{avgConsumed.toFixed(1)}L</p>
        <p className="text-white/50 text-xs">7-day avg</p>
      </div>
      <div className="bg-white/5 rounded-2xl p-3 text-center">
        <Award className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
        <p className="text-white font-bold text-lg">{goalMet}<span className="text-white/50 text-sm">/7</span></p>
        <p className="text-white/50 text-xs">Goals met</p>
      </div>
      <div className="bg-white/5 rounded-2xl p-3 text-center">
        <Droplets className="w-4 h-4 text-green-400 mx-auto mb-1" />
        <p className="text-white font-bold text-lg">{streak}<span className="text-white/50 text-sm">d</span></p>
        <p className="text-white/50 text-xs">Streak 🔥</p>
      </div>
    </div>
  );
}
// ─── Main Component ───────────────────────────────────────────────────────────
export default function HydrationHistory({
  todayConsumed,
  goalMl,
  userId,
  backendOnline,
}: HydrationHistoryProps) {
  const [chartData, setChartData]   = useState<ChartEntry[]>([]);
  const [dataSource, setDataSource] = useState<"db" | "local">("local");
  const [loading, setLoading]       = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>("");
  const goalL = goalMl / 1000;
  // Load chart data — from DB if available, otherwise localStorage
  async function loadData() {
    setLoading(true);
    try {
      if (backendOnline && userId) {
        const dbHistory = await getIntakeHistory(userId, 7);
        setChartData(buildFromDB(dbHistory, todayConsumed, goalMl));
        setDataSource("db");
        setLastRefresh(new Date().toLocaleTimeString());
      } else {
        const local = loadHistory();
        setChartData(buildFromLocalStorage(local, todayConsumed, goalMl));
        setDataSource("local");
      }
    } catch (err) {
      console.warn("⚠️ Failed to fetch DB history — falling back to localStorage:", err);
      const local = loadHistory();
      setChartData(buildFromLocalStorage(local, todayConsumed, goalMl));
      setDataSource("local");
    } finally {
      setLoading(false);
    }
  }
  // Re-fetch when consumed changes (live update today's bar)
 useEffect(() => {
  console.log(`HydrationHistory received todayConsumed: ${todayConsumed}ml`);
  loadData();
}, [todayConsumed, userId, backendOnline]);
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-cyan-300" />
            Hydration History
          </h3>
          <p className="text-white/50 text-xs mt-0.5">Last 7 days intake vs goal</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Data source badge */}
          {dataSource === "db" ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-400/10 border border-green-400/20 rounded-lg">
              <Database className="w-3 h-3 text-green-400" />
              <span className="text-green-300 text-xs font-semibold">PostgreSQL</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-400/10 border border-yellow-400/20 rounded-lg">
              <span className="text-yellow-300 text-xs font-semibold">💾 localStorage</span>
            </div>
          )}
          {/* Refresh button */}
          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
            title="Refresh history"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
      {/* Last refresh time (DB only) */}
      {dataSource === "db" && lastRefresh && (
        <p className="text-white/30 text-xs mb-3">Last synced from DB: {lastRefresh}</p>
      )}
      {/* Chart */}
      <div className="h-52">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
              <p className="text-white/50 text-xs">Loading from {dataSource === "db" ? "PostgreSQL" : "localStorage"}…</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={28} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="barGradientToday" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="barGradientGoal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ade80" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={[0, Math.ceil(goalL * 1.4)]}
                tickFormatter={(v) => `${v}L`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)", radius: 8 }} />
              <ReferenceLine
                y={goalL}
                stroke="#facc15"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{ value: `Goal ${goalL}L`, fill: "#facc15", fontSize: 10, position: "insideTopRight" }}
              />
              <Bar dataKey="consumed" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.consumed >= entry.goal
                        ? "url(#barGradientGoal)"
                        : entry.isToday
                        ? "url(#barGradientToday)"
                        : "url(#barGradient)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      {/* Color legend */}
      <div className="flex items-center gap-4 mt-2 text-xs justify-center">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gradient-to-b from-cyan-400 to-blue-500 inline-block" />
          <span className="text-white/50">Past days</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gradient-to-b from-violet-400 to-indigo-600 inline-block" />
          <span className="text-white/50">Today</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gradient-to-b from-green-400 to-green-600 inline-block" />
          <span className="text-white/50">Goal reached ✅</span>
        </span>
      </div>
      {/* Stats Strip */}
      <StatsStrip data={chartData} />
    </div>
  );
}
