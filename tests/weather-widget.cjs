const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const runtime = read('neo-os', 'neo-skins.js');
const styles = read('neo-os', 'neo-skin-interactions.css');
const preview = read('local-preview.mjs');
const deployedProxy = read('netlify', 'functions', 'neo-weather.js');
const index = read('neo-os', 'index.html');

assert.match(runtime, /Enter a U\.S\. ZIP code for live local conditions/);
assert.match(runtime, /autocomplete="postal-code"/);
assert.match(runtime, /data-weather-setup/);
assert.match(runtime, /data-weather-action="refresh"/);
assert.match(runtime, /data-weather-action="change"/);
assert.match(runtime, /weatherZip/);
assert.match(runtime, /weatherData/);
assert.match(runtime, /WEATHER_TTL=15\*60\*1000/);
assert.match(runtime, /\/\.netlify\/functions\/neo-weather/);
assert.doesNotMatch(runtime, /api\.open-meteo\.com|geocoding-api\.open-meteo\.com/,
  'the widget must use the same-site proxy instead of contacting providers itself');

assert.match(styles, /data-skin-type="weather"/);
assert.match(styles, /\.skin-weather form/);
assert.match(styles, /\.skin-weather-current/);
assert.match(styles, /\.skin-weather-error/);
assert.match(index, /neo-skin-interactions\.css\?v=20260907-live-weather-v1/);
assert.match(index, /neo-skins\.js\?v=20260907-live-weather-v1/);

for (const proxy of [preview, deployedProxy]) {
  assert.match(proxy, /geocoding-api\.open-meteo\.com\/v1\/search/);
  assert.match(proxy, /api\.open-meteo\.com\/v1\/forecast/);
  assert.match(proxy, /countryCode/);
  assert.match(proxy, /temperature_2m/);
  assert.match(proxy, /apparent_temperature/);
  assert.match(proxy, /weather_code/);
  assert.match(proxy, /wind_speed_10m/);
}
assert.match(preview, /weatherCache/);
assert.match(preview, /staleUntil/);

(async () => {
  const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(deployedProxy).toString('base64');
  const { handler } = await import(moduleUrl);
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async url => {
    calls.push(String(url));
    if (String(url).includes('geocoding-api')) {
      return { ok: true, status: 200, json: async () => ({ results: [{ name: 'Beverly Hills', admin1: 'California', country_code: 'US', latitude: 34.09, longitude: -118.41, timezone: 'America/Los_Angeles', postcodes: ['90210'] }] }) };
    }
    return { ok: true, status: 200, json: async () => ({ timezone: 'America/Los_Angeles', current: { temperature_2m: 72.4, apparent_temperature: 71.8, relative_humidity_2m: 41, weather_code: 0, is_day: 1, precipitation: 0, wind_speed_10m: 6.2, wind_direction_10m: 240, wind_gusts_10m: 10, time: '2026-09-07T12:00' }, daily: { temperature_2m_max: [79], temperature_2m_min: [61], precipitation_probability_max: [2] } }) };
  };

  try {
    const invalid = await handler({ httpMethod: 'GET', queryStringParameters: { zip: 'abc' } });
    assert.equal(invalid.statusCode, 400);
    assert.equal(calls.length, 0, 'invalid ZIP codes must never reach the provider');

    const result = await handler({ httpMethod: 'GET', queryStringParameters: { zip: '90210' } });
    assert.equal(result.statusCode, 200);
    const body = JSON.parse(result.body);
    assert.equal(body.zip, '90210');
    assert.deepEqual(body.location, { name: 'Beverly Hills', region: 'California', country: 'US', timezone: 'America/Los_Angeles' });
    assert.equal(body.current.temperature, 72.4);
    assert.equal(body.today.high, 79);
    assert.equal(calls.length, 2);
    assert.match(calls[0], /countryCode=US/);
    assert.match(calls[1], /temperature_unit=fahrenheit/);
  } finally {
    global.fetch = originalFetch;
  }

  console.log('Live ZIP weather widget and proxy checks passed.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
