"use strict";

const ZIP_CODE = /^\d{5}(?:-\d{4})?$/;

function jsonResponse(statusCode, payload, cache = "no-store") {
  return {
    statusCode,
    headers: {
      "Cache-Control": cache,
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    },
    body: JSON.stringify(payload)
  };
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "NEO-OS-Weather/1.0" },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Weather provider returned ${response.status}.`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function handler(event) {
  if (String(event.httpMethod || "GET").toUpperCase() !== "GET") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const input = String((event.queryStringParameters && event.queryStringParameters.zip) || "").trim();
  if (!ZIP_CODE.test(input)) return jsonResponse(400, { error: "Enter a valid 5-digit U.S. ZIP code." });
  const zip = input.slice(0, 5);

  try {
    const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geocodeUrl.search = new URLSearchParams({ name: zip, count: "5", language: "en", format: "json", countryCode: "US" });
    const geocode = await fetchJson(geocodeUrl);
    const places = Array.isArray(geocode.results) ? geocode.results : [];
    const place = places.find(item => Array.isArray(item.postcodes) && item.postcodes.includes(zip)) || places[0];
    if (!place || !Number.isFinite(Number(place.latitude)) || !Number.isFinite(Number(place.longitude))) {
      return jsonResponse(404, { error: "No U.S. location was found for that ZIP code." });
    }

    const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
    forecastUrl.search = new URLSearchParams({
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      precipitation_unit: "inch",
      timezone: "auto",
      forecast_days: "1"
    });
    const forecast = await fetchJson(forecastUrl);
    const current = forecast.current || {};
    const daily = forecast.daily || {};
    return jsonResponse(200, {
      zip,
      location: {
        name: String(place.name || zip),
        region: String(place.admin1 || ""),
        country: String(place.country_code || "US"),
        timezone: String(forecast.timezone || place.timezone || "")
      },
      current: {
        temperature: finite(current.temperature_2m),
        apparentTemperature: finite(current.apparent_temperature),
        humidity: finite(current.relative_humidity_2m),
        weatherCode: finite(current.weather_code),
        isDay: finite(current.is_day),
        precipitation: finite(current.precipitation),
        windSpeed: finite(current.wind_speed_10m),
        windDirection: finite(current.wind_direction_10m),
        windGusts: finite(current.wind_gusts_10m),
        observedAt: String(current.time || "")
      },
      today: {
        high: finite(Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[0] : null),
        low: finite(Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[0] : null),
        precipitationChance: finite(Array.isArray(daily.precipitation_probability_max) ? daily.precipitation_probability_max[0] : null)
      },
      units: { temperature: "°F", windSpeed: "mph", precipitation: "in" },
      fetchedAt: Date.now()
    }, "private, max-age=300");
  } catch (error) {
    return jsonResponse(502, { error: "Live weather is unavailable right now." });
  }
}
