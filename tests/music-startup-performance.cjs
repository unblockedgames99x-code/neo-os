const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const bundle = fs.readFileSync(
  path.resolve(__dirname, "../neo-os/music-v3/assets/index-INyHQp-7.js"),
  "utf8"
);
const runner = fs.readFileSync(
  path.resolve(__dirname, "../neo-os/neo-runner-network.js"),
  "utf8"
);

assert.ok(
  bundle.includes("async _initShaka(){if(__neoMusicMode)return;try{"),
  "NEO Music must not download and initialize Shaka before native full-song playback"
);
assert.ok(
  bundle.includes("async playTrackFromQueue(e=0,n=0,s=!1,r={}){__neoMusicMode||await this.shakaReady;"),
  "direct NEO playback must not wait for the optional adaptive player"
);
assert.ok(
  bundle.includes("async _executePreloadNextTracks(){if(__neoMusicMode)return;"),
  "school Chromebooks must not download a competing next song in the background"
);
assert.ok(
  bundle.includes("R=El(x=>{x&&x===_.value.trim()&&I(x)},300),P="),
  "search feedback must not wait three seconds"
);
assert.ok(
  bundle.includes("neoStreamUrl:__neoFullStreams[f]"),
  "cached search results must retain their full-song URL"
);
assert.ok(
  bundle.includes('"https://vcsa.huangqirui.xyz/api/yt/astream/"+u.slice(2)'),
  "saved YouTube-backed tracks must recover their deterministic full-song URL"
);
assert.ok(
  bundle.includes('url:h.includes("proxy.cors.sh/")?h:"https://proxy.cors.sh/"+h'),
  "all NEO hosts must hand the browser a range-capable CORS stream"
);
assert.ok(
  bundle.includes("this.shouldFetchMoreArtistPopularTracks(l)&&!__neoMusicMode"),
  "stale artist expansion must not compete with a selected NEO song"
);
assert.ok(
  bundle.includes("(__neoMusicMode||u)?this.saveQueueState().catch(console.error):await this.saveQueueState()"),
  "queue persistence must not delay NEO media startup"
);
assert.ok(
  bundle.includes(";!__neoMusicMode&&!c.videoUrl"),
  "video artwork lookup must not compete with NEO audio startup"
);
assert.ok(
  bundle.includes('window.__NEO_RUNNER_NETWORK__?["https://proxy.cors.sh/"+d]'),
  "the Google runner must not retry the same search endpoint under three aliases"
);

assert.ok(
  runner.includes('return "https://proxy.cors.sh/" + target.href;'),
  "the browser must receive a progressive range-capable stream URL"
);
assert.ok(
  runner.includes("MUSIC_STARTUP_TIMEOUT_MS = 8000"),
  "a silent media stall must trigger the verified fallback"
);
assert.ok(
  runner.includes("MEDIA_PARALLEL_RANGES = 3"),
  "the rare full-file fallback must fetch its remaining ranges concurrently"
);
assert.ok(
  runner.includes('error.name === "NotAllowedError" || error.name === "AbortError"'),
  "autoplay and cancellation errors must not start a slow fallback download"
);

console.log("NEO Music fast-start safeguards are present.");
