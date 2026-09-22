const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const shell = fs.readFileSync(path.join(root, 'neo-os', 'neo-os.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'neo-os', 'neo-production-polish.css'), 'utf8');
const resize = fs.readFileSync(path.join(root, 'neo-os', 'neo-window-resize.js'), 'utf8');
const resizeStyles = fs.readFileSync(path.join(root, 'neo-os', 'neo-window-resize.css'), 'utf8');
const visualizer = fs.readFileSync(path.join(root, 'neo-os', 'neo-bottom-visualizer.js'), 'utf8');

const dragStart = shell.indexOf('function wireWindowDrag(win)');
const dragEnd = shell.indexOf('function containWindows()', dragStart);
const dragRuntime = shell.slice(dragStart, dragEnd);

assert(dragStart >= 0 && dragEnd > dragStart, 'window drag runtime must exist');
assert.match(dragRuntime, /requestAnimationFrame\(paintDrag\)/,
  'pointer movement must be painted at most once per frame');
assert.match(dragRuntime, /event\.getCoalescedEvents\(\)/,
  'the newest coalesced pointer sample must drive each frame');
assert.match(dragRuntime, /is-window-interacting/,
  'dragging must enter the shared low-work interaction state');
assert.match(dragRuntime, /neo-media-priority[\s\S]*?active: true[\s\S]*?neo-media-priority[\s\S]*?active: false/,
  'wallpaper media must pause only for the drag gesture and resume on release');
assert.match(dragRuntime, /Math\.round\(clamp\(drag\.left/,
  'drag positions must be pixel-snapped to prevent content shimmer');
assert.equal((dragRuntime.match(/win\.getBoundingClientRect\(\)/g) || []).length, 1,
  'dragging may measure once on start but must not force another layout on drop');

assert.match(styles, /\.neo-window\.is-dragging\s*\{[\s\S]*?backdrop-filter:\s*none\s*!important;/,
  'moving windows must disable expensive live background blur');
assert.match(styles, /\.neo-window\.is-dragging > \.window-body\s*\{[\s\S]*?contain:\s*paint;/,
  'moving window contents must be paint-contained');
assert.match(styles, /\.neo-window\.is-dragging iframe\s*\{[\s\S]*?pointer-events:\s*none\s*!important;/,
  'embedded pages must not compete for pointer work during a drag');
assert.match(resize, /event\.getCoalescedEvents\(\)/,
  'resize must use the newest coalesced pointer sample');
assert.doesNotMatch(resize, /function paintResize\(\)[\s\S]*?updateAccessibleSize\(active\.handle, active\.win\);[\s\S]*?function moveResize/,
  'resize must not force an accessibility layout read on every frame');
assert.match(resizeStyles, /\.neo-window\.is-resizing\s*\{[\s\S]*?backdrop-filter:\s*none\s*!important;/,
  'resizing must disable live window blur');
assert.match(visualizer, /root\.classList\.contains\("is-window-interacting"\)/,
  'the audio visualizer must yield while a window is moving');

console.log('Window drag performance checks passed.');
