// Dependency-free, loopback-only offline preview. Run: node local-preview.mjs
// A future CDN migration must explicitly extend CSP for the chosen asset origin.
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, realpath, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

// Test optimized/publish-ready output without copying this server into the
// artifact. Ordinary local use still serves the repository as before.
const root = await realpath(process.env.NEO_STATIC_ROOT || path.dirname(fileURLToPath(import.meta.url)));
const port = Number(process.env.NEO_LOCAL_PORT || 3092);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.ico':'image/x-icon','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.m4a':'audio/mp4','.aac':'audio/aac','.flac':'audio/flac','.mp4':'video/mp4','.webm':'video/webm','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.otf':'font/otf','.wasm':'application/wasm','.txt':'text/plain; charset=utf-8'};
// Inline script/style allowances retain the existing self-contained local games.
// The main OS stays local-first. Network-capable apps receive route-scoped
// policies while ordinary desktop pages remain self-only.
const csp = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://fastly.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: data:; font-src 'self' data:; connect-src 'self' blob: https://a.luminsdk.com https://cdn.jsdelivr.net https://fastly.jsdelivr.net https://pipedapi.ducks.party https://api.piped.private.coffee https://lol.samidy.workers.dev https://lunchbreak.dyercountylawncare.workers.dev https://neo-stratus-api-w6nw.onrender.com wss://cleanhost5896.b-cdn.net wss://nextnode9124.b-cdn.net wss://probuildingsupplies.com wss://wisp.mercurywork.shop; frame-src 'self' blob: https://a.luminsdk.com https://nextnode9124.b-cdn.net; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";
const browserCsp = "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' data: blob:; style-src 'self' 'unsafe-inline' data: blob:; img-src 'self' data: blob: https:; media-src 'self' data: blob:; font-src 'self' data: blob:; connect-src 'self' data: blob: wss:; frame-src 'self' data: blob:; worker-src 'self' data: blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";
const musicCsp = "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; media-src 'self' data: blob: https: http://127.0.0.1:3000 http://127.0.0.1:4179; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' data: blob: https: http://127.0.0.1:3000 http://127.0.0.1:4179 wss:; frame-src 'self' blob: https://challenges.cloudflare.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self' https:; frame-ancestors 'self'";
const onlineAppCsp = "default-src 'self' data: blob: https: http:; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' data: blob: https: http:; style-src 'self' 'unsafe-inline' data: blob: https: http:; img-src 'self' data: blob: https: http:; media-src 'self' data: blob: https: http:; font-src 'self' data: https: http:; connect-src 'self' data: blob: https: http: wss: ws:; frame-src 'self' data: blob: https: http:; worker-src 'self' data: blob:; object-src 'none'; base-uri 'self'; form-action 'self' https: http:; frame-ancestors 'self'";
const blocked = /^(?:\/google-script[^/]*|\/neo-os\/(?:neo-runner-(?:host|network)\.js|music-v3\/))/i;
const safeGames = new Set(['grandmaster-chess.html','quantum-clicker.html','tetris.html','web-dashers.html']);
const weatherCache = new Map();
const musicSearchCache = new Map();
const fullSongProvider = 'https://vcsa.huangqirui.xyz';
const ZIP_CODE = /^\d{5}(?:-\d{4})?$/;

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const upstream = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'NEO-OS-Weather/1.0' },
      signal: controller.signal
    });
    if (!upstream.ok) throw new Error(`Weather provider returned ${upstream.status}.`);
    return await upstream.json();
  } finally {
    clearTimeout(timer);
  }
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function weatherForZip(input) {
  const zip = String(input || '').trim().slice(0, 5);
  if (!ZIP_CODE.test(String(input || '').trim())) {
    const error = new Error('Enter a valid 5-digit U.S. ZIP code.');
    error.status = 400;
    throw error;
  }

  const cached = weatherCache.get(zip);
  if (cached && cached.expiresAt > Date.now()) return cached.payload;

  try {
    const geocodeUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
    geocodeUrl.search = new URLSearchParams({ name: zip, count: '5', language: 'en', format: 'json', countryCode: 'US' });
    const geocode = await fetchJson(geocodeUrl);
    const places = Array.isArray(geocode.results) ? geocode.results : [];
    const place = places.find(item => Array.isArray(item.postcodes) && item.postcodes.includes(zip)) || places[0];
    if (!place || !Number.isFinite(Number(place.latitude)) || !Number.isFinite(Number(place.longitude))) {
      const error = new Error('No U.S. location was found for that ZIP code.');
      error.status = 404;
      throw error;
    }

    const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
    forecastUrl.search = new URLSearchParams({
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      temperature_unit: 'fahrenheit',
      wind_speed_unit: 'mph',
      precipitation_unit: 'inch',
      timezone: 'auto',
      forecast_days: '1'
    });
    const forecast = await fetchJson(forecastUrl);
    const current = forecast.current || {};
    const daily = forecast.daily || {};
    const payload = {
      zip,
      location: {
        name: String(place.name || zip),
        region: String(place.admin1 || ''),
        country: String(place.country_code || 'US'),
        timezone: String(forecast.timezone || place.timezone || '')
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
        observedAt: String(current.time || '')
      },
      today: {
        high: finite(Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[0] : null),
        low: finite(Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[0] : null),
        precipitationChance: finite(Array.isArray(daily.precipitation_probability_max) ? daily.precipitation_probability_max[0] : null)
      },
      units: { temperature: '°F', windSpeed: 'mph', precipitation: 'in' },
      fetchedAt: Date.now()
    };
    weatherCache.set(zip, { payload, expiresAt: Date.now() + 10 * 60_000, staleUntil: Date.now() + 6 * 60 * 60_000 });
    return payload;
  } catch (error) {
    if (cached && cached.staleUntil > Date.now()) return { ...cached.payload, stale: true };
    throw error;
  }
}

async function searchMusic(input) {
  const query = String(input || '').trim();
  if (!query || query.length > 120) {
    const error = new Error('Enter a valid music search.');
    error.status = 400;
    throw error;
  }

  const key = query.toLocaleLowerCase('en-US');
  const cached = musicSearchCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.payload;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const upstream = new URL('https://vcsa.huangqirui.xyz/api/music/search');
    upstream.searchParams.set('q', query);
    const result = await fetch(upstream, {
      headers: { Accept: 'application/json', 'User-Agent': 'NEO-OS-Music/1.0' },
      signal: controller.signal
    });
    if (!result.ok) throw new Error(`Music provider returned ${result.status}.`);
    const payload = await result.json();
    if (!payload || !Array.isArray(payload.tracks)) throw new Error('Music provider returned an invalid response.');
    musicSearchCache.set(key, { payload, expiresAt: Date.now() + 5 * 60_000 });
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

async function streamMusic(trackId, request, response) {
  const id = String(trackId || '').trim();
  if (!/^[A-Za-z0-9_-]{6,24}$/.test(id)) {
    const error = new Error('The music stream ID is invalid.');
    error.status = 400;
    throw error;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const headers = {
      Accept: 'audio/*,video/mp4;q=0.9,*/*;q=0.1',
      'User-Agent': 'NEO-OS-Music/1.0'
    };
    if (request.headers.range) headers.Range = request.headers.range;
    const upstream = await fetch(`${fullSongProvider}/api/yt/astream/${encodeURIComponent(id)}`, {
      method: request.method,
      headers,
      signal: controller.signal
    });
    if (!upstream.ok && upstream.status !== 206) {
      const error = new Error(`Music stream returned ${upstream.status}.`);
      error.status = upstream.status === 404 ? 404 : 502;
      throw error;
    }

    const responseHeaders = {
      'Content-Type': upstream.headers.get('content-type') || 'audio/mp4',
      'Cache-Control': 'private, max-age=300',
      'Accept-Ranges': upstream.headers.get('accept-ranges') || 'bytes',
      'Cross-Origin-Resource-Policy': 'same-origin'
    };
    for (const name of ['content-length', 'content-range']) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders[name] = value;
    }
    response.writeHead(upstream.status, responseHeaders);
    if (request.method === 'HEAD' || !upstream.body) return response.end();
    Readable.fromWeb(upstream.body).on('error', () => response.destroy()).pipe(response);
  } finally {
    clearTimeout(timer);
  }
}

http.createServer(async (request, response) => {
  const requestPath = (() => { try { return new URL(request.url, 'http://localhost').pathname; } catch { return ''; } })();
  const isNeoMusic = /^\/neo-os\/music-v2(?:\/|$)/i.test(requestPath);
  const isLegacyMusic = /^\/neo-os\/music-local(?:\/|$)/i.test(requestPath);
  const isBrowserCompatibility = /^\/neo-os\/NEO-BROWSER\/compat(?:\/|$)/i.test(requestPath);
  const isOnlineApp = /^\/neo-os\/(?:neo-chat|neo-cloud|neo-tv|neo-ai|neo-youtube|neo-games)(?:\/|$)/i.test(requestPath) || /^\/games\/web-dashers\.html$/i.test(requestPath);
  response.setHeader('Content-Security-Policy', isBrowserCompatibility ? onlineAppCsp : /^\/neo-os\/(?:NEO-BROWSER|nextnode-browser)\//i.test(requestPath) ? browserCsp : isNeoMusic ? musicCsp : isOnlineApp ? onlineAppCsp : csp);
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-cache');
  const fail = (status, text) => { response.writeHead(status, {'Content-Type':'text/plain; charset=utf-8'}); response.end(text); };
  if (!['GET','HEAD'].includes(request.method)) return fail(405, 'Local preview is read-only.');
  try {
    const url = new URL(request.url, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/.netlify/functions/neo-weather') {
      try {
        const payload = await weatherForZip(url.searchParams.get('zip'));
        const body = Buffer.from(JSON.stringify(payload));
        response.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'private, max-age=300',
          'Content-Length': body.length
        });
        return response.end(request.method === 'HEAD' ? undefined : body);
      } catch (error) {
        const status = Number(error.status) || 502;
        const body = Buffer.from(JSON.stringify({ error: status === 502 ? 'Live weather is unavailable right now.' : error.message }));
        response.writeHead(status, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'Content-Length': body.length
        });
        return response.end(request.method === 'HEAD' ? undefined : body);
      }
    }
    if (pathname === '/.netlify/functions/neo-music-search') {
      try {
        const payload = await searchMusic(url.searchParams.get('q'));
        const body = Buffer.from(JSON.stringify(payload));
        response.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'private, max-age=60',
          'Content-Length': body.length
        });
        return response.end(request.method === 'HEAD' ? undefined : body);
      } catch (error) {
        const status = Number(error.status) || 502;
        const body = Buffer.from(JSON.stringify({ error: status === 502 ? 'Music search is unavailable right now.' : error.message }));
        response.writeHead(status, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'Content-Length': body.length
        });
        return response.end(request.method === 'HEAD' ? undefined : body);
      }
    }
    if (pathname === '/.netlify/functions/neo-music-stream') {
      try {
        await streamMusic(url.searchParams.get('id'), request, response);
        return;
      } catch (error) {
        if (response.headersSent) return response.destroy();
        return fail(Number(error.status) || 502, Number(error.status) === 400 ? error.message : 'The full song is unavailable right now.');
      }
    }
    if (isLegacyMusic) {
      const suffix = pathname.replace(/^\/neo-os\/music-local/i, '') || '/';
      response.writeHead(302, { Location: `/neo-os/music-v2${suffix}${url.search}` });
      return response.end();
    }
    if (pathname.includes('\0') || pathname.includes('\\')) return fail(400, 'Invalid local path.');
    if (blocked.test(pathname) || (/^\/games\/[^/]+\.html$/i.test(pathname) && !safeGames.has(path.basename(pathname)))) {
      response.writeHead(302, {Location:'/neo-os/local-browser/unavailable.html?app='+encodeURIComponent(path.basename(pathname))});
      return response.end();
    }
    if (pathname.split('/').some(part => part.startsWith('.') && part !== '.')) return fail(403, 'Private workspace path.');
    let target = path.resolve(root, '.' + pathname);
    if (target !== root && !target.startsWith(root + path.sep)) return fail(403, 'Outside preview workspace.');
    let info = await stat(target);
    if (info.isDirectory()) { target = path.join(target, 'index.html'); info = await stat(target); }
    const resolved = await realpath(target);
    if (!resolved.startsWith(root + path.sep) || !info.isFile()) return fail(403, 'Outside preview workspace.');
    const headers = {'Content-Type':types[path.extname(target).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges':'bytes'};
    // Ordinary local HTML apps inherit the desktop mixer and theme. NEO Music
    // ships its own integration bridge and keeps its upstream document intact.
    if (path.extname(target).toLowerCase() === '.html') {
      let html = await readFile(target, 'utf8');
      const isOptimizedShell = html.includes('data-neo-shell-style');
      if (!isNeoMusic && !isOptimizedShell && !html.includes('neo-system-bridge.js')) html = html.replace(/<head(?:\s[^>]*)?>/i, match => match + '<script src="/neo-os/neo-desktop-config.js"></script><script src="/neo-os/neo-system-bridge.js"></script>');
      if (!isNeoMusic && !isOptimizedShell && !html.includes('neo-desktop.css')) html = html.replace(/<\/head>/i, '<link rel="stylesheet" href="/neo-os/neo-desktop.css"></head>');
      const buffer = Buffer.from(html);
      headers['Content-Length'] = buffer.length;
      delete headers['Accept-Ranges'];
      response.writeHead(200, headers);
      return response.end(request.method === 'HEAD' ? undefined : buffer);
    }
    let start=0, end=info.size-1, status=200;
    if (request.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      if (!match || (!match[1] && !match[2])) { response.setHeader('Content-Range', `bytes */${info.size}`); return fail(416,'Invalid range.'); }
      if (!match[1]) start=Math.max(0, info.size-Number(match[2]));
      else { start=Number(match[1]); if (match[2]) end=Math.min(end,Number(match[2])); }
      if (start>=info.size || start>end || start<0) { response.setHeader('Content-Range',`bytes */${info.size}`); return fail(416,'Range outside file.'); }
      status=206; headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length']=Math.max(0,end-start+1);
    response.writeHead(status,headers);
    if (request.method==='HEAD' || info.size===0) return response.end();
    createReadStream(target,{start,end}).on('error',()=>response.destroy()).pipe(response);
  } catch (error) { fail(error.code==='ENOENT' ? 404 : 400, error.code==='ENOENT' ? 'Local file not found.' : 'Invalid local request.'); }
}).listen(port,'127.0.0.1',()=>console.log(`NEO local preview: http://127.0.0.1:${port}/neo-os/\nMusic: http://127.0.0.1:${port}/neo-os/music-v2/\nExternal requests are route-scoped to NEO Browser, NEO Music, NEO TV, NEO Cloud, and approved app routes.`));
