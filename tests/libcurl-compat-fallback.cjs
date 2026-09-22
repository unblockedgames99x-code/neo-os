const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sourcePath = path.resolve(__dirname, "../neo-os/NEO-BROWSER/assets/libcurl-compat.js");
const source = fs.readFileSync(sourcePath, "utf8");

const calls = {
  appendedScripts: 0,
  closed: 0,
  connections: [],
  fetches: [],
  loadWasm: 0,
  websocket: "",
};

class RealSession {
  set_connections(...limits) {
    calls.connections.push(limits);
  }

  fetch(...args) {
    calls.fetches.push(args);
    return Promise.resolve({ ok: true, status: 200 });
  }

  close() {
    calls.closed += 1;
  }
}

const realRuntime = {
  HTTPSession: RealSession,
  async load_wasm() {
    calls.loadWasm += 1;
  },
  set_websocket(url) {
    calls.websocket = url;
  },
};

let context;
let fallbackScript;
const document = {
  baseURI: "https://cdn.example/neo-os/NEO-BROWSER/",
  currentScript: {
    src: "https://cdn.example/neo-os/NEO-BROWSER/assets/libcurl-compat.js",
  },
  createElement(tagName) {
    assert.equal(tagName, "script");
    const listeners = new Map();
    fallbackScript = {
      async: false,
      dataset: {},
      removed: false,
      src: "",
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      dispatch(type) {
        listeners.get(type)?.();
      },
      remove() {
        this.removed = true;
      },
    };
    return fallbackScript;
  },
  dispatchEvent() {},
  head: {
    appendChild(script) {
      calls.appendedScripts += 1;
      assert.match(script.src, /libcurl-0\.7\.4\.js\?v=20260831-chromebook-fallback-v1$/);
      // The real vendored script declares a top-level lexical const. Simulate
      // that exact browser behavior instead of replacing window.libcurl.
      vm.runInContext("const libcurl = __realRuntime;", context);
      script.dispatch("load");
    },
  },
  querySelector() {
    return fallbackScript;
  },
};

context = vm.createContext({
  __realRuntime: realRuntime,
  document,
  Event: class Event {
    constructor(type) {
      this.type = type;
    }
  },
  queueMicrotask,
  URL,
});

vm.runInContext(source, context, { filename: sourcePath });

(async () => {
  const shim = context.libcurl;
  assert.equal(typeof shim.HTTPSession, "function");
  shim.set_websocket("wss://relay.example/wisp/");

  const session = new shim.HTTPSession();
  session.set_connections(6, 7, 8);
  const response = await session.fetch("https://example.com/", { method: "GET" });

  assert.equal(response.status, 200);
  assert.equal(calls.appendedScripts, 1);
  assert.equal(calls.loadWasm, 1);
  assert.equal(calls.websocket, "wss://relay.example/wisp/");
  assert.deepEqual(calls.connections, [[6, 7, 8]]);
  assert.equal(calls.fetches[0][0], "https://example.com/");

  session.close();
  assert.equal(calls.closed, 1);
  console.log("Chromebook compatibility transport delegates successfully.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
