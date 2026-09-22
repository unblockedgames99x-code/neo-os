const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'neo-os', 'NEO-BROWSER');
const htmlPath = path.join(root, 'index.html');
const appPath = path.join(root, 'assets', 'app.js');
let html = fs.readFileSync(htmlPath, 'utf8');
let app = fs.readFileSync(appPath, 'utf8');
let changes = 0;

function removeHtmlBlock(startMarker, endMarker, keepEnd = true) {
  const start = html.indexOf(startMarker);
  if (start < 0) return;
  const end = html.indexOf(endMarker, start);
  if (end < 0) throw new Error(`Could not find the end of ${startMarker}.`);
  html = html.slice(0, start) + (keepEnd ? html.slice(end) : html.slice(end + endMarker.length));
  changes += 1;
}

html = html.replace(/\s*<button class="settings-nav-item" data-section="tutorial">[\s\S]*?<\/button>/, match => {
  changes += 1;
  return '';
});
removeHtmlBlock('<div class="settings-section" data-section="tutorial-page"', '<div class="settings-section" data-section="about"');
removeHtmlBlock('<div id="tutorialOverlay"', '</body>');

const tutorialStart = app.indexOf('function Ws(e=!1){');
const tutorialEnd = app.indexOf('function Hs(e=!1){', tutorialStart);
if (tutorialStart >= 0 && tutorialEnd >= 0 && !app.includes('function Ws(e=!1){return}')) {
  app = app.slice(0, tutorialStart) + 'function Ws(e=!1){return}' + app.slice(tutorialEnd);
  changes += 1;
}

html = html.replace('assets/app.js?v=20260907-scramjet-v1', 'assets/app.js?v=20260907-no-tour-v1');

fs.writeFileSync(htmlPath, html);
fs.writeFileSync(appPath, app);
console.log(changes ? 'Removed the NEO Browser tour.' : 'The NEO Browser tour is already removed.');
