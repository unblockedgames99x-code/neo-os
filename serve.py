from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, urlparse
from urllib.request import Request, urlopen
import json
import os
import time


ROOT = Path(__file__).resolve().parent
PORT = 3091


class NeoHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/.netlify/functions/neo-weather":
            return self.weather(parse_qs(parsed.query).get("zip", [""])[0])
        if parsed.path == "/.netlify/functions/neo-music-search":
            return self.music_search(parsed.query)
        return super().do_GET()

    def weather(self, zip_code):
        value = zip_code.strip()
        if len(value) not in (5, 10) or not value[:5].isdigit() or (len(value) == 10 and (value[5] != "-" or not value[6:].isdigit())):
            return self.send_json(400, {"error": "Enter a valid 5-digit U.S. ZIP code."})
        zip_code = value[:5]
        try:
            geocode_url = "https://geocoding-api.open-meteo.com/v1/search?name=" + quote(zip_code) + "&count=5&language=en&format=json&countryCode=US"
            request = Request(geocode_url, headers={"Accept": "application/json", "User-Agent": "NEO-OS-Weather/1.0"})
            with urlopen(request, timeout=8) as response:
                geocode = json.loads(response.read().decode("utf-8"))
            places = geocode.get("results", [])
            place = next((item for item in places if zip_code in item.get("postcodes", [])), places[0] if places else None)
            if not place:
                return self.send_json(404, {"error": "No U.S. location was found for that ZIP code."})
            params = (
                "latitude=" + quote(str(place["latitude"])) +
                "&longitude=" + quote(str(place["longitude"])) +
                "&current=temperature_2m%2Crelative_humidity_2m%2Capparent_temperature%2Cis_day%2Cprecipitation%2Cweather_code%2Cwind_speed_10m%2Cwind_direction_10m%2Cwind_gusts_10m" +
                "&daily=temperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_probability_max" +
                "&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=1"
            )
            request = Request("https://api.open-meteo.com/v1/forecast?" + params, headers={"Accept": "application/json", "User-Agent": "NEO-OS-Weather/1.0"})
            with urlopen(request, timeout=8) as response:
                forecast = json.loads(response.read().decode("utf-8"))
            current = forecast.get("current", {})
            daily = forecast.get("daily", {})
            first = lambda name: (daily.get(name) or [None])[0]
            payload = {
                "zip": zip_code,
                "location": {
                    "name": str(place.get("name", zip_code)),
                    "region": str(place.get("admin1", "")),
                    "country": str(place.get("country_code", "US")),
                    "timezone": str(forecast.get("timezone", place.get("timezone", "")))
                },
                "current": {
                    "temperature": current.get("temperature_2m"),
                    "apparentTemperature": current.get("apparent_temperature"),
                    "humidity": current.get("relative_humidity_2m"),
                    "weatherCode": current.get("weather_code"),
                    "isDay": current.get("is_day"),
                    "precipitation": current.get("precipitation"),
                    "windSpeed": current.get("wind_speed_10m"),
                    "windDirection": current.get("wind_direction_10m"),
                    "windGusts": current.get("wind_gusts_10m"),
                    "observedAt": str(current.get("time", ""))
                },
                "today": {
                    "high": first("temperature_2m_max"),
                    "low": first("temperature_2m_min"),
                    "precipitationChance": first("precipitation_probability_max")
                },
                "units": {"temperature": "°F", "windSpeed": "mph", "precipitation": "in"},
                "fetchedAt": int(time.time() * 1000)
            }
            return self.send_json(200, payload)
        except Exception:
            return self.send_json(502, {"error": "Live weather is unavailable right now."})

    def music_search(self, query_string):
        query = parse_qs(query_string).get("q", [""])[0].strip()
        if not query or len(query) > 120:
            return self.send_json(400, {"error": "Enter a valid search"})

        url = "https://vcsa.huangqirui.xyz/api/music/search?q=" + quote(query)
        try:
            request = Request(url, headers={"Accept": "application/json", "User-Agent": "NEO-TV/1.0"})
            with urlopen(request, timeout=8) as response:
                payload = json.loads(response.read().decode("utf-8"))
            return self.send_json(200, payload)
        except Exception:
            return self.send_json(502, {"error": "Music search is unavailable"})

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "public, max-age=30")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("127.0.0.1", PORT), NeoHandler)
    print(f"NEO OS preview: http://localhost:{PORT}/neo-os/")
    server.serve_forever()
