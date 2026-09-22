const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const tests = [
  'production-shell-fast-path', 'window-observer-regression', 'skin-render-regression', 'launcher-alignment',
  'browser-theme-branding',
  'visualizer-cache-regression', 'boot-readiness-regression', 'start-screen', 'kali-style-cursor-limit',
  'window-drag-performance', 'window-motion', 'animation-speed-setting', 'window-top-gap', 'frame-loader-runtime',
  'wallpaper-loading-screen', 'wallpaper-freeze-guard', 'wallpaper-auto-resume',
  'local-wallpaper-catalog', 'typography-system', 'theme-system', 'theme-coverage',
  'taskbar-window-previews', 'taskbar-quick-settings', 'taskbar-label-spacing', 'music-widget-symbols',
  'widget-scrollbars', 'xeno-taskbar',
  'music-startup-performance', 'neo-ai-failover',
  'neo-cloud-app', 'site-connection-health', 'health-probe-cleanup', 'sitewide-ad-shield',
  'running-taskbar-command',
  'proxied-external-navigation', 'youtube-dedicated-app', 'youtube-app-pip',
  'youtube-transport-recovery', 'mobile-compatibility', 'online-app-runtime',
];
const results = [];
for (const name of tests) {
  const file = path.join(__dirname, name + '.cjs');
  if (!fs.existsSync(file)) { results.push({ name, missing: true }); continue; }
  const result = spawnSync(process.execPath, [file], { encoding: 'utf8', timeout: 30000,
    cwd: path.resolve(__dirname, '..') });
  results.push({ name, passed: result.status === 0, exitCode: result.status,
    output: (result.stdout + result.stderr).slice(-3000) });
  console.log(`${result.status === 0 ? 'PASS' : 'FAIL'} ${name}`);
}
if (process.argv[2]) fs.writeFileSync(path.resolve(process.argv[2]), JSON.stringify(results, null, 2));
const failures = results.filter(result => !result.passed);
console.log(JSON.stringify({ total: results.length, passed: results.length - failures.length, failed: failures.map(result => result.name) }));
process.exitCode = failures.length ? 1 : 0;
