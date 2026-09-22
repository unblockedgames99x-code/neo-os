const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'neo-os', 'neo-ai', 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'neo-os', 'neo-ai', 'index.html'), 'utf8');

assert.match(app, /function loadPuterSdk\(\)[\s\S]*?script\.src = PUTER_SDK_URL/,
  'the original browser AI provider must load on demand');
assert.match(app, /function puterResponseText\(response\)[\s\S]*?response\.message && response\.message\.content/,
  'provider responses must support normalized and legacy message shapes');
assert.match(app, /async function requestModel\(messages, modelId, signal, onProgress\)[\s\S]*?puter\.ai\.chat\(messages, false/,
  'all model requests must use the live browser provider');
assert.match(app, /typeof response\[Symbol\.asyncIterator\] === ['"]function['"][\s\S]*?for await/,
  'streaming replies must render incrementally');
assert.doesNotMatch(app, /nextnode9124|pollinations|requestAnonymous|anonymousTextPrompt|requestFallback/i,
  'dead or unsupported AI endpoints must not return');
assert.match(html, /app\.js\?v=[^'"\s>]+/,
  'the AI runtime must be cache-versioned');

console.log('NEO AI uses the restored live browser provider and streams compatible responses.');
