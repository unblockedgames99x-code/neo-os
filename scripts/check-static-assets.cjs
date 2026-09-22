const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2]);
const origin = 'https://artifact.invalid';
const visited = new Set();
const missing = [];
const external = new Set();
function inspect(relative, owner = '') {
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep) || visited.has(file)) return;
  visited.add(file);
  if (!fs.existsSync(file)) { missing.push({ owner, file: relative }); return; }
  if (!/\.(html|css)$/i.test(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  const base = new URL(relative.replace(/\\/g, '/'), origin + '/');
  const refs = [];
  if (/\.html$/i.test(file)) {
    const markup = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, tag => tag.slice(0, tag.indexOf('>') + 1));
    for (const tag of markup.matchAll(/<(?:script|img|source|video|audio|iframe|link)\b[^>]*>/gi)) {
      for (const attr of tag[0].matchAll(/\b(?:src|href|poster)=["']([^"']+)["']/gi)) refs.push(attr[1]);
    }
  } else {
    for (const match of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) refs.push(match[1]);
  }
  for (let ref of refs) {
    ref = ref.replace(/&amp;/g, '&').trim();
    if (!ref || /^(?:#|data:|blob:|about:|javascript:)/i.test(ref) || /[{}<>]|\$|\\/.test(ref)) continue;
    let url; try { url = new URL(ref, base); } catch { continue; }
    if (url.origin !== origin) { external.add(url.origin); continue; }
    let child = decodeURIComponent(url.pathname).replace(/^\//, '');
    if (child.endsWith('/')) child += 'index.html';
    inspect(child, relative);
  }
}
const entries = ['index.html', 'neo-os/index.html', ...[
  'NEO-BROWSER', 'neo-youtube', 'neo-ai', 'neo-chat', 'neo-cloud',
  'music-v2', 'local-browser', 'neo-tv', 'audiobooks', 'neo-games',
].map(name => `neo-os/${name}/index.html`)];
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'neo-os/wallpaper-full-media.json'), 'utf8'));
for (const item of catalog.projects || []) {
  for (const field of ['file', 'preview']) {
    const ref = item[field];
    if (ref && !/^(?:https?:|data:|blob:)/.test(ref)) {
      const url = new URL(ref, origin + '/neo-os/');
      entries.push(decodeURIComponent(url.pathname).replace(/^\//, ''));
    }
  }
}
entries.forEach(file => inspect(file));
console.log(JSON.stringify({ inspectedFiles: visited.size, missing, externalOrigins: [...external] }, null, 2));
process.exitCode = missing.length ? 1 : 0;
