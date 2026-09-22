const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const targets = [
  path.join(root, 'neo-os', 'NEO-BROWSER', 'assets', 'app.js'),
  path.join(root, '.codex-tmp', 'github-cdn-shards', 'neo-os-browser-cdn', 'NEO-BROWSER', 'assets', 'app.js'),
];

const oldGuard = 'if(!Oe&&Be){';
const newGuard = 'if(!("GET"===o&&!r&&globalThis.NeoScramjet?.supports?.(e))&&!Oe){';
const oldAwait = 'try{await Be}catch{}';
const newAwait = 'try{await neoEnsureStandardProxy()}catch(t){Ne=t}';
const initStart = 'Be=(async()=>{';
const initEnd = '})();try{await Be,setTimeout(E,1500)}';
const youtubeFallback = 'Oo("YouTube compatibility mode unavailable; using the standard renderer","warn")}}else';
const lazyYoutubeFallback = 'Oo("YouTube compatibility mode unavailable; using the standard renderer","warn");try{await neoEnsureStandardProxy()}catch(t){Ne=t}}}else';
const brokenSafeYoutubeFailure = 'Oo("YouTube compatibility mode unavailable","warn"),Ne=t;return It===i&&(ro(),ts(),A.style.display="block",ft(0,"Browser Network Unavailable","ERR_WORKER_TRANSPORT",t?.message||"The background network worker could not start.",["Retry the page","Check the network relay in Settings"]),Lo("error","Unavailable")),void 0}else';
const safeYoutubeFailure = 'Oo("YouTube compatibility mode unavailable","warn"),Ne=t;return It===i&&(ro(),ts(),A.style.display="block",ft(0,"Browser Network Unavailable","ERR_WORKER_TRANSPORT",t?.message||"The background network worker could not start.",["Retry the page","Check the network relay in Settings"]),Lo("error","Unavailable")),void 0}}else';

for (const target of targets) {
  let source = fs.readFileSync(target, 'utf8');
  if (source.includes('function neoEnsureStandardProxy()') || source.includes('neoEnsureStandardProxy=function')) {
    const incompleteFallback = 'Oo("YouTube compatibility mode unavailable; using the standard renderer","warn");try{await neoEnsureStandardProxy()}catch(t){Ne=t}}else';
    let repaired = false;
    if (source.includes(incompleteFallback)) {
      source = source.replace(incompleteFallback, lazyYoutubeFallback);
      repaired = true;
    }
    if (source.includes(lazyYoutubeFallback)) {
      source = source.replace(lazyYoutubeFallback, safeYoutubeFailure);
      repaired = true;
    }
    if (source.includes(brokenSafeYoutubeFailure)) {
      source = source.replace(brokenSafeYoutubeFailure, safeYoutubeFailure);
      repaired = true;
    }
    source = source.replace('let Oe=null,Be=null,Ne=null,', 'let Oe=null,Be=null,neoEnsureStandardProxy=null,Ne=null,');
    source = source.replace('function neoEnsureStandardProxy(){', 'neoEnsureStandardProxy=function(){');
    source = source.replace(',Be}try{if(N.value!==Ye)', ',Be};try{if(N.value!==Ye)');
    fs.writeFileSync(target, source);
    console.log(`${repaired ? 'Repaired' : 'Normalized'} lazy initializer: ${path.relative(root, target)}`);
    continue;
  }

  for (const [needle, description] of [
    [oldGuard, 'eager navigation guard'],
    [oldAwait, 'eager navigation await'],
    [initStart, 'proxy initializer'],
    [initEnd, 'startup await'],
    [youtubeFallback, 'YouTube fallback'],
  ]) {
    const first = source.indexOf(needle);
    if (first < 0 || source.indexOf(needle, first + needle.length) >= 0) {
      throw new Error(`${description} was not found exactly once in ${target}`);
    }
  }

  source = source.replace(oldGuard, newGuard).replace(oldAwait, newAwait).replace(youtubeFallback, lazyYoutubeFallback);
  const start = source.indexOf(initStart);
  const end = source.indexOf(initEnd, start);
  const body = source.slice(start + initStart.length, end);
  source = source.replace('let Oe=null,Be=null,Ne=null,', 'let Oe=null,Be=null,neoEnsureStandardProxy=null,Ne=null,');
  const lazyInitializer = `neoEnsureStandardProxy=function(){return Be||(Be=(async()=>{${body}})().catch(e=>{Be=null;throw e})),Be};try{if(N.value!==Ye)await neoEnsureStandardProxy(),setTimeout(E,1500)}`;
  source = source.slice(0, start) + lazyInitializer + source.slice(end + initEnd.length);

  fs.writeFileSync(target, source);
  console.log(`Optimized: ${path.relative(root, target)}`);
}
