const fs = require("node:fs");
const path = require("node:path");

const bundlePath = path.resolve(__dirname, "../neo-os/music-v3/assets/index-INyHQp-7.js");
let source = fs.readFileSync(bundlePath, "utf8");

function replaceOnce(before, after, label) {
  const matches = source.split(before).length - 1;
  if (matches === 0 && source.includes(after)) return;
  if (matches !== 1) {
    throw new Error(`${label}: expected one match, found ${matches}`);
  }
  source = source.replace(before, after);
}

replaceOnce(
  "async _initShaka(){try{",
  "async _initShaka(){if(__neoMusicMode)return;try{",
  "skip optional Shaka startup in NEO mode"
);

replaceOnce(
  "async playTrackFromQueue(e=0,n=0,s=!1,r={}){await this.shakaReady;",
  "async playTrackFromQueue(e=0,n=0,s=!1,r={}){__neoMusicMode||await this.shakaReady;",
  "remove the NEO first-play Shaka gate"
);

replaceOnce(
  "async _executePreloadNextTracks(){this.preloadAbortController&&this.preloadAbortController.abort()",
  "async _executePreloadNextTracks(){if(__neoMusicMode)return;this.preloadAbortController&&this.preloadAbortController.abort()",
  "disable competing NEO whole-song preloads"
);

replaceOnce(
  "R=El(x=>{x&&x===_.value.trim()&&I(x)},3e3),P=",
  "R=El(x=>{x&&x===_.value.trim()&&I(x)},300),P=",
  "reduce the search debounce"
);

replaceOnce(
  'const s=await this.cache.get("search_tracks",e);if(s)return s;try{if(typeof window<"u"&&__neoMusicMode){',
  'const s=await this.cache.get("search_tracks",e);if(s){if(__neoMusicMode)for(const E of s.items||[])E.neoStreamUrl&&(__neoFullStreams[String(E.id)]=E.neoStreamUrl);return s}try{if(typeof window<"u"&&__neoMusicMode){',
  "rehydrate cached full-song URLs"
);

replaceOnce(
  'for(const f of ["https://proxy.cors.sh/"+d,"https://api.allorigins.win/raw?url="+encodeURIComponent(d),"https://api.allorigins.win/get?url="+encodeURIComponent(d)])',
  'for(const f of (window.__NEO_RUNNER_NETWORK__?["https://proxy.cors.sh/"+d]:["https://proxy.cors.sh/"+d,"https://api.allorigins.win/raw?url="+encodeURIComponent(d),"https://api.allorigins.win/get?url="+encodeURIComponent(d)]))',
  "avoid duplicate runner search retries"
);

replaceOnce(
  'audioQuality:"HIGH",mediaMetadata:{tags:[]},copyright:""})',
  'audioQuality:"HIGH",mediaMetadata:{tags:[]},copyright:"",neoStreamUrl:__neoFullStreams[f]})',
  "persist the full-song URL with cached tracks"
);

replaceOnce(
  'const u=String(e),h=__neoFullStreams[u];if(!h)throw new Error("Search for this song again to load its full track.");',
  'const u=String(e),h=__neoFullStreams[u]||(/^yt[A-Za-z0-9_-]+$/.test(u)?"https://vcsa.huangqirui.xyz/api/yt/astream/"+u.slice(2):"");if(!h)throw new Error("Search for this song again to load its full track.");',
  "recover deterministic full-song URLs after reload"
);

replaceOnce(
  'const m={url:h,playbackType:"direct",mimeType:"video/mp4",provider:"neo",rgInfo:',
  'const m={url:h.includes("proxy.cors.sh/")?h:"https://proxy.cors.sh/"+h,playbackType:"direct",mimeType:"video/mp4",provider:"neo",rgInfo:',
  "use the range-capable CORS stream in every NEO host"
);

replaceOnce(
  'this.shouldFetchMoreArtistPopularTracks(l)&&(u?this.fetchMoreArtistPopularTracksForPlayback(l).catch(console.error):await this.fetchMoreArtistPopularTracksForPlayback(l)),u?this.saveQueueState().catch(console.error):await this.saveQueueState(),this.currentTrack=c',
  'this.shouldFetchMoreArtistPopularTracks(l)&&!__neoMusicMode&&(u?this.fetchMoreArtistPopularTracksForPlayback(l).catch(console.error):await this.fetchMoreArtistPopularTracksForPlayback(l)),(__neoMusicMode||u)?this.saveQueueState().catch(console.error):await this.saveQueueState(),this.currentTrack=c',
  "keep queue persistence and stale artist expansion off the playback critical path"
);

replaceOnce(
  ';!c.videoUrl&&!c.videoCoverUrl&&!c.album?.videoCoverUrl&&this.api.getVideoArtwork(h,m).then(',
  ';!__neoMusicMode&&!c.videoUrl&&!c.videoCoverUrl&&!c.album?.videoCoverUrl&&this.api.getVideoArtwork(h,m).then(',
  "avoid competing video-artwork requests during NEO audio startup"
);

fs.writeFileSync(bundlePath, source);
console.log("Patched NEO Music for fast full-song startup.");
