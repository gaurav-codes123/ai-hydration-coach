/**
 * WaterTracker.tsx — Feature 2
 * =============================
 * Production-level water tracker with:
 *  - Animated water fill bottle visualization
 *  - Daily Goal / Consumed / Remaining stat cards
 *  - Preset + custom intake buttons
 *  - Milestone celebrations
 */
import React, { useEffect, useRef } from "react";
import { Droplets, Plus, RotateCcw, CheckCircle, Database } from "lucide-react";
// interface WaterTrackerProps {
//   consumed: number; // ml
//   goal: number;     // ml
//   onAdd: (ml: number, notes?: string) => void;
//   onReset: () => void;
//   backendOnline?: boolean;
// }
interface WaterTrackerProps {
  consumed:      number;
  goal:          number;
  onAdd:         (ml: number, notes?: string) => void;
  onUndo:        () => void;
  onReset:       () => void;
  backendOnline?: boolean;
  isSyncing?:    boolean;   // show syncing spinner in header
  lastAdded?:    number;    // if 0, undo button is disabled
}
const PRESETS = [
  { label: "+250 ml", value: 250, icon: "☕", desc: "Small cup" },
  { label: "+500 ml", value: 500, icon: "🥤", desc: "Bottle" },
  { label: "+750 ml", value: 750, icon: "🧴", desc: "Large bottle" },
  { label: "+1 L",    value: 1000, icon: "🍶", desc: "Full litre" },
];
const MILESTONES = [25, 50, 75, 100];
// ─── Animated Water Bottle ────────────────────────────────────────────────────
function WaterBottle({ percent }: { percent: number }) {
  const clampedPct = Math.min(100, Math.max(0, percent));
  const fillHeight = clampedPct;                   // % of bottle height
  const fillY = 100 - fillHeight;                  // SVG y coordinate (0 = top)
  const color =
    clampedPct >= 100
      ? ["#4ade80", "#22c55e"]
      : clampedPct >= 60
      ? ["#22d3ee", "#06b6d4"]
      : clampedPct >= 25
      ? ["#60a5fa", "#3b82f6"]
      : ["#818cf8", "#6366f1"];
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 60 120" width={90} height={180} className="drop-shadow-xl">
        <defs>
          <clipPath id="bottleClip">
            {/* Bottle shape: neck + body */}
            <path d="M22,0 L22,15 Q14,20 12,30 L12,110 Q12,118 20,118 L40,118 Q48,118 48,110 L48,30 Q46,20 38,15 L38,0 Z" />
          </clipPath>
          <linearGradient id="fillGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color[0]} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color[1]} stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="bottleGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </linearGradient>
        </defs>
        {/* Bottle outline */}
        <path
          d="M22,0 L22,15 Q14,20 12,30 L12,110 Q12,118 20,118 L40,118 Q48,118 48,110 L48,30 Q46,20 38,15 L38,0 Z"
          fill="url(#bottleGrad)"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.5"
        />
        {/* Water fill — animated via CSS transition */}
        <g clipPath="url(#bottleClip)">
          {/* Water fill rect */}
          <rect
            x="0"
            y={`${fillY}%`}
            width="60"
            height={`${fillHeight}%`}
            fill="url(#fillGrad)"
            style={{ transition: "y 0.8s cubic-bezier(0.34,1.56,0.64,1)" }}
          />
          {/* Wave effect on top of fill */}
          {clampedPct < 100 && clampedPct > 0 && (
            <g>
              <path
                d={`M0,${fillY}% Q15,${fillY - 2}% 30,${fillY}% Q45,${fillY + 2}% 60,${fillY}%`}
                fill="none"
                stroke={color[0]}
                strokeWidth="2"
                strokeOpacity="0.6"
                style={{ transition: "d 0.8s ease" }}
              />
            </g>
          )}
          {/* Bubbles */}
          {clampedPct > 10 && (
            <>
              <circle cx="20" cy={fillY + fillHeight * 0.3 + "%"} r="1.5" fill="white" fillOpacity="0.3" />
              <circle cx="35" cy={fillY + fillHeight * 0.6 + "%"} r="1" fill="white" fillOpacity="0.2" />
              <circle cx="25" cy={fillY + fillHeight * 0.8 + "%"} r="2" fill="white" fillOpacity="0.15" />
            </>
          )}
        </g>
        {/* Shimmer highlight */}
        <path
          d="M16,30 Q14,65 16,100"
          stroke="white"
          strokeWidth="2"
          strokeOpacity="0.15"
          fill="none"
          strokeLinecap="round"
        />
        {/* % label inside bottle */}
        <text
          x="30"
          y="75"
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
          fill="white"
          fillOpacity="0.9"
        >
          {clampedPct}%
        </text>
      </svg>
      {/* Status label under bottle */}
      <p className="text-xs text-white/50 mt-1 text-center">
        {clampedPct >= 100
          ? "🎉 Goal reached!"
          : clampedPct >= 75
          ? "Almost there!"
          : clampedPct >= 50
          ? "Halfway there"
          : clampedPct >= 25
          ? "Keep going"
          : "Start drinking"}
      </p>
    </div>
  );
}
// ─── Milestone Bar ────────────────────────────────────────────────────────────
function MilestoneLine({ percent }: { percent: number }) {
  return (
    <div className="relative w-full h-4 mt-1">
      {/* Track */}
      <div className="absolute inset-0 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            percent >= 100
              ? "bg-gradient-to-r from-green-400 to-emerald-400"
              : percent >= 60
              ? "bg-gradient-to-r from-cyan-400 to-blue-500"
              : "bg-gradient-to-r from-blue-400 to-indigo-500"
          }`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      {/* Milestone ticks */}
      {MILESTONES.map((m) => (
        <div
          key={m}
          className="absolute top-0 h-4 flex flex-col items-center"
          style={{ left: `${m}%`, transform: "translateX(-50%)" }}
        >
          <div
            className={`w-0.5 h-full rounded-full transition-colors duration-500 ${
              percent >= m ? "bg-white/70" : "bg-white/20"
            }`}
          />
        </div>
      ))}
    </div>
  );
}
// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  icon: string;
}) {
  return (
    <div className={`bg-white/5 border rounded-2xl p-4 text-center flex flex-col items-center gap-1 ${color}`}>
      <span className="text-xl">{icon}</span>
      <p className="text-white font-black text-xl leading-tight">{value}</p>
      <p className="text-white/80 text-xs font-semibold">{label}</p>
      <p className="text-white/40 text-xs">{sub}</p>
    </div>
  );
}
// ─── Main Component ───────────────────────────────────────────────────────────
export default function WaterTracker({
  consumed,
  goal,
  onAdd,
  onUndo,
  onReset,
  backendOnline,
  isSyncing  = false,
  lastAdded  = 0,
}: WaterTrackerProps) {
  const percent   = Math.min(100, Math.round((consumed / goal) * 100));
  const remaining = Math.max(0, goal - consumed);
  const prevPct   = useRef(0);
  // Milestone toast ref
  const toastRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const crossedMilestone = MILESTONES.find(
      (m) => prevPct.current < m && percent >= m
    );
    if (crossedMilestone && toastRef.current) {
      toastRef.current.textContent =
        crossedMilestone === 100
          ? "🎉 You've hit your daily goal!"
          : `💧 ${crossedMilestone}% milestone reached!`;
      toastRef.current.classList.remove("opacity-0", "translate-y-2");
      toastRef.current.classList.add("opacity-100", "translate-y-0");
      setTimeout(() => {
        if (toastRef.current) {
          toastRef.current.classList.add("opacity-0", "translate-y-2");
          toastRef.current.classList.remove("opacity-100", "translate-y-0");
        }
      }, 2800);
    }
    prevPct.current = percent;
  }, [percent]);
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      {/* Milestone toast */}
      <div
        ref={toastRef}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-cyan-400/20 border border-cyan-400/40 text-cyan-200 text-sm font-semibold px-5 py-2 rounded-full shadow-lg opacity-0 translate-y-2 transition-all duration-500 whitespace-nowrap pointer-events-none"
      />
       {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <Droplets className="w-5 h-5 text-cyan-300" />
          Water Tracker
        </h3>
        <div className="flex items-center gap-2">
          {/* DB sync indicator */}
           {/* DB sync indicator */}
          {isSyncing ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-400/10 border border-blue-400/20 rounded-lg">
              <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
              <span className="text-blue-300 text-xs">Syncing...</span>
            </div>
          ) : backendOnline ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-400/10 border border-green-400/20 rounded-lg">
              <Database className="w-3 h-3 text-green-400" />
              <span className="text-green-300 text-xs">DB Sync</span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-400/10 border border-yellow-400/20 rounded-lg">
              <span className="text-yellow-300 text-xs">💾 Local</span>
            </div>
          )}
          <button
            onClick={onUndo}
            disabled={lastAdded === 0}
            title={lastAdded > 0 ? `Undo last +${lastAdded}ml` : "Nothing to undo"}
            className="flex items-center gap-1.5 text-yellow-400/70 hover:text-yellow-300 text-xs transition px-3 py-1.5 rounded-lg hover:bg-yellow-400/10 border border-transparent hover:border-yellow-400/20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↩ Undo {lastAdded > 0 ? `(${lastAdded}ml)` : ""}
          </button>
        </div>
      </div>
      {/* Main layout: bottle + stats */}
      <div className="flex gap-6 items-center mb-6">
        {/* Bottle visualization */}
        <div className="flex-shrink-0">
          <WaterBottle percent={percent} />
        </div>
        {/* Stat cards */}
        <div className="flex-1 grid grid-rows-3 gap-3">
          <StatCard
            icon="🎯"
            label="Daily Goal"
            value={`${(goal / 1000).toFixed(1)}L`}
            sub={`${goal} ml`}
            color="border-cyan-400/20"
          />
          <StatCard
            icon="💧"
            label="Consumed"
            value={`${(consumed / 1000).toFixed(2)}L`}
            sub={`${consumed} ml`}
            color="border-green-400/20"
          />
          <StatCard
            icon="⏳"
            label="Remaining"
            value={`${(remaining / 1000).toFixed(2)}L`}
            sub={`${remaining} ml`}
            color="border-orange-400/20"
          />
        </div>
      </div>
      {/* Progress bar with milestones */}
      <div className="mb-1">
        <div className="flex justify-between text-xs text-white/40 mb-1">
          <span>0L</span>
          <span className="text-white font-semibold text-sm">{percent}% of goal</span>
          <span>{(goal / 1000).toFixed(1)}L</span>
        </div>
        <MilestoneLine percent={percent} />
        <div className="flex justify-between text-xs text-white/30 mt-1 px-0.5">
          {MILESTONES.map((m) => (
            <span key={m} className={percent >= m ? "text-cyan-400" : ""}>
              {m}%
            </span>
          ))}
        </div>
      </div>
      {/* Goal achieved banner */}
      {percent >= 100 && (
        <div className="mt-4 bg-green-400/15 border border-green-400/30 rounded-2xl p-3 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-green-300 font-semibold text-sm">Daily goal achieved! 🎉</p>
            <p className="text-green-200/60 text-xs">Great job staying hydrated today!</p>
          </div>
        </div>
      )}
      {/* Separator */}
      <div className="border-t border-white/10 my-5" />
      {/* Preset buttons */}
      <p className="text-white/50 text-xs mb-3 font-medium uppercase tracking-wide">Quick Add</p>
      <div className="grid grid-cols-2 gap-3">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => onAdd(p.value)}
            className="group flex items-center gap-3 py-3 px-4 bg-white/5 hover:bg-cyan-400/20 border border-white/10 hover:border-cyan-400/40 rounded-2xl text-white transition-all duration-200"
          >
            <span className="text-xl">{p.icon}</span>
            <div className="text-left">
              <p className="text-sm font-semibold group-hover:text-cyan-200 transition-colors">
                {p.label}
              </p>
              <p className="text-xs text-white/40">{p.desc}</p>
            </div>
          </button>
        ))}
      </div>
      {/* Custom amount */}
      <CustomAmountInput onAdd={onAdd} />
    </div>
  );
}
// ─── Custom Amount ────────────────────────────────────────────────────────────
function CustomAmountInput({ onAdd }: { onAdd: (ml: number) => void }) {
  const [val, setVal] = React.useState("");
  const [error, setError] = React.useState("");
  function handleAdd() {
    const n = parseInt(val);
    if (!n || n <= 0) {
      setError("Enter a positive amount");
      return;
    }
    if (n > 5000) {
      setError("Max 5000 ml at once");
      return;
    }
    onAdd(n);
    setVal("");
    setError("");
  }
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleAdd();
  }
  return (
    <div className="mt-3">
      <p className="text-white/50 text-xs mb-2 font-medium uppercase tracking-wide">Custom Amount</p>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="number"
            value={val}
            onChange={(e) => { setVal(e.target.value); setError(""); }}
            onKeyDown={handleKey}
            placeholder="Enter ml (e.g. 350)"
            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition text-sm"
            min={1}
            max={5000}
          />
          {error && (
            <p className="absolute -bottom-5 left-1 text-red-400 text-xs">{error}</p>
          )}
        </div>
        <button
          onClick={handleAdd}
          className="px-5 py-3 bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-blue-950 font-bold rounded-xl transition-all flex items-center gap-1.5 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>
    </div>
  );
}
