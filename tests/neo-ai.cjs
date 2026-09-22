const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const apps = read('neo-os', 'neo-apps.js');
const shell = read('neo-os', 'neo-os.js');
const theme = read('neo-os', 'neo-app-theme.js');
const config = read('neo-os', 'neo-local-config.js');
const html = read('neo-os', 'neo-ai', 'index.html');
const css = read('neo-os', 'neo-ai', 'app.css');
const js = read('neo-os', 'neo-ai', 'app.js');

new vm.Script(apps, { filename: 'neo-apps.js' });
new vm.Script(shell, { filename: 'neo-os.js' });
new vm.Script(theme, { filename: 'neo-app-theme.js' });
new vm.Script(js, { filename: 'neo-ai/app.js' });

assert.match(apps, /id:\s*['"]neo-ai['"][\s\S]*?icon:\s*['"]chatgpt['"][\s\S]*?route:\s*['"]\.\/neo-ai\/index\.html\?/);
assert.match(config, /onlineApps:[\s\S]*?['"]neo-ai['"]/);
assert.match(shell, /chatgpt:\s*['"]\.\/assets\/neo-ai-logo\.svg(?:\?[^'"]*)?['"]/);
assert.match(theme, /path\.includes\(['"]\/neo-ai\/['"]\)\s*\?\s*['"]ai['"]/);
assert.match(theme, /function closeDialogFromBackdrop[\s\S]*?dialog\.getBoundingClientRect\(\)[\s\S]*?dialog\.close\(\)/);
assert.match(theme, /document\.addEventListener\(['"]click['"],\s*closeDialogFromBackdrop\)/);

const expectedModels = ['gpt-oss-120b', 'gpt-oss-20b', 'qwen3-32b'];
const declaredModels = [...js.matchAll(/\{\s*id:\s*['"]([^'"]+)['"]/g)].map(match => match[1]);
assert.deepEqual(declaredModels, expectedModels, 'NEO AI must expose exactly the three supported live models');
assert.match(js, /DEFAULT_MODEL_ID\s*=\s*['"]gpt-oss-20b['"]/);
assert.match(js, /DEFAULT_MODEL_MIGRATION_KEY\s*=\s*['"]neo_ai_default_model_20b_v1['"]/);
assert.match(js, /needsDefaultModelMigration[\s\S]*?parsed\.settings\.model = DEFAULT_MODEL_ID/);
assert.match(js, /COWORK_MODEL_IDS\s*=\s*\[['"]gpt-oss-120b['"],\s*['"]gpt-oss-20b['"],\s*['"]qwen3-32b['"]\]/);
assert.match(html, /3 AVAILABLE MODELS/);
assert.match(html, /GPT-OSS 20B \(Fast\)/);
assert.doesNotMatch(html, /<select[^>]+id=['"]model-select['"]/);

assert.match(js, /PUTER_SDK_URL\s*=\s*['"]https:\/\/js\.puter\.com\/v2\/['"]/);
assert.match(js, /puterId:\s*['"]openai\/gpt-oss-120b['"]/);
assert.match(js, /puterId:\s*['"]openai\/gpt-oss-20b['"]/);
assert.match(js, /puterId:\s*['"]alibaba:qwen\/qwen3-32b['"]/);
assert.match(js, /function loadPuterSdk[\s\S]*?data-neo-puter-sdk[\s\S]*?script\.src = PUTER_SDK_URL/);
assert.match(js, /async function requestModel[\s\S]*?puter\.ai\.chat\(messages, false,[\s\S]*?stream:\s*true[\s\S]*?normalize:\s*true/);
assert.doesNotMatch(js, /nextnode9124|pollinations|requestAnonymous|requestFallback/i);

assert.match(js, /Promise\.allSettled\(team\.map/);
assert.match(js, /api\.duckduckgo\.com/);
assert.match(js, /NEO_PROXY_CLIENT\.resolve\(url,\s*['"]search['"]\)/);
assert.match(js, /getDisplayMedia/);
assert.match(js, /navigator\.clipboard/);
assert.match(js, /dataTransfer\.files/);
assert.match(js, /function deleteChat[\s\S]*?state\.chats\s*=\s*state\.chats\.filter/);
assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important/);
assert.match(css, /--ai-accent:\s*var\(--desktop-accent/);
assert.match(css, /prefers-reduced-motion/);

for (const runtime of ['neo-link-proxy.js', 'neo-proxy-client.js']) {
  assert.match(html, new RegExp(`\\.\\.\\/${runtime.replace('.', '\\.')}`), `NEO AI must load ${runtime}`);
}

console.log('NEO AI live-model, Puter provider, UI, and safety checks passed.');
