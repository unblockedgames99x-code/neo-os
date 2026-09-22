const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'neo-os', 'nextnode-browser', 'study', 'sf-sw.js'),
  'utf8'
);
let fetchHandler = null;
let routedUrl = '';
let controlledClientUrl = '';
const context = {
  URL,
  Request,
  Response,
  clients: {
    get() { return Promise.resolve(controlledClientUrl ? { url: controlledClientUrl } : null); },
  },
  importScripts() {},
  addEventListener(type, handler) {
    if (type === 'fetch') fetchHandler = handler;
  },
  $internalController: {
    shouldRoute() { return true; },
    route(event) {
      routedUrl = event.request.url;
      return Promise.resolve(new Response('ok'));
    },
  },
};
vm.runInNewContext(source, context, { filename: 'sf-sw.js' });

const prefix = 'https://cdn.example/nextnode-browser/study/uv/f7v34ggd/t1uzvivf/';
const target = 'https://html.duckduckgo.com/html/?q=static%20quasar';
const expected = prefix + encodeURIComponent(target);

assert.equal(context.repairMalformedProxyRequestUrl(prefix + 'https\\:/html.duckduckgo.com/html/?q=static%20quasar'), expected);
assert.equal(context.repairMalformedProxyRequestUrl(prefix + 'https%5C:/html.duckduckgo.com/html/?q=static%20quasar'), expected);
assert.equal(context.repairMalformedProxyRequestUrl(prefix + 'https:/html.duckduckgo.com/html/?q=static%20quasar'), expected);
const escapeRoadTarget = 'https://www.staticquasar931.com/gm3z/escape-road-3';
const malformedNestedTarget = 'https://www.staticquasar931.com/gm3z/https/:/www.staticquasar931.com/gm3z/escape-road-3';
assert.equal(
  context.repairMalformedProxyRequestUrl(prefix + encodeURIComponent(malformedNestedTarget) + '?%24rfp=strict-origin&%24io=https%3A%2F%2Fwww.staticquasar931.com'),
  prefix + encodeURIComponent(escapeRoadTarget) + '?%24rfp=strict-origin&%24io=https%3A%2F%2Fwww.staticquasar931.com'
);
assert.equal(context.repairMalformedProxyRequestUrl(expected), '');
assert.equal(context.repairMalformedProxyRequestUrl('https://cdn.example/nextnode-browser/index.html'), '');
const sameOriginRoute = prefix + encodeURIComponent('https://cdn.example/gm3z/escape-road-3') + '?%24io=https%3A%2F%2Fwww.staticquasar931.com&%24rfp=strict-origin';
assert.equal(
  context.repairSameOriginProxyRequestUrl(sameOriginRoute, ''),
  prefix + encodeURIComponent('https://www.staticquasar931.com/gm3z/escape-road-3') + '?%24io=https%3A%2F%2Fwww.staticquasar931.com&%24rfp=strict-origin'
);
const sameOriginAsset = prefix + encodeURIComponent('https://cdn.example/assets/game.js');
assert.equal(
  context.repairSameOriginProxyRequestUrl(sameOriginAsset, prefix + encodeURIComponent('https://www.staticquasar931.com/gm3z/sl0pe')),
  prefix + encodeURIComponent('https://www.staticquasar931.com/assets/game.js')
);
assert.equal(context.repairSameOriginProxyRequestUrl(expected, ''), '');
assert.equal(typeof fetchHandler, 'function');

let responsePromise = null;
fetchHandler({
  request: new Request(prefix + 'https%5C:/html.duckduckgo.com/html/?q=static%20quasar'),
  clientId: 'client-1',
  resultingClientId: '',
  respondWith(value) { responsePromise = value; },
});
assert.ok(responsePromise);
assert.equal(routedUrl, expected);

responsePromise = null;
fetchHandler({
  request: new Request(sameOriginRoute, { referrer: '' }),
  clientId: 'client-2',
  resultingClientId: '',
  respondWith(value) { responsePromise = value; },
});
assert.ok(responsePromise);
assert.equal(
  routedUrl,
  prefix + encodeURIComponent('https://www.staticquasar931.com/gm3z/escape-road-3') + '?%24io=https%3A%2F%2Fwww.staticquasar931.com&%24rfp=strict-origin'
);

(async () => {
  controlledClientUrl = prefix + encodeURIComponent('https://www.staticquasar931.com/gm3z/sl0pe');
  responsePromise = null;
  fetchHandler({
    request: new Request(prefix + encodeURIComponent('https://cdn.example/gm3z/escape-road-3')),
    clientId: 'client-3',
    resultingClientId: '',
    respondWith(value) { responsePromise = value; },
  });
  assert.ok(responsePromise);
  await responsePromise;
  assert.equal(routedUrl, prefix + encodeURIComponent('https://www.staticquasar931.com/gm3z/escape-road-3'));
  console.log('Malformed and leaked same-origin URLs are repaired and kept inside the proxy route.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
