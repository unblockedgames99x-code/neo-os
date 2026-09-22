// Compatibility adapter for the ORIGINAL browser UI, not a replacement UI.
// A production proxy must supply its own authenticated, maintained backend.
// This local build never selects public relays or silently falls back to Google.
(() => {
  'use strict';
  let active=false, generation=0, currentFrame=null, visibleUrl='';
  const permitted=['/neo-os/music-v2/','/neo-os/local-browser/','/games/grandmaster-chess.html','/games/tetris.html','/games/quantum-clicker.html'];
  function emit(name,detail){if(name==='urlchange'){if(detail.url===visibleUrl)return;visibleUrl=detail.url;}window.dispatchEvent(new CustomEvent('neo:scramjet:'+name,{detail}));}
  function allowed(url){return url.origin===location.origin&&permitted.some(p=>url.pathname===p||p.endsWith('/')&&url.pathname.startsWith(p));}
  async function go(value,frame){
    const serial=++generation;active=true;currentFrame=frame;
    let url;try{url=new URL(value,location.href);}catch(_){url=new URL('/neo-os/local-browser/',location.origin);}
    const query=url.searchParams.get('q')?.trim().toLowerCase();
    const shortcuts={music:'/neo-os/music-v2/',chess:'/games/grandmaster-chess.html',tetris:'/games/tetris.html',clicker:'/games/quantum-clicker.html',local:'/neo-os/local-browser/'};
    if(query&&Object.hasOwn(shortcuts,query))url=new URL(shortcuts[query],location.origin);
    frame.dataset.neoScramjet='true';frame.removeAttribute('srcdoc');frame.style.opacity='1';
    const requested=url.href;
    if(!allowed(url))url=new URL('/neo-os/local-browser/connection.html?target='+encodeURIComponent(requested),location.origin);
    frame.onload=()=>{if(!active||serial!==generation)return;let title='NEO Browser';try{title=frame.contentDocument.title||title;const loaded=new URL(frame.contentWindow.location.href);if(allowed(loaded)&&loaded.pathname!=='/neo-os/local-browser/connection.html')emit('urlchange',{url:loaded.href});}catch(_){}emit('ready',{title});};
    frame.src=url.href;emit('urlchange',{url:requested});
  }
  globalThis.NeoScramjet=Object.freeze({supports:value=>/^https?:/i.test(String(value)),go,isProxyUrl:()=>active,deactivate(){active=false;++generation;if(currentFrame){currentFrame.onload=null;delete currentFrame.dataset.neoScramjet;}},configuredRelay:()=>'',allowRelay:()=>false,get active(){return active;}});
  // The original optional panels may contain old online preferences. Deny
  // external fetches here BEFORE a socket or request can leave the browser.
  const nativeFetch=window.fetch.bind(window);
  window.fetch=(input,options)=>{let url;try{url=new URL(input instanceof Request?input.url:input,location.href);}catch(_){return Promise.reject(new TypeError('Invalid URL'));}if(url.origin!==location.origin&&!['blob:','data:'].includes(url.protocol))return Promise.reject(new Error('This integration requires a configured online service.'));return nativeFetch(input,options);};
})();
