const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const clientSource = fs.readFileSync(path.join(root, 'neo-os', 'neo-proxy-client.js'), 'utf8');
const shellSource = fs.readFileSync(path.join(root, 'neo-os', 'neo-os.js'), 'utf8');

assert.match(shellSource, /data\.type\s*!==\s*['"]neo-shell:proxy-resource['"]/);
assert.match(shellSource, /['"]neo-shell:proxy-resource-result['"]/);
assert.match(shellSource, /loadBrowseRuntime\(\)[\s\S]*?engine\.proxyUrl\(target\)/);
assert.match(shellSource, /hostname\s*===\s*['"]localhost['"]/);
assert.match(shellSource, /\/\^127\\\.\//);
assert.match(shellSource, /\/\^10\\\.\//);
assert.match(shellSource, /\/\^192\\\.168\\\.\//);
assert.match(shellSource, /private172/);
assert.match(clientSource, /},\s*45000\);/, 'Resource routing must outlast the 40-second cold proxy startup window');

(async () => {
  const listeners = new Map();
  const posted = [];
  const parent = { postMessage(message) { posted.push(message); } };
  const window = {
    parent,
    addEventListener(type, handler) { listeners.set(type, handler); },
    fetch() { throw new Error('fetch should not run during route resolution'); },
  };
  const context = {
    window,
    document: { baseURI: 'https://neo.example/neo-os/music-v2/' },
    URL,
    Map,
    setTimeout,
    clearTimeout,
    Promise,
    Error,
    TypeError,
    Object,
    String,
    Date,
  };
  vm.runInNewContext(clientSource, context, { filename: 'neo-proxy-client.js' });
  assert.ok(window.NEO_PROXY_CLIENT);
  const promise = window.NEO_PROXY_CLIENT.image('https://images.example/cover.jpg');
  assert.equal(posted.length, 1);
  assert.equal(posted[0].type, 'neo-shell:proxy-resource');
  assert.equal(posted[0].kind, 'image');
  assert.equal(posted[0].href, 'https://images.example/cover.jpg');
  listeners.get('message')({
    source: parent,
    data: {
      type: 'neo-shell:proxy-resource-result',
      id: posted[0].id,
      ok: true,
      route: 'https://proxy.example/encoded-cover',
    },
  });
  assert.equal(await promise, 'https://proxy.example/encoded-cover');
  const blobPromise = window.NEO_PROXY_CLIENT.fetch('https://data.example/catalog.json');
  listeners.get('message')({
    source: parent,
    data: {
      type: 'neo-shell:proxy-resource-result',
      id: posted[1].id,
      ok: true,
      route: 'blob:https://neo.example/27ec01d0-40aa-4abe-b09e-04fda9ad690f',
    },
  });
  await assert.rejects(blobPromise, /fetch should not run during route resolution/);
  assert.throws(() => window.NEO_PROXY_CLIENT.resolve('file:///secret', 'fetch'), /Only web URLs/);
  console.log('Shared resource proxy request/response routing checks passed.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
