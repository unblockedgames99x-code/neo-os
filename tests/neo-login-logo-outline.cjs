const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'neo-os', 'neo-apps.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'neo-os', 'index.html'), 'utf8');

const loginLogoRule = css.match(/\.neo-login-panel\s*>\s*img\s*\{([\s\S]*?)\}/);
assert.ok(loginLogoRule, 'login logo rule should exist');
assert.match(loginLogoRule[1], /border:\s*0\s*!important/, 'login logo must not render a border');
assert.match(loginLogoRule[1], /outline:\s*0\s*!important/, 'login logo must not render an outline');
assert.match(loginLogoRule[1], /box-shadow:\s*none\s*!important/, 'login logo must not fake an outline with a shadow');
assert.match(index, /neo-apps\.css\?v=20260919-login-logo-outline-v1/, 'shell should request the updated logo CSS');

console.log('neo login logo outline regression checks passed');
