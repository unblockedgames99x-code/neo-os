(function () {
  'use strict';
  if (window.NEO_SYSTEM_BRIDGE) return;
  const config=window.NEO_DESKTOP_CONFIG;if(!config)return;
  const defaults={theme:'oled',volume:70,muted:false,brightness:100,volumeBar:false,reducedMotion:false};
  const legacyThemes={dark:'graphite',light:'frost',retro:'ember','high-contrast':'contrast'};
  const messageTargetOrigin=location.origin==='null'?'*':location.origin;
  const trustedMessageOrigin=origin=>location.origin==='null'?origin==='null':origin===location.origin;
  let state={...defaults};try{state={...state,...JSON.parse(localStorage.getItem(config.storageKey)||'{}')};}catch(_){}
  const media=new Set(), baseVolume=new WeakMap(), baseMuted=new WeakMap(), gains=new Set();
  const volumeDescriptor=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'volume');
  const muteDescriptor=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'muted');
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
  function applyMedia(m){try{volumeDescriptor.set.call(m,(baseVolume.has(m)?baseVolume.get(m):volumeDescriptor.get.call(m))*state.volume/100);muteDescriptor.set.call(m,Boolean(baseMuted.get(m))||state.muted);}catch(_) {}}
  function track(m){if(!media.has(m)){if(!baseVolume.has(m))baseVolume.set(m,volumeDescriptor.get.call(m));if(!baseMuted.has(m))baseMuted.set(m,muteDescriptor.get.call(m));media.add(m);applyMedia(m);}return m;}
  // Keep each player's own volume intact; master attenuation never overwrites it.
  Object.defineProperty(HTMLMediaElement.prototype,'volume',{configurable:true,get(){return baseVolume.has(this)?baseVolume.get(this):volumeDescriptor.get.call(this);},set(v){v=Number(v);if(!Number.isFinite(v)||v<0||v>1)throw new DOMException('Volume must be between 0 and 1.','IndexSizeError');baseVolume.set(this,v);media.add(this);applyMedia(this);}});
  Object.defineProperty(HTMLMediaElement.prototype,'muted',{configurable:true,get(){return baseMuted.has(this)?baseMuted.get(this):muteDescriptor.get.call(this);},set(v){baseMuted.set(this,Boolean(v));media.add(this);applyMedia(this);}});
  const NativeAudio=window.Audio;window.Audio=function(src){const m=new NativeAudio();track(m);if(src)m.src=src;return m;};window.Audio.prototype=NativeAudio.prototype;
  // Intercept destination connections, not oscillators or a game's internal mix.
  if(window.AudioNode){const connect=AudioNode.prototype.connect,disconnect=AudioNode.prototype.disconnect;const masters=new WeakMap();AudioNode.prototype.connect=function(destination,...args){if(destination===this.context.destination){let gain=masters.get(this.context);if(!gain){gain=this.context.createGain();gain.gain.value=state.muted?0:state.volume/100;masters.set(this.context,gain);gains.add(gain);connect.call(gain,destination);}connect.call(this,gain,...args);return destination;}return connect.call(this,destination,...args);};AudioNode.prototype.disconnect=function(...args){if(args[0]===this.context.destination&&masters.has(this.context))args[0]=masters.get(this.context);return disconnect.apply(this,args);};}
  const palette=()=>{const colors=config.themes[state.theme];return Object.fromEntries(['bg','surface','text','muted','line','accent'].map((key,i)=>[key,colors[i]]));};
  function sendPreferences(target){if(!target)return;try{target.postMessage({type:'neo-system-preferences',state:{...state},palette:palette()},messageTargetOrigin);}catch(_) {}}
  const isFullProxyFrame=frame=>Boolean(
    frame.closest?.('.neo-window[data-app-id="browser"], .neo-window[data-browser-target]') ||
    /\/(?:nextnode-browser|NEO-BROWSER|browse-v\d+)\//i.test(frame.src||'')
  );
  function sendFramePreferences(frame){
    // Scramjet replaces postMessage on its controlled WindowProxy. Calling it
    // from the shell can surface an internal proxy error after navigation.
    // Browser apps already consume the shared theme through neo-app-theme.js,
    // so they do not need the generic preference message.
    if(isFullProxyFrame(frame))return;
    sendPreferences(frame.contentWindow);
  }
  function syncFrames(){document.querySelectorAll('iframe').forEach(sendFramePreferences);}
  function apply(){
    state.theme=legacyThemes[state.theme]||state.theme;if(!config.themes[state.theme])state.theme='oled';state.volume=clamp(state.volume,0,100);state.brightness=clamp(state.brightness,45,100);
    const root=document.documentElement,colors=config.themes[state.theme];root.dataset.neoTheme=state.theme;root.dataset.desktopMotion=state.reducedMotion?'reduced':'normal';
    ['bg','surface','text','muted','line','accent'].forEach((key,i)=>root.style.setProperty('--desktop-'+key,colors[i]));
    root.style.colorScheme=state.theme==='frost'?'light':'dark';
    media.forEach(applyMedia);gains.forEach(g=>{try{g.gain.setTargetAtTime(state.muted?0:state.volume/100,g.context.currentTime,.015);}catch(_){}});
    window.dispatchEvent(new CustomEvent('neo-system-state',{detail:{...state,palette:palette()}}));syncFrames();
  }
  function set(patch){state={...state,...patch};apply();try{localStorage.setItem(config.storageKey,JSON.stringify(state));}catch(_){window.dispatchEvent(new CustomEvent('neo-storage-warning'));}return {...state};}
  function scan(node){if(node.matches?.('audio,video'))track(node);node.querySelectorAll?.('audio,video').forEach(track);}
  document.addEventListener('play',e=>{if(e.target instanceof HTMLMediaElement)track(e.target);},true);
  document.addEventListener('ended',e=>{if(e.target instanceof HTMLMediaElement&&!e.target.isConnected)media.delete(e.target);},true);
  function ready(){scan(document);new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(node=>{scan(node);if(node.matches?.('iframe'))node.addEventListener('load',()=>sendFramePreferences(node));node.querySelectorAll?.('iframe').forEach(frame=>frame.addEventListener('load',()=>sendFramePreferences(frame)));}))).observe(document.documentElement,{childList:true,subtree:true});document.querySelectorAll('iframe').forEach(frame=>frame.addEventListener('load',()=>sendFramePreferences(frame)));syncFrames();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
  window.addEventListener('storage',e=>{if(e.key===config.storageKey){try{state={...defaults,...JSON.parse(e.newValue||'{}')};apply();}catch(_){}}});
  window.addEventListener('message',e=>{const ownedFrame=()=>Array.from(document.querySelectorAll('iframe')).find(frame=>frame.contentWindow===e.source);if(e.data?.type==='neo-browser-theme-request')return;if(!trustedMessageOrigin(e.origin))return;if(e.data?.type==='neo-system-preferences-request'){const frame=ownedFrame();if(frame&&!isFullProxyFrame(frame))sendPreferences(e.source);return;}if(e.source!==parent||e.data?.type!=='neo-system-preferences')return;state={...state,...e.data.state};apply();});
  window.NEO_SYSTEM_BRIDGE={set,get:()=>({...state}),effectiveVolume:m=>volumeDescriptor.get.call(m),effectiveMuted:m=>muteDescriptor.get.call(m),audioSources:()=>media.size};apply();
})();
