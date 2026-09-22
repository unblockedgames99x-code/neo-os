const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'neo-os', 'wallpaper-full-media.json'), 'utf8'));
const engine = fs.readFileSync(path.join(root, 'neo-os', 'neo-wallpaper-engine.js'), 'utf8');

assert.equal(manifest.projects.length, 1, 'The shipped wallpaper catalog must contain only the required desktop scene');
const wallpaper = manifest.projects[0];
assert.equal(wallpaper.id, 'we-steam-1403160205');
assert.equal(wallpaper.mediaType, 'web');
assert.equal(wallpaper.offlineSafe, true);
assert.match(wallpaper.file, /^\.\/assets\/wallpaper-engine-web\/1403160205\/index\.html/);
assert.match(wallpaper.preview, /^\.\/assets\/wallpaper-engine-web\/1403160205\/img\/city\.webp$/);
for (const field of ['file', 'preview']) {
  const file = wallpaper[field].replace(/^\.\//, '').split('?')[0];
  assert.ok(fs.existsSync(path.join(root, 'neo-os', file)), `${field} is missing: ${file}`);
}
assert.match(engine, /var BUILT_IN_CANVAS_WALLPAPERS = \[\];/, 'An obsolete built-in wallpaper is still registered');
assert.match(engine, /Remote wallpaper packs[\s\S]*?return \[\];/, 'Remote wallpaper packs are still eagerly listed');

console.log('Wallpaper Engine ships only the required Rainy Day wallpaper.');
