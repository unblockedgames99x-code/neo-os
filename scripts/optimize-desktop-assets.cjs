const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const sharp = require('sharp');

const icons = [
  ['spotify-official.png', null], ['imessage-logo.png', null],
  ['duckduckgo.png', null], ['vscode-official.png', null],
];

async function optimizeDesktopAssets(directory) {
  const replacements = [];
  const stats = [];
  for (const [name, width] of icons) {
    const input = fs.readFileSync(path.join(directory, 'assets', name));
    let pipeline = sharp(input);
    if (width) pipeline = pipeline.resize({ width, withoutEnlargement: true });
    const output = await pipeline.webp({ lossless: true, effort: 6 }).toBuffer();
    const hash = createHash('sha256').update(output).digest('hex').slice(0, 16);
    const filename = `${path.parse(name).name}.${hash}.webp`;
    fs.writeFileSync(path.join(directory, 'assets', filename), output);
    replacements.push([`assets/${name}`, `assets/${filename}`]);
    stats.push({ name, filename, beforeBytes: input.length, afterBytes: output.length });
  }
  // Only UI consumers: retain original PNG metadata/favicons and all originals.
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.(html|css|js)$/.test(entry.name) || /\.min\./.test(entry.name)) continue;
    const file = path.join(directory, entry.name);
    const before = fs.readFileSync(file, 'utf8');
    let after = before;
    for (const [from, to] of replacements) after = after.split(from).join(to);
    if (after !== before) fs.writeFileSync(file, after);
  }
  return stats;
}
module.exports = { optimizeDesktopAssets };
if (require.main === module) optimizeDesktopAssets(path.resolve(process.argv[2])).then(stats => console.log(JSON.stringify(stats)));
