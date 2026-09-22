const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const app = read('neo-os', 'neo-tv', 'app.js');
const css = read('neo-os', 'neo-tv', 'app.css');
const html = read('neo-os', 'neo-tv', 'index.html');

assert.match(app, /function wikipediaPoster\(title\)/, 'Broken posters have no metadata fallback');
assert.match(app, /https:\/\/en\.wikipedia\.org\/w\/api\.php/, 'The poster fallback must use real title metadata');
assert.match(app, /proxyFetch\(['"]https:\/\/en\.wikipedia\.org\/w\/api\.php/, 'Poster metadata must go through the shared proxy');
assert.match(app, /function loadPoster\(image,\s*title,\s*source\)/, 'Poster loading is not centrally recovered');
assert.match(app, /proxyRoute\(value,\s*['"]image['"]\)/, 'Poster art must be resolved through the shared proxy');
assert.match(app, /image\.removeAttribute\(['"]src['"]\)[\s\S]*?if \(source\) assign\(source\)/,
  'A remote poster must not make a direct request before its proxy route resolves');
assert.match(app, /image\.addEventListener\(['"]error['"],\s*useFallback\)/);
assert.match(app, /frame\.dataset\.fallback\s*=\s*title\.title/);
assert.match(app, /track\.classList\.toggle\(['"]is-poster-rail['"],\s*Boolean\(portrait\)\)/);
assert.match(app, /proxyRoute\(sourceUrl,\s*['"]image['"]\)\.then\(apply\)/, 'Hero art must use the shared proxy too');

assert.match(css, /\.title-card\.is-portrait \.poster\{aspect-ratio:2\/3\}/);
assert.match(css, /\.poster img\{[^}]*object-fit:cover/);
assert.match(css, /\.poster\.is-missing:before\{opacity:1\}/);
assert.match(css, /\.search-grid \.poster\{aspect-ratio:2\/3\}/);
assert.match(css, /content-visibility:auto/);

assert.match(html, /app\.css\?v=20260912-episodes-v8/);
assert.match(html, /catalog\.js\?v=20260912-open-movies-v2/);
assert.match(html, /app\.js\?v=20260912-media-fallback-v9/);
assert.match(html, /\.\.\/neo-proxy-client\.js\?v=/);

console.log('NEO Movies proxied poster, hero-art, fallback, and full-cover checks passed.');
