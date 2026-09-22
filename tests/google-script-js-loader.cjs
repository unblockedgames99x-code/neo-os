const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'google-script-Code.gs'), 'utf8');

assert.match(source, /format\s*===\s*['"]js['"]/);
assert.match(source, /ContentService\.MimeType\.JAVASCRIPT/);
assert.match(source, /https:\/\/neo-os-desktop-20260908\.web\.app\//);
assert.match(source, /window\.location\.replace\(target\)/);
assert.match(source, /launch\s*===\s*['"]cdn['"]/);
assert.match(source, /HtmlService\.createHtmlOutput\(html\)/);
assert.match(source, /https:\/\/fastly\.jsdelivr\.net\/npm\/@c8rter_09\/neo-os-desktop@1\.0\.3\/cdn-loader\.js/);
assert.ok(source.includes("loaderUrl + '\"></' + 'script>'"));
assert.doesNotMatch(source, /<\\\\\/script>/);
assert.doesNotMatch(source.slice(0, source.indexOf('function neoNetworkFetch')), /github/i);

console.log('Google Apps Script JavaScript loader contract passed.');
