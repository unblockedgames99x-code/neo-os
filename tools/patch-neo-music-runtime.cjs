const fs = require('node:fs');
const path = require('node:path');

const bundle = path.resolve(__dirname, '..', 'neo-os', 'music-v2', 'assets', 'index-DoF3sT5h.js');
let source = fs.readFileSync(bundle, 'utf8');
let changes = 0;
const streamMarker = 'async getStreamUrl(e,s="LOSSLESS",n={}){const r=`stream_info_${e}_${s}`;if(this.streamCache.has(r))return this.streamCache.get(r);';
const streamAttemptEnd = '}if(pr.isEnabled())';
const streamInsertion = `${streamMarker}try{const t=await fetch(\`https://lol.samidy.workers.dev/track/?id=\${encodeURIComponent(e)}&quality=LOSSLESS\`,{signal:n?.signal});if(!t.ok)throw new Error(\`HiFi stream request failed: HTTP \${t.status}\`);const i=await t.json(),a=i?.data??i,o=a?.OriginalTrackUrl||a?.originalTrackUrl||this.extractStreamUrlFromManifest(a?.manifest);if(o){const t={url:o,rgInfo:{trackReplayGain:a?.trackReplayGain??a?.replayGain??0,trackPeakAmplitude:a?.trackPeakAmplitude??a?.peakAmplitude??1,albumReplayGain:a?.albumReplayGain??0,albumPeakAmplitude:a?.albumPeakAmplitude??1},provider:"hifi",playbackType:String(a?.manifestMimeType||"").includes("dash")?"dash":"direct",mimeType:a?.manifestMimeType||"audio/flac"};return this.streamCache.set(r,t),t}}catch(t){console.warn("NEO HiFi playback fallback failed:",t)}`;
const searchMarker = 'const a=n!=="streaming";let o=null;if(a)try{return await se.instance.query(e)}';
const searchInsertion = 'const a=!1;let o=null;if(a)try{return await se.instance.query(e)}';
const providerSearchInsertion = 'async search(e,s={}){const n=this.getAPI();return typeof n.search==="function"?n.search(e,s):this.searchWithCurrentProvider(e,s)}';

if (!source.includes('fetch(`https://lol.samidy.workers.dev/track/')) {
  const streamStart = source.indexOf(streamMarker);
  const streamEnd = source.indexOf(streamAttemptEnd, streamStart);
  if (streamStart < 0 || streamEnd < 0) throw new Error('Could not locate the Music streaming method.');
  source = source.slice(0, streamStart) + streamInsertion + source.slice(streamEnd + 1);
  changes += 1;
}

if (!source.includes(searchInsertion)) {
  const occurrences = source.split(searchMarker).length - 1;
  if (occurrences !== 1) {
    throw new Error(`Expected one Music search marker, found ${occurrences}.`);
  }
  source = source.replace(searchMarker, searchInsertion);
  changes += 1;
}

if (!source.includes(providerSearchInsertion)) {
  const providerClass = source.indexOf('constructor(e){this.tidalAPI');
  const providerSearchStart = source.indexOf('async search(e,s={})', providerClass);
  const providerSearchEnd = source.indexOf('async searchWithCurrentProvider(e,s={})', providerSearchStart);
  if (providerClass < 0 || providerSearchStart < 0 || providerSearchEnd < 0) {
    throw new Error('Could not locate the top-level Music provider search method.');
  }
  source = source.slice(0, providerSearchStart) + providerSearchInsertion + source.slice(providerSearchEnd);
  changes += 1;
}

if (changes) fs.writeFileSync(bundle, source);
console.log(changes
  ? 'Patched NEO Music to use playback-compatible HiFi search and streaming.'
  : 'NEO Music search and playback fallbacks already patched.');
