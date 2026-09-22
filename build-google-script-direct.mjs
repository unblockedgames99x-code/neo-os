import { readFile, writeFile } from "node:fs/promises";

const sourcePath = new URL("./neo-os/index.html", import.meta.url);
const outputPath = new URL("./google-script-direct.html", import.meta.url);
const revision = "b3c7a1454a6626af26f0fccd3194503a56803f73";
const cdnRoot = `https://cdn.jsdelivr.net/gh/unblockedgames99x-code/dshsfdghaswerweq@${revision}/neo-os/`;
const pageRoot = cdnRoot;
const publicWebApp = "https://script.google.com/macros/s/AKfycbw1GQonlgNW6_ZwgRWRPn2N1pvT4gyH7Z3ykSeMYqR9dZ0wgMOVGDw9ObLdW8MKKCeSkA/exec";

let html = await readFile(sourcePath, "utf8");
html = html.replace(
  /<head([^>]*)>/i,
  `<head$1>\n  <base href="${pageRoot}">\n  <meta name="neo-runner" content="google-apps-script">`
);
html = html.replace(/(<script\b[^>]*\bsrc=["'])\.\/([^"']+)(["'])/gi, `$1${cdnRoot}$2$3`);
html = html.replace(/(<link\b[^>]*\bhref=["'])\.\/([^"']+)(["'])/gi, `$1${cdnRoot}$2$3`);

const bootStyle = String.raw`
<style id="neo-direct-boot-style">
html.neo-direct-booting,html.neo-direct-booting body{overflow:hidden!important}
#neo-direct-boot{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#080b10;color:#fff;font:600 14px/1.4 Inter,Arial,sans-serif}
#neo-direct-boot .neo-direct-card{text-align:center}
#neo-direct-boot .neo-direct-actions{display:flex;justify-content:center;gap:12px}
#neo-direct-boot .neo-direct-action{appearance:none;border:1px solid #2b3038;border-radius:9px;background:#242932;color:#fff;padding:12px 18px;font:700 13px Inter,Arial,sans-serif;cursor:pointer;text-decoration:none}
#neo-direct-boot .neo-direct-action:first-child{background:#fff;color:#080b10;border-color:#fff}
#neo-direct-boot .neo-direct-action:hover{filter:brightness(1.12)}
#neo-direct-boot p{margin:14px 0 0;color:#78879a;font-size:12px;font-weight:500}
body:has(#neo-desktop:target) #neo-direct-boot{display:none}
</style>`;

html = html.replace(/<\/head>/i, `${bootStyle}\n</head>`);

const bootBody = String.raw`
<? if (!launchMode) { ?>
<div id="neo-direct-boot" role="dialog" aria-label="Launch NEO OS">
  <div class="neo-direct-card">
    <div class="neo-direct-actions">
      <a class="neo-direct-action" id="neo-open-blank" href="${publicWebApp}?startNeo=1" target="_blank" rel="noopener">Open in about:blank</a>
      <a class="neo-direct-action" id="neo-fullscreen" href="${publicWebApp}?startNeo=1" target="_top">Full screen</a>
    </div>
    <p id="neo-direct-status" aria-live="polite">Choose how to launch NEO OS</p>
  </div>
</div>
<script src="${cdnRoot}neo-direct-launch.js?v=20260830-google-boot-v4"></script>
<? } ?>`;

html = html.replace(/<body([^>]*)>/i, `<body$1>\n${bootBody}`);
await writeFile(outputPath, html, "utf8");

console.log(JSON.stringify({
  output: outputPath.pathname,
  bytes: Buffer.byteLength(html),
  jsdelivrScripts: (html.match(/cdn\.jsdelivr\.net\/gh[^"']+\.js/gi) || []).length,
  jsdelivrStyles: (html.match(/cdn\.jsdelivr\.net\/gh[^"']+\.css/gi) || []).length,
  bootScreen: html.includes('neo-direct-boot')
}, null, 2));
