const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

const html = read('neo-os', 'neo-tv', 'index.html');
const script = read('neo-os', 'neo-tv', 'app.js');
const styles = read('neo-os', 'neo-tv', 'app.css');
const classicsPath = path.join(root, 'neo-os', 'neo-tv', 'assets', 'profile-classics');
const expectedFiles = [
  'scarlett-chilleez.png', 'sunny-chilleez.png', 'dusty-chilleez.png', 'purple-superhero.png',
  'moustache.png', 'dog.png', 'red-superhero.png', 'purple-penguin.png', 'robin-chilleez.png',
  'pink-giggle.png', 'chicken.png', 'eyepatch.png', 'alien.png', 'robot.png', 'mummy.png',
  'helmet.png', 'red-smile.png', 'dark-grey-smile.png', 'yellow-smile.png', 'green-smile.png',
  'purple-smile.png', 'pink-smile.png', 'blue-classic-icon.png'
];

const entries = [...script.matchAll(/\{ id: "classic-(\d{2})", label: "([^"]+)", src: "\.\/assets\/profile-classics\/([^"]+\.png)" \}/g)];
assert.equal(entries.length, 23, 'The complete 23-picture Netflix Classics collection is missing');
assert.deepEqual(entries.map((match) => match[1]), Array.from({ length: 23 }, (_, index) => String(index + 1).padStart(2, '0')));
assert.deepEqual(entries.map((match) => match[3]), expectedFiles);
assert.doesNotMatch(script, /profile-avatars-v1|avatarSprite|spriteIndex|Classic character/i,
  'The generated mascot sprite or placeholder names are still present');
assert.doesNotMatch(script, /nflxso\.net|about\.netflix/i, 'Profile pictures must load locally, not from a remote image host');
assert.ok(!fs.existsSync(path.join(root, 'neo-os', 'neo-tv', 'assets', 'profile-avatars-v1.webp')), 'The obsolete generated mascot sprite still exists');
const hashes = new Set();
for (const file of expectedFiles) {
  const buffer = fs.readFileSync(path.join(classicsPath, file));
  assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG', `${file} is not a PNG`);
  assert.ok(buffer.readUInt32BE(16) >= 90 && buffer.readUInt32BE(20) >= 90, `${file} is too small`);
  hashes.add(crypto.createHash('sha256').update(buffer).digest('hex'));
}
assert.equal(hashes.size, 23, 'The classic collection contains a duplicate or substituted picture');

assert.match(html, /data-profile-picture-picker/);
assert.doesNotMatch(html, /LOCAL PROFILES/i);
assert.match(html, />The Classics<\/strong>/);
assert.match(html, /name=['"]avatar['"] value=['"]classic-01['"]/);
assert.match(html, /name=['"]avatarData['"]/);
assert.match(html, /data-avatar-upload/);
assert.match(html, /accept=['"]image\/png,image\/jpeg,image\/webp,image\/gif['"]/);
assert.match(script, /function paintProfileAvatar/);
assert.match(script, /image\.src\s*=\s*avatar\.src/);
assert.match(script, /function resizeProfilePicture\(file\)/);
assert.match(script, /file\.size\s*>\s*8\s*\*\s*1024\s*\*\s*1024/);
assert.match(script, /canvas\.width\s*=\s*256;\s*canvas\.height\s*=\s*256/);
assert.match(script, /canvas\.toDataURL\(['"]image\/webp['"],\s*\.82\)/);
assert.match(script, /avatar:\s*form\.elements\.avatar\.value\s*===\s*['"]custom['"]/);
assert.match(script, /avatarData:\s*form\.elements\.avatar\.value\s*===\s*['"]custom['"]/);

assert.match(styles, /\.profile-picture-picker\{[^}]*grid-template-columns:repeat\(8/);
assert.match(styles, /\.profile-picture-choice\[aria-pressed=['"]true['"]\]/);
assert.match(styles, /\.profile-picture-preview>img\{[^}]*object-fit:cover/);
assert.match(styles, /@media\(max-width:480px\)\{\.profile-picture-picker\{grid-template-columns:repeat\(4/);

console.log('NEO Movies local classic-profile and custom-upload checks passed.');
