const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "neo-os", "neo-os.js"), "utf8");
const css = fs.readFileSync(path.join(root, "neo-os", "neo-production-polish.css"), "utf8");
const html = fs.readFileSync(path.join(root, "neo-os", "index.html"), "utf8");

function requireMatch(source, pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

requireMatch(js, /function setWindowMotionOrigin\(win, appId\)/, "Window motion origin helper is missing.");
requireMatch(js, /setWindowMotionOrigin\(win, app\.id\);/, "New windows do not receive a taskbar motion origin.");
requireMatch(js, /function playWindowMotion\(win, phase, fallbackDuration, onComplete\)/, "The shared window lifecycle animator is missing.");
requireMatch(js, /setWindowMotionOrigin\(existing, id\);[\s\S]*?playWindowMotion\(existing, "restoring"/, "Restored windows do not animate from their taskbar icon.");
requireMatch(js, /function closeWindow[\s\S]*?setWindowMotionOrigin\(win, id\);[\s\S]*?playWindowMotion\(win, "closing"/, "Closing windows do not animate toward their taskbar icon.");
requireMatch(js, /function minimizeWindow[\s\S]*?setWindowMotionOrigin\(win, win\.dataset\.appId\);[\s\S]*?playWindowMotion\(win, "minimizing"/, "Minimized windows do not animate toward their taskbar icon.");
requireMatch(js, /playWindowMotion\(win, "opening"/, "New windows do not run the opening animation.");

requireMatch(css, /--neo-window-open-duration:\s*300ms/, "The smooth open timing is missing.");
requireMatch(css, /--neo-window-close-duration:\s*210ms/, "The fast close timing is missing.");
requireMatch(css, /\.neo-window\.is-open\s*\{[\s\S]*?scale\(1\)/, "The open state is missing.");
requireMatch(css, /@keyframes neo-window-open[\s\S]*?scale\(\.94\)[\s\S]*?scale\(1\)/, "The opening keyframes are missing.");
requireMatch(css, /@keyframes neo-window-close[\s\S]*?scale\(\.92\)/, "The closing keyframes are missing.");
requireMatch(css, /@keyframes neo-window-brighten/, "The reference-inspired brighten pass is missing.");
requireMatch(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.neo-window\s*\{\s*transform:\s*none !important;/, "Reduced-motion users are not protected from window transforms.");
requireMatch(html, /neo-production-polish\.css[^"\n]*motion=window-drag-v3/, "The window-motion stylesheet cache key is missing.");
requireMatch(html, /neo-os\.js[^"\n]*motion=window-drag-v3/, "The window-motion script cache key is missing.");

console.log("window motion checks passed");
