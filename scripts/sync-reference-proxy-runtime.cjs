const fs = require('node:fs');
const path = require('node:path');

const workspace = path.resolve(__dirname, '..');
const source = path.join(workspace, '.codex-tmp', 'tongstorage');
const target = path.join(workspace, 'neo-os', 'NEO-BROWSER');

const files = [
  ['curl/index.mjs', 'scramjet/libcurl.mjs'],
];

for (const [from, to] of files) {
  const input = path.join(source, from);
  const output = path.join(target, to);
  if (!fs.existsSync(input)) throw new Error(`Missing reference proxy asset: ${input}`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.copyFileSync(input, output);
  console.log(`${from} -> ${to}`);
}
