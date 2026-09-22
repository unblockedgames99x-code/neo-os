const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const upstream = 'https://nextnode9124.b-cdn.net/';
const workspace = path.resolve(__dirname, '..');
const output = path.join(workspace, 'neo-os', 'nextnode-browser');
const files = new Map([
  ['modules/browser/index.html', 'index.html'],
  ['assets/remixicon/remixicon.css', 'assets/remixicon/remixicon.css'],
  ['assets/remixicon/remixicon.woff2', 'assets/remixicon/remixicon.woff2'],
  ['browser-vendor/eruda.min.js', 'browser-vendor/eruda.min.js'],
  ['study/libcurl.js', 'study/libcurl.js'],
  ['study/sf-ctl-sw.js', 'study/sf-ctl-sw.js'],
  ['study/sf-ctl.js', 'study/sf-ctl.js'],
  ['study/sf-engine.js', 'study/sf-engine.js'],
  ['study/sf-engine.wasm', 'study/sf-engine.wasm'],
  ['study/sf-inject.js', 'study/sf-inject.js'],
  ['study/sf-sw.js', 'study/sf-sw.js'],
  ['study/sf-utils.js', 'study/sf-utils.js'],
]);

if (!output.startsWith(path.join(workspace, 'neo-os') + path.sep)) {
  throw new Error('NextNode output must stay inside neo-os.');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function writeFile(relative, contents) {
  const target = path.resolve(output, relative);
  if (!target.startsWith(output + path.sep)) throw new Error(`Unsafe output path: ${relative}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

function replaceRequired(source, pattern, replacement, label) {
  const replaced = source.replace(pattern, replacement);
  if (replaced === source) throw new Error(`Could not patch ${label} in the NextNode browser build.`);
  return replaced;
}

function patchBrowserHtml(source) {
  let html = source;
  html = replaceRequired(
    html,
    /<head>/i,
    '<head><script>window.NEO_PROXY_ENGINE="Scramjet";window.NEO_WISP="wss://cleanhost5896.b-cdn.net/w/";<\/script><script src="../neo-ad-shield.js"><\/script>',
    'the Scramjet configuration',
  );
  html = replaceRequired(
    html,
    /<script\s+src=["'](?:\.\/|\/)core\/smartpop\.js["']\s*><\/script>[ \t]*/i,
    '',
    'the popup-ad loader',
  );
  html = replaceRequired(
    html,
    /<div class="nt-logo">Serum<span class="accent">·<\/span>Browser<\/div>/i,
    '<div class="nt-logo">Browser<\/div>',
    'the Browser branding',
  );
  html = replaceRequired(
    html,
    /<button class="cbtn" id="b-pop" title="Open in real browser">/,
    '<button class="cbtn" id="b-pop" title="Open in real browser" hidden aria-hidden="true" tabindex="-1">',
    'the external-browser control',
  );
  html = replaceRequired(
    html,
    /\.menu-btns \{ display: flex; gap: 4px; \}/,
    '.menu-btns { display: flex; gap: 4px; }\n.menu-btns #b-pop { display: none !important; }',
    'the external-browser control styling',
  );
  html = replaceRequired(
    html,
    /var TP=window\[.*?\]\|\|'\/'(?=;)/,
    "var TP=new URL('./',document.baseURI||location.href).pathname",
    'the embedded asset base',
  );
  html = replaceRequired(
    html,
    /function wispEndpoint\(\)\{.*?\}(?=async function bootProxy)/,
    "function wispEndpoint(){return window.NEO_WISP||'wss://cleanhost5896.b-cdn.net/w/';}",
    'the cross-origin parent lookup',
  );
  html = html.replaceAll('SerumAct', 'NEOAct');
  html = html.replaceAll('serum.browser.history', 'neo.browser.history');
  html = replaceRequired(
    html,
    /<\/head>/i,
    [
      '<link rel="preconnect" href="https://nextnode9124.b-cdn.net" crossorigin>',
      '<link rel="preload" href="./study/sf-engine.js" as="script">',
      '<link rel="preload" href="./study/sf-ctl.js" as="script">',
      '<link rel="preload" href="./study/sf-utils.js" as="script">',
      '<link rel="preload" href="./study/libcurl.js" as="script">',
      '<link rel="preload" href="./study/sf-engine.wasm" as="fetch" type="application/wasm" crossorigin>',
      '</head>',
    ].join(''),
    'the critical proxy preloads',
  );
  html = replaceRequired(
    html,
    /<script\s+src=["'](?:\.\/|\/)browser-vendor\/eruda\.min\.js["']\s*><\/script>[ \t]*/i,
    `<script>(function(){
      var pending;
      var desired='hidden';
      function load(){
        if(pending)return pending;
        pending=new Promise(function(resolve,reject){
          var stub=window.eruda;
          var script=document.createElement('script');
          script.src=new URL('./browser-vendor/eruda.min.js',document.baseURI||location.href).href;
          script.async=true;
          script.onload=function(){resolve(window.eruda===stub?null:window.eruda);};
          script.onerror=reject;
          document.head.appendChild(script);
        });
        return pending;
      }
      var stub={
        init:function(){desired='visible';load().then(function(api){if(api){api.init();if(desired==='visible')api.show();}}).catch(function(){});},
        show:function(){desired='visible';load().then(function(api){if(api)api.show();}).catch(function(){});},
        hide:function(){desired='hidden';load().then(function(api){if(api)api.hide();}).catch(function(){});}
      };
      window.eruda=stub;
    })();</script>`,
    'the lazy developer tools loader',
  );
  for (const prefix of ['assets/remixicon/', 'browser-vendor/', 'core/', 'study/']) {
    html = html.replaceAll(`\"/${prefix}`, `\"./${prefix}`);
    html = html.replaceAll(`'/${prefix}`, `'./${prefix}`);
  }
  html = replaceRequired(
    html,
    /<\/body>/i,
    `<script>(function(){
      var builtInBookmarks=new Set([
        'https://www.youtube.com/','https://www.tiktok.com/','https://discord.com/app',
        'https://www.reddit.com/','https://x.com/','https://www.twitch.tv/',
        'https://open.spotify.com/','https://web.snapchat.com/','https://www.roblox.com/',
        'https://poki.com/','https://www.coolmathgames.com/','https://www.crazygames.com/'
      ]);
      if(typeof bookmarks!=='undefined'&&Array.isArray(bookmarks)){
        bookmarks=bookmarks.filter(function(bookmark){
          try{return !builtInBookmarks.has(new URL(bookmark.url).href);}catch(error){return true;}
        });
        if(typeof saveBookmarks==='function')saveBookmarks();
        if(typeof renderBookmarks==='function')renderBookmarks();
      }
      function normalizeMalformedExternalLink(value){
        var raw=String(value||'').trim().replace(/&amp;/g,'&');
        var direct=raw.match(/^(https?)(?:\\\\|\\/)?\\:\\/+(.+)$/i);
        if(!direct)direct=raw.match(/^(https?)\\/\\:\\/+(.+)$/i);
        if(direct)return direct[1].toLowerCase()+'://'+direct[2].replace(/^\\/+/,'');
        var nested=raw.match(/^https?:\\/\\/.*?\\/(https?)(?:\\\\|\\/)?\\:\\/+(.+)$/i);
        return nested?nested[1].toLowerCase()+'://'+nested[2].replace(/^\\/+/,''):'';
      }
      function installMalformedLinkRepair(doc){
        if(!doc||doc.__neoMalformedLinkRepair)return;
        doc.__neoMalformedLinkRepair=true;
        doc.addEventListener('click',function(event){
          var target=event.target&&event.target.closest?event.target.closest('a[href]'):null;
          if(!target)return;
          var repaired=normalizeMalformedExternalLink(target.getAttribute('href'));
          if(!repaired)return;
          event.preventDefault();
          event.stopImmediatePropagation();
          navigate(repaired);
        },true);
      }
      function installGoogleSitesGameRepair(tab,frame,doc){
        if(!doc||doc.__neoGoogleSitesGameRepair)return;
        doc.__neoGoogleSitesGameRepair=true;
        var attempts=0;
        var timer=setInterval(function(){
          attempts+=1;
          try{
            var embeds=Array.from(doc.querySelectorAll('iframe')).filter(function(item){
              return /(?:www\\.)?gstatic\\.com\\/atari\\/embeds\\//i.test(String(item.src||item.getAttribute('src')||''));
            });
            if(!embeds.length){
              if(attempts>=40)clearInterval(timer);
              return;
            }
            var serialized=doc.documentElement?doc.documentElement.outerHTML:'';
            var decoder=doc.createElement('textarea');
            decoder.innerHTML=serialized;
            var decoded=decoder.value;
            var sourceHost='';
            try{sourceHost=new URL(String(tab&&tab.url||'')).hostname.toLowerCase();}catch(error){}
            var candidates=[];
            (decoded.match(/<link\\b[^>]*>/gi)||[]).forEach(function(tag){
              if(!/\\brel\\s*=\\s*(['"])[^'"]*\\bcanonical\\b[^'"]*\\1/i.test(tag))return;
              var match=tag.match(/\\bhref\\s*=\\s*(['"])(.*?)\\1/i);
              if(match)candidates.push(match[2]);
            });
            (decoded.match(/<iframe\\b[^>]*>/gi)||[]).forEach(function(tag){
              var match=tag.match(/\\bsrc\\s*=\\s*(['"])(https?:\\/\\/.*?)\\1/i);
              if(match)candidates.push(match[2]);
            });
            var target='';
            candidates.some(function(value){
              try{
                var url=new URL(String(value).replace(/&amp;/g,'&'));
                var host=url.hostname.toLowerCase();
                if(!/^https?:$/.test(url.protocol)||host===sourceHost||/(^|\\.)(?:google\\.com|googleusercontent\\.com|gstatic\\.com|googletagmanager\\.com|google-analytics\\.com)$/.test(host))return false;
                target=url.href;
                return true;
              }catch(error){return false;}
            });
            if(!target){
              if(attempts>=40)clearInterval(timer);
              return;
            }
            embeds.forEach(function(embed){
              if(embed.dataset.neoGoogleSitesGame==='ready')return;
              var gameFrame=document.createElement('iframe');
              Array.from(embed.attributes||[]).forEach(function(attribute){
                if(attribute.name!=='src')gameFrame.setAttribute(attribute.name,attribute.value);
              });
              gameFrame.dataset.neoGoogleSitesGame='ready';
              gameFrame.title=embed.title||'Embedded game';
              gameFrame.setAttribute('allow','autoplay; fullscreen; gamepad; clipboard-read; clipboard-write');
              gameFrame.setAttribute('allowfullscreen','');
              var sandbox=String(gameFrame.getAttribute('sandbox')||'');
              ['allow-scripts','allow-same-origin','allow-forms','allow-popups','allow-pointer-lock','allow-modals','allow-presentation','allow-downloads'].forEach(function(token){
                if(!sandbox.split(/\\s+/).includes(token))sandbox+=(sandbox?' ':'')+token;
              });
              gameFrame.setAttribute('sandbox',sandbox);
              gameFrame.addEventListener('load',function(){
                try{installMalformedLinkRepair(gameFrame.contentDocument);}catch(error){}
              });
              embed.replaceWith(gameFrame);
              sjController.createFrame(gameFrame).go(target);
            });
            clearInterval(timer);
          }catch(error){
            if(attempts>=40)clearInterval(timer);
          }
        },200);
      }
      var upstreamMakeFrame=window.makeFrame;
      if(typeof upstreamMakeFrame==='function'){
        window.makeFrame=function(tab){
          var result=upstreamMakeFrame.apply(this,arguments);
          var frame=tab&&tab.frameEl;
          if(frame&&!frame.dataset.neoSearchBridge){
            frame.dataset.neoSearchBridge='true';
            frame.addEventListener('load',function(){
              try{
                var doc=frame.contentDocument;
                installMalformedLinkRepair(doc);
                installGoogleSitesGameRepair(tab,frame,doc);
                if(!doc||doc.__neoSearchBridge)return;
                doc.__neoSearchBridge=true;
                function routeSearch(input,event){
                  if(!input||!tab||!isSearchProviderUrl(tab.url))return;
                  event.preventDefault();
                  event.stopImmediatePropagation();
                  navigate(searchUrl(input.value||''));
                }
                frame.contentWindow.addEventListener('keydown',function(event){
                  if(event.key!=='Enter')return;
                  var target=event.target;
                  var input=target&&target.matches&&target.matches('input[name="q"]')?target:null;
                  routeSearch(input,event);
                },true);
                frame.contentWindow.addEventListener('submit',function(event){
                  var form=event.target;
                  routeSearch(form&&form.querySelector&&form.querySelector('input[name="q"]'),event);
                },true);
              }catch(error){}
            });
          }
          return result;
        };
      }
      var upstreamOnFrameUrl=window.onFrameUrl;
      if(typeof upstreamOnFrameUrl==='function'){
        window.onFrameUrl=function(tab,url){
          if(tab&&/^(?:https?:\\/\\/)?(?:html\\.)?duckduckgo\\.com(?:\\/|$)/i.test(String(tab.url||''))&&/^https?:\\/\\/(?:html\\.)?duckduckgo\\.com\\/undefined(?:[?#]|$)/i.test(String(url||''))){
            if(tab.id===activeId){
              currentUrl=tab.url;
              var address=document.getElementById('url');
              if(address)address.value=tab.url;
              updateLock(tab.url);
            }
            return;
          }
          return upstreamOnFrameUrl.apply(this,arguments);
        };
      }
      var SEARCH_PROVIDERS={
        google:function(query){return 'https://www.google.com/search?q='+encodeURIComponent(query);},
        bing:function(query){return 'https://www.bing.com/search?q='+encodeURIComponent(query);},
        duckduckgo:function(query){return 'https://duckduckgo.com/?q='+encodeURIComponent(query);},
        brave:function(query){return 'https://search.brave.com/search?q='+encodeURIComponent(query);},
        searxng:function(query){return 'https://search.yuri.llc/search?q='+encodeURIComponent(query);}
      };
      var selectedSearchProvider='duckduckgo';
      function setSearchProvider(value){
        selectedSearchProvider=Object.prototype.hasOwnProperty.call(SEARCH_PROVIDERS,String(value||'').toLowerCase())?String(value).toLowerCase():'duckduckgo';
        window.NEO_SEARCH_PROVIDER=selectedSearchProvider;
      }
      function searchUrl(query){return SEARCH_PROVIDERS[selectedSearchProvider](String(query||''));}
      function isSearchProviderUrl(url){
        try{return /(^|\\.)(?:google\\.com|bing\\.com|duckduckgo\\.com|brave\\.com|yuri\\.llc)$/i.test(new URL(String(url||'')).hostname);}catch(error){return false;}
      }
      window.addEventListener('message',function(event){
        if(event.source!==parent||!event.data||event.data.type!=='neo:browser-settings-change')return;
        setSearchProvider(event.data.searchEngine);
      });
      setSearchProvider('duckduckgo');
      try{if(parent!==window)parent.postMessage({type:'neo-browser:settings-request'},'*');}catch(error){}
      var upstreamNormalize=window.normalizeInput;
      if(typeof upstreamNormalize!=='function')return;
      window.normalizeInput=function(input){
        var value=String(input||'').trim();
        if(!value)return null;
        var looksLikeAddress=/^(?:[a-z][a-z0-9+.-]*:\\/\\/|localhost(?:[:/]|$)|(?:\\d{1,3}\\.){3}\\d{1,3}(?:[:/]|$)|(?:[^.\\s]+\\.)+[^.\\s]{2,}(?:[:/]|$))/i.test(value);
        return looksLikeAddress?upstreamNormalize(value):searchUrl(value);
      };
    })();</script></body>`,
    'the reliable default search provider',
  );
  return html;
}

function patchController(source) {
  const prefixPattern = /new URL\(this\.prefix,location\.href\)/g;
  const locationPattern = /new URL\(location\.href\)/g;
  if ((source.match(prefixPattern) || []).length !== 2) {
    throw new Error('Could not locate both controller prefix bases in the NextNode browser build.');
  }
  if ((source.match(locationPattern) || []).length !== 2) {
    throw new Error('Could not locate both controller navigation bases in the NextNode browser build.');
  }
  return source
    .replace(prefixPattern, 'new URL(this.prefix,document.baseURI||location.href)')
    .replace(locationPattern, 'new URL(document.baseURI||location.href)');
}

function repairMalformedProxyRequestUrl(rawUrl) {
  let current;
  try { current = new URL(rawUrl); } catch (_error) { return ''; }
  const marker = '/study/uv/';
  const markerIndex = current.pathname.indexOf(marker);
  if (markerIndex < 0) return '';
  const routeStart = markerIndex + marker.length;
  const firstSlash = current.pathname.indexOf('/', routeStart);
  const secondSlash = firstSlash < 0 ? -1 : current.pathname.indexOf('/', firstSlash + 1);
  if (secondSlash < 0) return '';
  let payload = current.pathname.slice(secondSlash + 1);
  try { payload = decodeURIComponent(payload); } catch (_error) {}
  const target = payload
    .replace(/^https\\:\/+/i, 'https://')
    .replace(/^http\\:\/+/i, 'http://')
    .replace(/^https\/:\/+/i, 'https://')
    .replace(/^http\/:\/+/i, 'http://')
    .replace(/^https:\/(?!\/)/i, 'https://')
    .replace(/^http:\/(?!\/)/i, 'http://');
  let repairedTarget = target;
  const nestedMalformedScheme = repairedTarget.match(/^https?:\/\/.*?\/(https?)(?:\\|\/)?\:\/+(.+)$/i);
  if (nestedMalformedScheme) repairedTarget = nestedMalformedScheme[1] + '://' + nestedMalformedScheme[2];
  if (!/^https?:\/\//i.test(repairedTarget) || repairedTarget === payload) return '';
  const targetQuery = [];
  const proxyQuery = [];
  current.search.replace(/^\?/, '').split('&').filter(Boolean).forEach((part) => {
    let name = part.split('=', 1)[0];
    try { name = decodeURIComponent(name); } catch (_error) {}
    (name.startsWith('$') ? proxyQuery : targetQuery).push(part);
  });
  if (targetQuery.length) repairedTarget += '?' + targetQuery.join('&');
  repairedTarget += current.hash;
  const prefix = current.pathname.slice(0, secondSlash + 1);
  return current.origin + prefix + encodeURIComponent(repairedTarget) + (proxyQuery.length ? '?' + proxyQuery.join('&') : '');
}

function patchedProxyFetch(e) {
  let routedEvent = e;
  const repairedUrl = repairMalformedProxyRequestUrl(e.request.url);
  if (repairedUrl && /^(?:GET|HEAD)$/i.test(e.request.method)) {
    const repairedRequest = new Request(repairedUrl, {
      method: e.request.method,
      headers: e.request.headers,
      credentials: e.request.credentials,
      cache: e.request.cache,
      redirect: e.request.redirect,
      referrer: e.request.referrer,
      referrerPolicy: e.request.referrerPolicy,
      integrity: e.request.integrity,
    });
    routedEvent = { request: repairedRequest, clientId: e.clientId, resultingClientId: e.resultingClientId };
  }
  if ($internalController.shouldRoute(routedEvent)) e.respondWith($internalController.route(routedEvent));
}

function patchServiceWorker(source) {
  return replaceRequired(
    source,
    /addEventListener\('fetch', \(e\) => \{\s*if \(\$internalController\.shouldRoute\(e\)\) e\.respondWith\(\$internalController\.route\(e\)\);\s*\}\);/,
    `${repairMalformedProxyRequestUrl.toString()}\n${patchedProxyFetch.toString()}\naddEventListener('fetch', patchedProxyFetch);`,
    'malformed proxied navigation recovery',
  );
}

async function download(relative) {
  const url = new URL(relative, upstream);
  const response = await fetch(url, { headers: { 'user-agent': 'NEO-OS-build/1.0' } });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  const downloaded = await Promise.all(Array.from(files, async ([remote, local]) => {
    const contents = await download(remote);
    return { remote, local, contents };
  }));

  const staged = output + '.sync';
  fs.rmSync(staged, { recursive: true, force: true });
  fs.mkdirSync(staged, { recursive: true });

  const previousOutput = output;
  const manifest = [];
  for (const item of downloaded) {
    let contents = item.contents;
    if (item.local === 'index.html') contents = Buffer.from(patchBrowserHtml(contents.toString('utf8')));
    if (item.local === 'study/sf-ctl.js') contents = Buffer.from(patchController(contents.toString('utf8')));
    if (item.local === 'study/sf-sw.js') contents = Buffer.from(patchServiceWorker(contents.toString('utf8')));
    const target = path.resolve(staged, item.local);
    if (!target.startsWith(staged + path.sep)) throw new Error(`Unsafe staged path: ${item.local}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
    manifest.push({ path: item.local.replace(/\\/g, '/'), bytes: contents.length, sha256: sha256(contents), upstream: new URL(item.remote, upstream).href });
  }

  const syncedAt = new Date().toISOString();
  const launcher = path.join(previousOutput, 'launch.svg');
  if (fs.existsSync(launcher)) fs.copyFileSync(launcher, path.join(staged, 'launch.svg'));
  fs.writeFileSync(path.join(staged, 'upstream-manifest.json'), JSON.stringify({ upstream, syncedAt, files: manifest }, null, 2) + '\n');
  fs.writeFileSync(path.join(staged, 'UPSTREAM.md'), [
    '# NextNode browser runtime',
    '',
    `Synced from ${upstream} on ${syncedAt}.`,
    '',
    'This is the complete Scramjet browser/proxy runtime used by NEO Browser. The embedding patch makes its asset base relative, selects the upstream WISP endpoint, applies the simplified Browser branding, removes built-in bookmarks and external-open chrome, loads the shared ad shield, removes the upstream popup-ad loader, and avoids reading the cross-origin parent window.',
    '',
    'Run `node scripts/sync-nextnode-browser.cjs` to refresh the pinned files and hashes.',
    '',
  ].join('\n'));

  fs.rmSync(previousOutput, { recursive: true, force: true });
  fs.renameSync(staged, previousOutput);
  const total = manifest.reduce((sum, item) => sum + item.bytes, 0);
  console.log(`Synced ${manifest.length} NextNode files (${total.toLocaleString()} bytes).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
