export interface WeatherData {
  temperature: number;
  description: string;
  city: string;
  humidity: number;
  feelsLike: number;
}

// Using Open-Meteo (free, no API key required) + geocoding
export async function fetchWeatherByCity(city: string): Promise<WeatherData> {
  // Step 1: Geocode the city name
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
  );
  if (!geoRes.ok) throw new Error("Geocoding failed");
  const geoData = await geoRes.json();
  if (!geoData.results || geoData.results.length === 0) {
    throw new Error("City not found");
  }
  const { latitude, longitude, name } = geoData.results[0];

  // Step 2: Fetch weather
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&temperature_unit=celsius`
  );
  if (!weatherRes.ok) throw new Error("Weather fetch failed");
  const weatherData = await weatherRes.json();

  const current = weatherData.current;
  const wmoCode = current.weather_code;

  const description = wmoToDescription(wmoCode);

  return {
    temperature: Math.round(current.temperature_2m),
    description,
    city: name,
    humidity: current.relative_humidity_2m,
    feelsLike: Math.round(current.apparent_temperature),
  };
}

function wmoToDescription(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 49) return "Foggy";
  if (code <= 59) return "Drizzle";
  if (code <= 69) return "Rain";
  if (code <= 79) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
}
