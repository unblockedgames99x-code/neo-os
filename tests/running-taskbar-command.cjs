const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "neo-os", "index.html"), "utf8");
const shell = fs.readFileSync(path.join(root, "neo-os", "neo-os.js"), "utf8");
const palette = fs.readFileSync(path.join(root, "neo-os", "neo-command-palette.js"), "utf8");
const taskbarCss = fs.readFileSync(path.join(root, "neo-os", "neo-running-taskbar.css"), "utf8");

assert.match(html, /id="neo-dock" aria-label="Apps"><\/div>/, "taskbar app strip must be available at startup");
assert.doesNotMatch(html, /id="neo-dock"[\s\S]{0,250}<button class="dock-button"/, "taskbar must not ship pinned app buttons");
assert.doesNotMatch(html, /data-setting="taskbarRunningApps"/, "running-app buttons must not expose a settings toggle");
assert.doesNotMatch(html, /data-setting="taskbarAppDragging"/, "running-app dragging must not expose a settings toggle");
assert.doesNotMatch(html, /Running app buttons|Drag running apps/, "removed taskbar setting labels must not ship");
assert.match(html, /data-taskbar-app-names="false"/, "taskbar app names must be off before the shell loads");
assert.match(html, /data-setting="taskbarAppNames"/, "taskbar app names must have a dedicated setting");
assert.match(html, /neo-command-palette\.js/, "command palette runtime must load");
assert.match(html, /neo-running-taskbar\.css/, "running taskbar styles must load");
assert.match(shell, /function taskbarAppIds\(\)/, "shell must derive taskbar entries from pinned and running apps");
assert.match(shell, /function bindRunningTaskbarDrag\(\)/, "shell must bind taskbar drag reordering");
assert.match(shell, /RUNNING_TASKBAR_ORDER_KEY/, "running order must persist");
assert.match(shell, /normalizePinnedAppOrder\(\)\.forEach/, "pinned launcher apps must populate the taskbar");
assert.match(shell, /openWindows\.forEach/, "open unpinned apps must join the taskbar while running");
assert.match(shell, /settings\.taskbarRunningApps \? taskbarAppIds\(\) : \[\]/, "the app-strip setting must control dock rendering");
assert.match(shell, /win \? "Switch to " : "Open "/, "closed taskbar apps must launch and running apps must switch");
assert.match(palette, /event\.ctrlKey \|\| event\.metaKey/, "Ctrl or Command shortcut must be supported");
assert.match(palette, /String\(event\.key\)\.toLowerCase\(\) === "k"/, "Ctrl+K must open the palette");
assert.match(palette, /ArrowDown/, "palette must support keyboard navigation");
assert.match(palette, /api\.openApp\(id\)/, "palette results must launch apps");
assert.match(palette, /\.neo-window\[data-app-id\]/, "palette must detect open windows even when taskbar buttons are hidden");
assert.match(taskbarCss, /\.dock:empty/, "empty taskbar app strip must collapse");
assert.match(taskbarCss, /:has\(#neo-dock:empty\) \.taskbar-center[\s\S]*?justify-content:\s*center !important;/, "empty vertical taskbar must center its launcher tile");
assert.match(taskbarCss, /:has\(#neo-dock:empty\) \.taskbar-start-button[\s\S]*?margin:\s*0 !important;/, "empty vertical taskbar must not retain the running-app gap");
assert.match(taskbarCss, /data-taskbar-running-apps="false"/, "disabled running-app buttons must collapse the dock");
assert.match(taskbarCss, /data-taskbar-app-names="false"[\s\S]*?\.dock-app-name/, "hidden taskbar names must stay available to assistive technology");
assert.match(taskbarCss, /\.neo-taskbar-preview/, "hover close affordance must remain theme-reactive");

console.log("Pinned/running taskbar and Ctrl+K command palette contracts passed.");
