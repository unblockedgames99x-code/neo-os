const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sourcePath = path.resolve(__dirname, "../google-script-Code.gs");
const source = fs.readFileSync(sourcePath, "utf8");
const calls = [];

function response(status, bytes, headers) {
  return {
    getAllHeaders: () => headers,
    getBlob: () => ({ getBytes: () => [...bytes] }),
    getResponseCode: () => status
  };
}

const context = vm.createContext({
  HtmlService: {},
  Utilities: {
    base64Decode: value => [...Buffer.from(value, "base64")],
    base64Encode: value => Buffer.from(value).toString("base64")
  },
  UrlFetchApp: {
    fetch(url, options) {
      calls.push({ url, options });
      return response(206, Buffer.from("full-data"), {
        "Content-Type": "video/mp4",
        "Content-Range": "bytes 0-8/4883714"
      });
    }
  }
});

vm.runInContext(source, context, { filename: sourcePath });

const music = context.neoNetworkFetch({
  url: "https://vcsa.huangqirui.xyz/api/yt/astream/ae7AACP1-R0",
  method: "GET",
  headers: { Range: "bytes=0-4194303", Cookie: "blocked" }
});
assert.equal(music.status, 206);
assert.equal(Buffer.from(music.bodyBase64, "base64").toString(), "full-data");
assert.equal(calls[0].options.headers.range, "bytes=0-4194303");
assert.equal("cookie" in calls[0].options.headers, false);

context.neoNetworkFetch({
  url: "https://gd-proxy.gmdc.workers.dev/getGJLevels21.php",
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  bodyBase64: Buffer.from("str=featured&page=0").toString("base64")
});
assert.equal(calls[1].options.method, "post");
assert.equal(Buffer.from(calls[1].options.payload).toString(), "str=featured&page=0");

context.neoNetworkFetch({
  url: "https://api.stratus.lol/cloud/v1/startGame",
  method: "POST",
  headers: { "Content-Type": "application/json", "X-API-Key": "test-key", Cookie: "blocked" },
  bodyBase64: Buffer.from('{"uuid":"00000000-0000-4000-8000-000000000000"}').toString("base64")
});
assert.equal(calls[2].options.headers["x-api-key"], "test-key");
assert.equal("cookie" in calls[2].options.headers, false);
assert.equal(Buffer.from(calls[2].options.payload).toString(), '{"uuid":"00000000-0000-4000-8000-000000000000"}');

assert.throws(
  () => context.neoNetworkFetch({ url: "https://example.com/private", method: "GET" }),
  /not approved/
);
assert.throws(
  () => context.neoNetworkFetch({ url: "http://vcsa.huangqirui.xyz/api/music/search", method: "GET" }),
  /approved HTTPS/
);

console.log("Apps Script relay enforces its Music, Geometry Dash, and NEO Cloud allowlist.");
