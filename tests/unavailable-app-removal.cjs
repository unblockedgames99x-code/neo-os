const fs = require('fs');
const path = require('path');

const shell = fs.readFileSync(path.join(__dirname, '..', 'neo-os', 'neo-os.js'), 'utf8');

function expect(pattern, message) {
  if (!pattern.test(shell)) throw new Error(message);
}

if (shell.includes('This page is taking longer than expected')) {
  throw new Error('The retired generic timeout screen is still present.');
}

expect(/function removeUnavailableApp\(app, hostWindow\)/, 'Missing unavailable-app removal flow.');
expect(/if \(!app \|\| app\.core\) return false;/, 'Built-in core apps must not be removed for a slow load.');
expect(/removeCustomApp\(app\.id\)/, 'Broken custom apps are not removed from the catalog.');
expect(/setAppInstalled\(app\.id, false\)/, 'Broken optional apps are not uninstalled.');
expect(/if \(attempt === 1\) \{\s*beginLoad\(\);/s, 'Slow built-in routes are not retried automatically.');
expect(/fallbackTitle\.textContent = "Unable to open " \+ app\.title;/, 'Core-app failure copy is not app-specific.');

console.log('Unavailable app removal checks passed.');
