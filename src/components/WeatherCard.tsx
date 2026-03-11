import { Thermometer, Droplets, Wind } from "lucide-react";
import type { WeatherData } from "../services/weather";

interface WeatherCardProps {
  weather: WeatherData;
}

function getTempColor(temp: number): string {
  if (temp >= 40) return "text-red-400";
  if (temp >= 35) return "text-orange-400";
  if (temp >= 25) return "text-yellow-300";
  if (temp >= 15) return "text-cyan-300";
  return "text-blue-300";
}

function getWeatherEmoji(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes("clear")) return "☀️";
  if (d.includes("partly")) return "⛅";
  if (d.includes("cloud")) return "☁️";
  if (d.includes("fog")) return "🌫️";
  if (d.includes("drizzle")) return "🌦️";
  if (d.includes("rain")) return "🌧️";
  if (d.includes("snow")) return "❄️";
  if (d.includes("thunder")) return "⛈️";
  return "🌡️";
}

export default function WeatherCard({ weather }: WeatherCardProps) {
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-xl">
      <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
        <Thermometer className="w-5 h-5 text-orange-300" />
        Current Weather
      </h3>

      <div className="text-center mb-4">
        <div className="text-5xl mb-2">{getWeatherEmoji(weather.description)}</div>
        <p className="text-white/80 font-medium">{weather.city}</p>
        <p className="text-white/60 text-sm">{weather.description}</p>
      </div>

      <div className={`text-center text-5xl font-black mb-4 ${getTempColor(weather.temperature)}`}>
        {weather.temperature}°C
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-cyan-300 text-xs mb-1">
            <Droplets className="w-3 h-3" /> Humidity
          </div>
          <p className="text-white font-bold">{weather.humidity}%</p>
        </div>
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-orange-300 text-xs mb-1">
            <Wind className="w-3 h-3" /> Feels Like
          </div>
          <p className="text-white font-bold">{weather.feelsLike}°C</p>
        </div>
      </div>

      {weather.temperature >= 35 && (
        <div className="mt-3 bg-red-400/20 border border-red-400/40 rounded-xl px-4 py-2 text-center">
          <p className="text-red-300 text-sm font-semibold">⚠️ Extreme heat — drink more often!</p>
        </div>
      )}
      {weather.temperature >= 25 && weather.temperature < 35 && (
        <div className="mt-3 bg-yellow-400/20 border border-yellow-400/40 rounded-xl px-4 py-2 text-center">
          <p className="text-yellow-300 text-sm font-semibold">🌡️ Warm weather — stay hydrated</p>
        </div>
      )}
    </div>
  );
}
