const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sourcePath = path.resolve(__dirname, "../neo-os/neo-runner-network.js");
const source = fs.readFileSync(sourcePath, "utf8");
const messages = [];
const listeners = new Map();
let nativeFetches = 0;
let createdMediaBlob = null;
const mediaRanges = [];
const fullSongBytes = Buffer.alloc(4 * 1024 * 1024 + 17, 0x4e);
const gdSongBytes = Buffer.from("FULL-GEOMETRY-DASH-SONG");

class MockURL extends URL {}
MockURL.createObjectURL = blob => {
  createdMediaBlob = blob;
  return "blob:neo-full-song";
};
MockURL.revokeObjectURL = () => {};

class MockMediaElement {
  constructor() {
    this._src = "";
    this.loadCalls = 0;
    this.playCalls = 0;
    this.pauseCalls = 0;
    this.playErrors = [];
    this.listeners = new Map();
  }

  load() {
    this.loadCalls += 1;
  }

  play() {
    this.playCalls += 1;
    if (this.playErrors.length) return Promise.reject(this.playErrors.shift());
    return Promise.resolve();
  }

  pause() {
    this.pauseCalls += 1;
  }

  removeAttribute(name) {
    if (String(name).toLowerCase() === "src") this._src = "";
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type) {
    for (const listener of this.listeners.get(type) || []) listener.call(this, { type, target: this });
  }
}

Object.defineProperty(MockMediaElement.prototype, "src", {
  configurable: true,
  enumerable: true,
  get() { return this._src; },
  set(value) { this._src = String(value); }
});

class MockAudioElement extends MockMediaElement {}

function emit(type, event) {
  for (const listener of listeners.get(type) || []) listener(event);
}

const host = {
  postMessage(message) {
    messages.push(message);
    const request = message.request;
    let body = "";
    let status = 200;
    let headers = { "content-type": "application/json" };
    if (request.url.includes("getGJLevels21.php")) {
      body = "1:Example level";
      headers = { "content-type": "text/plain" };
    } else if (request.url.includes("getGJSongInfo.php")) {
      body = "2~|~Full Test Song~|~10~|~http%3A%2F%2Faudio.ngfiles.com%2Fsong.mp3";
      headers = { "content-type": "text/plain" };
    } else if (request.url.includes("/audio-proxy")) {
      const range = String(request.headers.range || "bytes=0-");
      mediaRanges.push(range);
      const start = Number((range.match(/bytes=(\d+)-/) || [])[1] || 0);
      const requestedEnd = Number((range.match(/-(\d+)/) || [])[1] || (gdSongBytes.length - 1));
      const bytes = gdSongBytes.subarray(start, Math.min(requestedEnd + 1, gdSongBytes.length));
      body = bytes;
      status = 206;
      headers = {
        "content-type": "audio/mpeg",
        "content-range": `bytes ${start}-${start + bytes.length - 1}/${gdSongBytes.length}`
      };
    } else if (request.url.includes("/api/yt/astream/")) {
      const range = String(request.headers.range || "bytes=0-");
      mediaRanges.push(range);
      const start = Number((range.match(/bytes=(\d+)-/) || [])[1] || 0);
      const requestedEnd = Number((range.match(/-(\d+)/) || [])[1] || (fullSongBytes.length - 1));
      const bytes = request.url.endsWith("/partial")
        ? Buffer.from("THIRTY-SECOND-PREVIEW")
        : fullSongBytes.subarray(start, Math.min(requestedEnd + 1, fullSongBytes.length));
      body = bytes;
      if (request.url.endsWith("/partial")) {
        status = 200;
        headers = { "content-type": "video/mp4", "content-length": String(bytes.length) };
      } else {
        status = 206;
        const rangeStart = request.url.endsWith("/malformed") ? start + 1 : start;
        const rangeTotal = request.url.endsWith("/oversize") ? 49 * 1024 * 1024 : fullSongBytes.length;
        headers = {
          "content-type": "video/mp4",
          "content-range": `bytes ${rangeStart}-${rangeStart + bytes.length - 1}/${rangeTotal}`
        };
      }
    } else {
      body = JSON.stringify({ tracks: [{ id: "full-track", duration: 263 }] });
    }
    queueMicrotask(() => emit("message", {
      source: host,
      data: {
        type: "neo:network:response",
        id: message.id,
        payload: {
          ok: true,
          result: {
            status,
            headers,
            bodyBase64: Buffer.from(body).toString("base64")
          }
        }
      }
    }));
  }
};
const popup = { opener: host };

const sandbox = {
  AbortController,
  Blob,
  DOMException,
  Headers,
  Map,
  Request,
  Response,
  URL: MockURL,
  Uint8Array,
  atob,
  btoa,
  clearTimeout,
  console,
  document: { baseURI: "https://script.googleusercontent.com/neo/" },
  HTMLAudioElement: MockAudioElement,
  HTMLMediaElement: MockMediaElement,
  fetch: async () => {
    nativeFetches += 1;
    return new Response("native", { status: 200 });
  },
  parent: popup,
  top: popup,
  queueMicrotask,
  setTimeout
};
sandbox.window = sandbox;
sandbox.addEventListener = (type, listener) => {
  if (!listeners.has(type)) listeners.set(type, []);
  listeners.get(type).push(listener);
};

const context = vm.createContext(sandbox);
vm.runInContext(source, context, { filename: sourcePath });

(async () => {
  const music = await context.fetch(
    "https://proxy.cors.sh/https://vcsa.huangqirui.xyz/api/music/search?q=how%20to%20save%20a%20life"
  );
  const musicJson = await music.json();
  assert.equal(musicJson.tracks[0].id, "full-track");
  assert.equal(messages[0].request.url, "https://vcsa.huangqirui.xyz/api/music/search?q=how%20to%20save%20a%20life");
  assert.equal(nativeFetches, 0);

  const gd = await context.fetch("https://gd-proxy.gmdc.workers.dev/getGJLevels21.php", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "str=featured&page=0"
  });
  assert.equal(await gd.text(), "1:Example level");
  assert.equal(Buffer.from(messages[1].request.bodyBase64, "base64").toString(), "str=featured&page=0");

  const shortcutMessageCount = messages.length;
  const shortcut = await context.fetch("https://fetchsongid.lasokar.workers.dev/?id=1372771");
  assert.equal(shortcut.status, 200);
  assert.deepEqual(Buffer.from(await shortcut.arrayBuffer()), gdSongBytes);
  assert.ok(messages.length - shortcutMessageCount >= 2, "the download button must resolve metadata and fetch the complete song");

  const gdAudio = await context.fetch(
    "https://gd-proxy.gmdc.workers.dev/audio-proxy?url=https%3A%2F%2Fexample.com%2Fsong.mp3"
  );
  assert.equal(gdAudio.status, 200);
  assert.deepEqual(Buffer.from(await gdAudio.arrayBuffer()), gdSongBytes);

  const cloudMessageCount = messages.length;
  await context.fetch("https://api.stratus.lol/cloud/v1/startGame", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": "test-key" },
    body: JSON.stringify({ uuid: "00000000-0000-4000-8000-000000000000" })
  });
  assert.equal(messages.length, cloudMessageCount + 1, "NEO Cloud API calls must use the Google runner bridge");
  assert.equal(messages.at(-1).request.headers["x-api-key"], "test-key");
  assert.equal(Buffer.from(messages.at(-1).request.bodyBase64, "base64").toString(), '{"uuid":"00000000-0000-4000-8000-000000000000"}');
  assert.equal(context.__NEO_RUNNER_NETWORK__.supports("https://api.stratus.lol/cloud/v1/startGame"), true);
  assert.equal(context.__NEO_RUNNER_NETWORK__.supports("https://api.stratus.lol/admin"), false);

  const cdn = await context.fetch("https://cdn.jsdelivr.net/npm/example/index.js");
  assert.equal(await cdn.text(), "native");
  assert.equal(nativeFetches, 1);
  assert.equal(context.__NEO_RUNNER_NETWORK__.supports("https://vcsa.huangqirui.xyz/api/yt/astream/ae7AACP1-R0"), true);
  assert.equal(context.__NEO_RUNNER_NETWORK__.supports("https://example.com/"), false);

  const audio = new MockAudioElement();
  const directMessageCount = messages.length;
  const directRangeCount = mediaRanges.length;
  audio.src = "https://vcsa.huangqirui.xyz/api/yt/astream/ae7AACP1-R0";
  assert.equal(
    audio.src,
    "https://proxy.cors.sh/https://vcsa.huangqirui.xyz/api/yt/astream/ae7AACP1-R0",
    "full songs must be assigned to the browser as a progressive range stream"
  );
  audio.load();
  await audio.play();
  assert.equal(audio.loadCalls, 1);
  assert.equal(audio.playCalls, 1);
  assert.equal(messages.length, directMessageCount, "direct playback must not wait on Apps Script RPCs");
  assert.equal(mediaRanges.length, directRangeCount, "direct playback must let the browser request only the ranges it needs");

  createdMediaBlob = null;
  const fallbackAudio = new MockAudioElement();
  fallbackAudio.playErrors.push(new Error("direct stream blocked"));
  fallbackAudio.src = "https://vcsa.huangqirui.xyz/api/yt/astream/fallback";
  await fallbackAudio.play();
  assert.equal(fallbackAudio.src, "blob:neo-full-song");
  assert.ok(mediaRanges.length > directRangeCount + 1, "the verified relay must remain available as a fallback");
  assert.equal(createdMediaBlob.size, fullSongBytes.length);
  assert.deepEqual(Buffer.from(await createdMediaBlob.arrayBuffer()), fullSongBytes);
  assert.equal(fallbackAudio.playCalls, 2, "fallback playback must retry after the complete verified file is ready");

  const blockedAudio = new MockAudioElement();
  const autoplayError = new DOMException("User activation required", "NotAllowedError");
  blockedAudio.playErrors.push(autoplayError);
  blockedAudio.src = "https://vcsa.huangqirui.xyz/api/yt/astream/autoplay";
  const beforeBlockedRequests = messages.length;
  await assert.rejects(blockedAudio.play(), error => error.name === "NotAllowedError");
  assert.equal(messages.length, beforeBlockedRequests, "autoplay policy errors must not download the song through the fallback relay");

  for (const id of ["partial", "malformed", "oversize"]) {
    createdMediaBlob = null;
    const guardedAudio = new MockAudioElement();
    guardedAudio.playErrors.push(new Error("direct stream blocked"));
    const fullUrl = `https://vcsa.huangqirui.xyz/api/yt/astream/${id}`;
    const beforeRequests = messages.length;
    guardedAudio.src = fullUrl;
    await assert.rejects(guardedAudio.play(), /verified byte range|mismatched byte range|too large/);
    assert.equal(guardedAudio.src, "", `${id} relay data must not be assigned to the player`);
    assert.equal(createdMediaBlob, null, `${id} relay data must never become a partial audio blob`);
    assert.equal(guardedAudio.playCalls, 1, `${id} must only attempt the direct stream and never play invalid fallback data`);
    if (id === "oversize") {
      assert.equal(messages.length - beforeRequests, 1, "oversize songs must reject before wasting Chromebook memory");
    }
  }

  createdMediaBlob = null;
  const cancelledAudio = new MockAudioElement();
  cancelledAudio.src = "https://vcsa.huangqirui.xyz/api/yt/astream/cancel";
  cancelledAudio.removeAttribute("src");
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(cancelledAudio.src, "");
  assert.equal(createdMediaBlob, null, "a discarded song must not be restored after its download finishes");

  console.log("Google runner bridge streams full Music tracks immediately and retains its verified fallback.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
