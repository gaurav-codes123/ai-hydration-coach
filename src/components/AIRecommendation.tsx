/**
 * AIRecommendation.tsx — Feature 1
 * ==================================
 * Hydration Recommendation Explanation Panel
 * Shows WHY the model predicted a certain amount with visual factor bars,
 * impact badges, backend status, and personalized tips.
 */

import { Bot, CheckCircle, Lightbulb, Cpu, Wifi, WifiOff, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { checkBackendStatus, type HydrationPlan } from "../services/api";
import type { WeatherData } from "../services/weather";
interface AIRecommendationProps {
  plan: HydrationPlan;
  weather: WeatherData;
}
interface BackendStatus {
  online: boolean;
  modelLoaded: boolean;
  modelR2?: number;
  modelMAE?: number;
  checked: boolean;
}
// ─── Impact Badge ─────────────────────────────────────────────────────────────
function ImpactBadge({ impact }: { impact: string }) {
  const lower = impact.toLowerCase();
  const isPositive = lower.startsWith("+") || lower.includes("high") || lower.includes("youth");
  const isNeutral = lower === "neutral" || lower.includes("neutral");
  const isNegative = lower.startsWith("−") || lower.startsWith("-") || lower.includes("senior");
  const cls = isNeutral
    ? "bg-white/10 text-white/50 border-white/10"
    : isPositive
    ? "bg-cyan-400/15 text-cyan-300 border-cyan-400/30"
    : isNegative
    ? "bg-orange-400/15 text-orange-300 border-orange-400/30"
    : "bg-purple-400/15 text-purple-300 border-purple-400/30";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono border ${cls}`}>
      {impact}
    </span>
  );
}
// ─── Factor Row ───────────────────────────────────────────────────────────────
function FactorRow({
  factor,
  value,
  impact,
  description,
  index,
}: {
  factor: string;
  value: string;
  impact: string;
  description: string;
  index: number;
}) {
  const FACTOR_ICONS: Record<string, string> = {
    Temperature:    "🌡️",
    Humidity:       "💧",
    "Activity Level": "🏃",
    "Body Weight":  "⚖️",
    Age:            "🎂",
    Gender:         "👤",
  };
  const icon = FACTOR_ICONS[factor] ?? "📊";
  return (
    <div
      className="bg-white/5 hover:bg-white/10 transition-colors rounded-2xl p-3.5 border border-white/5 hover:border-white/10"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          {/* Top row: factor name + value + impact */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-white font-semibold text-sm">{factor}</span>
            <span className="text-cyan-300 text-xs font-mono bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/20">
              {value}
            </span>
          </div>
          {/* Impact badge */}
          <div className="mb-1.5">
            <ImpactBadge impact={impact} />
          </div>
          {/* Description */}
          <p className="text-white/50 text-xs leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
// ─── Recommendation Summary ───────────────────────────────────────────────────
function RecommendationSummary({
  plan,
  weather,
}: {
  plan: HydrationPlan;
  weather: WeatherData;
}) {
  const factors = plan.factors;
  // Classify the top reasons as simple bullets
  const bullets: string[] = [];
  const tempFactor = factors.find((f) => f.factor === "Temperature");
  if (tempFactor && !tempFactor.impact.toLowerCase().includes("neutral")) {
    const temp = weather.temperature;
    if (temp >= 35) bullets.push("Extreme heat — heavy sweating expected");
    else if (temp >= 30) bullets.push("Hot temperature — increased fluid loss");
    else if (temp >= 25) bullets.push("Warm conditions — slightly elevated needs");
    else if (temp < 10) bullets.push("Cool weather — slightly reduced needs");
  }
  const actFactor = factors.find((f) => f.factor === "Activity Level");
  if (actFactor) {
    const act = actFactor.value.toLowerCase();
    if (act === "extreme") bullets.push("Extreme activity level — maximum hydration needed");
    else if (act === "high") bullets.push("High activity level — significant fluid loss");
    else if (act === "moderate") bullets.push("Moderate activity — standard elevated needs");
  }
  const weightFactor = factors.find((f) => f.factor === "Body Weight");
  if (weightFactor) {
    const w = parseFloat(weightFactor.value);
    if (w >= 90) bullets.push("High body weight — greater base water requirement");
    else if (w >= 70) bullets.push("Body weight within active adult range");
  }
  const humFactor = factors.find((f) => f.factor === "Humidity");
  if (humFactor && !humFactor.impact.toLowerCase().includes("neutral")) {
    const h = parseFloat(humFactor.value);
    if (h > 70) bullets.push("High humidity — sweat evaporation is slower");
    else if (h < 30) bullets.push("Dry air — extra moisture loss through breathing");
  }
  const ageFactor = factors.find((f) => f.factor === "Age");
  if (ageFactor && !ageFactor.impact.toLowerCase().includes("neutral")) {
    if (ageFactor.impact.includes("youth")) bullets.push("Young age — faster metabolism");
    if (ageFactor.impact.includes("senior")) bullets.push("Senior age — reduced thirst sensation");
  }
  return (
    <div className="bg-gradient-to-br from-cyan-500/15 to-blue-600/15 border border-cyan-400/25 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-cyan-200 text-xs font-medium mb-0.5">📍 {weather.city} · {weather.temperature}°C · {weather.humidity}% humidity</p>
          <p className="text-white/60 text-xs">{weather.description}</p>
        </div>
        <div className="text-right">
          <p className="text-cyan-300 font-black text-3xl leading-none">{plan.dailyGoalLiters}L</p>
          <p className="text-white/50 text-xs">recommended</p>
        </div>
      </div>
      {/* Reason bullets */}
      {bullets.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-white/70 text-xs font-semibold mb-2">📋 Reason:</p>
          <ul className="space-y-1">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                <span className="text-cyan-400 mt-0.5 flex-shrink-0">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
// ─── Main Component ───────────────────────────────────────────────────────────
export default function AIRecommendation({ plan, weather }: AIRecommendationProps) {
  const [showAllFactors, setShowAllFactors] = useState(false);
  const [showAllTips, setShowAllTips] = useState(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    online: false,
    modelLoaded: false,
    checked: false,
  });
  useEffect(() => {
    checkBackendStatus().then((status) => {
      setBackendStatus({ ...status, checked: true });
    });
  }, []);
  const visibleFactors = showAllFactors ? plan.factors : plan.factors.slice(0, 3);
  const visibleTips = showAllTips ? plan.tips : plan.tips.slice(0, 3);
  const isBackendActive = backendStatus.online && backendStatus.modelLoaded;
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-xl space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-300" />
            AI Insight
          </h3>
          <p className="text-white/40 text-xs mt-0.5">Gradient Boosting model analysis</p>
        </div>
        {/* Backend status badge */}
        {backendStatus.checked && (
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border ${
              isBackendActive
                ? "bg-green-500/10 border-green-400/30 text-green-300"
                : "bg-orange-500/10 border-orange-400/30 text-orange-300"
            }`}
          >
            {isBackendActive ? (
              <Wifi className="w-3 h-3 flex-shrink-0" />
            ) : (
              <WifiOff className="w-3 h-3 flex-shrink-0" />
            )}
            <span>{isBackendActive ? "ML Active" : "Offline"}</span>
          </div>
        )}
      </div>
      {/* Backend ML detail strip */}
      {backendStatus.checked && isBackendActive && (
        <div className="flex items-center gap-2 bg-green-500/5 border border-green-400/20 rounded-xl px-3 py-2">
          <Cpu className="w-3.5 h-3.5 text-green-300 flex-shrink-0" />
          <p className="text-green-200/70 text-xs">
            <span className="font-semibold">{plan.modelUsed}</span>
            {backendStatus.modelR2 && ` · R²=${backendStatus.modelR2}`}
            {backendStatus.modelMAE && ` · MAE=${backendStatus.modelMAE}L`}
          </p>
        </div>
      )}
      {backendStatus.checked && !isBackendActive && (
        <div className="flex items-center gap-2 bg-orange-500/5 border border-orange-400/20 rounded-xl px-3 py-2">
          <Cpu className="w-3.5 h-3.5 text-orange-300 flex-shrink-0" />
          <p className="text-orange-200/70 text-xs">
            Using built-in formula — start FastAPI backend for ML model
          </p>
        </div>
      )}
      {/* ── Recommendation Summary Card ── */}
      <RecommendationSummary plan={plan} weather={weather} />
      {/* ── Drink Interval ── */}
      <div className="bg-blue-500/10 border border-blue-400/20 rounded-2xl px-4 py-3 flex items-center gap-3">
        <span className="text-2xl">⏰</span>
        <div>
          <p className="text-white/90 text-sm font-semibold">
            Drink every {plan.drinkIntervalHours} hour{plan.drinkIntervalHours !== 1 ? "s" : ""}
          </p>
          <p className="text-white/40 text-xs">~250ml per session over your 16-hour day</p>
        </div>
      </div>
      {/* ── Factor Breakdown ── */}
      <div>
        <p className="text-cyan-200 text-sm font-semibold mb-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Why this amount? ({plan.factors.length} factors)
        </p>
        <div className="space-y-2">
          {visibleFactors.map((f, i) => (
            <FactorRow
              key={i}
              index={i}
              factor={f.factor}
              value={f.value}
              impact={f.impact}
              description={f.description}
            />
          ))}
        </div>
        {plan.factors.length > 3 && (
          <button
            onClick={() => setShowAllFactors(!showAllFactors)}
            className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 text-xs mt-3 transition-colors font-medium"
          >
            {showAllFactors ? (
              <><ChevronUp className="w-3.5 h-3.5" /> Show fewer factors</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5" /> Show {plan.factors.length - 3} more factors</>
            )}
          </button>
        )}
      </div>
      {/* ── Tips ── */}
      <div>
        <p className="text-yellow-300 text-sm font-semibold mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          Hydration Tips
        </p>
        <div className="space-y-2">
          {visibleTips.map((tip, i) => (
            <div key={i} className="flex gap-2.5 items-start bg-yellow-400/5 border border-yellow-400/10 rounded-xl px-3 py-2.5">
              <span className="text-yellow-400 text-xs flex-shrink-0 mt-0.5 font-bold w-4">{i + 1}.</span>
              <p className="text-white/65 text-xs leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
        {plan.tips.length > 3 && (
          <button
            onClick={() => setShowAllTips(!showAllTips)}
            className="flex items-center gap-1.5 text-yellow-400 hover:text-yellow-300 text-xs mt-3 transition-colors font-medium"
          >
            {showAllTips ? (
              <><ChevronUp className="w-3.5 h-3.5" /> Show fewer tips</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5" /> Show {plan.tips.length - 3} more tips</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
