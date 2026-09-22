const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const shards = path.join(root, '.codex-tmp', 'github-cdn-shards');
const catalogRoot = path.join(shards, 'neo-os-games-catalog-cdn');
const catalog = JSON.parse(fs.readFileSync(path.join(catalogRoot, 'index.json'), 'utf8'));
const covers = JSON.parse(fs.readFileSync(path.join(catalogRoot, 'covers.json'), 'utf8'));

assert.ok(catalog.length >= 3900, `Expected the playable game library, found only ${catalog.length} entries.`);
assert.ok(Object.keys(covers).length >= 3000, `Expected CDN cover mappings, found only ${Object.keys(covers).length}.`);

for (const entry of catalog) {
  const url = new URL(entry.file);
  const match = url.pathname.match(/^\/gh\/unblockedgames99x-code\/(neo-os-games-\d+-cdn)@[^/]+\/games\/(.+\.html)$/i);
  assert.ok(match, `Untrusted or malformed game route for ${entry.slug}: ${entry.file}`);
  const file = path.join(shards, match[1], 'games', decodeURIComponent(match[2]));
  assert.equal(fs.existsSync(file), true, `Missing game file for ${entry.slug}`);
  assert.ok(fs.statSync(file).size < 19 * 1024 * 1024, `Game file exceeds the CDN limit: ${entry.slug}`);
}

console.log(`CDN game catalog maps ${catalog.length} playable titles and ${Object.keys(covers).length} covers.`);
