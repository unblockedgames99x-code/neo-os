const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'neo-os', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'neo-os', 'neo-interface-styles.css'), 'utf8');
const alignmentCss = fs.readFileSync(path.join(root, 'neo-os', 'neo-launcher-alignment.css'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'neo-os', 'neo-os.js'), 'utf8');

assert.match(html, /neo-launcher-alignment\.css\?[^"']*20260920-category-label-v4/);
assert.match(css, /Launcher alignment reliability/);
assert.match(alignmentCss, /width:\s*min\(760px, calc\(100vw - 40px\)\) !important/);
assert.match(alignmentCss, /height:\s*min\(620px,/);
assert.match(alignmentCss, /grid-template-columns:\s*repeat\(7, minmax\(0, 1fr\)\) !important/);
assert.match(alignmentCss, /width:\s*38px !important;[\s\S]*?height:\s*38px !important/);
assert.match(alignmentCss, /\.category-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\) !important/);
assert.match(alignmentCss, /grid-template-areas:[\s\S]*?"category-name category-browse"[\s\S]*?"category-icons category-browse"/);
assert.match(alignmentCss, /\.launcher-category-browse\s*\{[\s\S]*?background:\s*transparent !important;[\s\S]*?border-left:/);
assert.match(alignmentCss, /#app-launcher \.launcher-category-browse-icon\s*\{[\s\S]*?stroke:\s*currentColor/);
assert.match(html, /symbol id="i-arrow-right"/);
assert.match(runtime, /browseIconUse\.setAttribute\("href", "#i-arrow-right"\)/);
assert.match(alignmentCss, /\.category-icons\s*\{[\s\S]*?display:\s*flex !important/);
assert.match(alignmentCss, /\.category-group > span\s*\{[\s\S]*?padding-left:\s*4px !important/);
assert.match(alignmentCss, /\.recent-section \.launcher-empty\s*\{[\s\S]*?min-height:\s*54px !important/);
assert.match(alignmentCss, /\.launcher-search > \.icon:first-child\s*\{[\s\S]*?place-self:\s*center !important/);
assert.match(alignmentCss, /:not\(\[data-taskbar-style="figure"\]\)/);
assert.match(css, /\.app-launcher\.is-open\s*\{[\s\S]*?translateX\(-50%\)/);
assert.match(css, /screen-level surface[\s\S]*?top:\s*50% !important;[\s\S]*?left:\s*50% !important;/);
assert.match(css, /#app-launcher\.is-open\s*\{[\s\S]*?translate\(-50%, -50%\) scale\(1\) !important;/);
assert.match(alignmentCss, /@media \(max-width: 760px\)[\s\S]*?repeat\(4, minmax\(0, 1fr\)\)/);
assert.match(alignmentCss, /@media \(max-width: 440px\)[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)/);

for (const source of [
  html,
  fs.readFileSync(path.join(root, 'neo-os', 'neo-apps.js'), 'utf8'),
  fs.readFileSync(path.join(root, 'neo-os', 'neo-os-features.js'), 'utf8'),
]) {
  assert.doesNotMatch(source, /auto[ -]?clicker/i);
}

console.log('Launcher uses one compact, aligned, responsive grid and Auto Clicker remains removed.');
