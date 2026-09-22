'use strict';
// Default: fast VM regression checks against the actual product function.
// --browser adds an isolated Chrome/loopback streaming-body comparison.
// --compare permits auditing the candidate before it has been applied to product.
// No external endpoints, user profiles, response bodies, or headers are recorded.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');

const args = {};
for (let index = 2; index < process.argv.length; index++) {
  const key = process.argv[index].replace(/^--/, '');
  if (['browser', 'compare', 'help'].includes(key)) args[key] = true;
  else args[key] = process.argv[++index];
}
if (args.help) {
  console.log('node health-probe-cleanup.cjs [--source FILE] [--browser] [--compare] [--timeout-ms 300] [--out NEW_JSON_FILE]');
  process.exit(0);
}
const sourcePath = path.resolve(args.source || path.join(__dirname, '..', 'neo-os', 'neo-connection-monitor.js'));
const source = fs.readFileSync(sourcePath, 'utf8');
const start = source.indexOf('  function checkServer(');
const end = source.indexOf('  function checkRelayUrl(', start);
assert(start >= 0 && end > start, 'expected checkServer followed by checkRelayUrl');
const current = source.slice(start, end).trim();
const cleanupPattern = /window\.clearTimeout\(timeout\);(?:\s|\/\/[^\r\n]*)*(?:controller\.abort\(\);(?:\s|\/\/[^\r\n]*)*)?return result;/;
assert(cleanupPattern.test(current), 'expected final cleanup returning the completed health result');
const original = current.replace(cleanupPattern, 'window.clearTimeout(timeout);\n      return result;');
// Exercise the exact current function when cleanup is already present.
const candidate = cleanupPattern.exec(current)[0].includes('controller.abort();') ? current :
  current.replace(cleanupPattern, 'window.clearTimeout(timeout);\n      controller.abort();\n      return result;');
const browserTimeout = Number(args['timeout-ms'] || 300);
assert(Number.isInteger(browserTimeout) && browserTimeout >= 100 && browserTimeout <= 3000,
  '--timeout-ms must be an integer from 100 to 3000');
const report = { suite: 'health-probe-cleanup', startedAt: new Date().toISOString(),
  sourcePath, comparisonOnly: Boolean(args.compare), browserRequested: Boolean(args.browser),
  checks: [], vmCases: [], browserCases: [], failures: 0,
  notes: [
    'Function source is extracted read-only; original/candidate variants exist only in memory.',
    'Readiness remains status < 500 (including 401), opaque response, or false on fetch failure/timeout.',
    'The function-local performance clock is deterministic (100 to 125), proving unchanged latency arithmetic. CDP timing remains real.',
    'Loopback responses deliberately never end their body; only their status, close event, and CDP completion metadata are saved.',
    'Original streaming requests are explicitly aborted by the test after observation, so no connections are leaked.',
    'This controlled test does not establish the remote service’s reason for missing completion or guarantee a Lighthouse warning disappears.',
  ],
};
function check(name, fn) {
  return Promise.resolve().then(fn).then(() => report.checks.push({ name, passed: true }), error => {
    report.failures++;
    report.checks.push({ name, passed: false, error: String(error.message).slice(0, 1500) });
  });
}

async function runVmVariant(text, variant, kind) {
  let abortCalls = 0, clockCalls = 0;
  const timers = new Set();
  class Controller extends AbortController {
    abort(...values) { abortCalls++; return super.abort(...values); }
  }
  const sandbox = {
    CHECK_TIMEOUT: 15, AbortController: Controller,
    performance: { now: () => ++clockCalls === 1 ? 100 : 125 },
    window: {
      setTimeout(callback, delay) {
        const timer = setTimeout(() => { timers.delete(timer); callback(); }, delay);
        timers.add(timer); return timer;
      },
      clearTimeout(timer) { timers.delete(timer); clearTimeout(timer); },
    },
    fetch(_url, options) {
      if (kind === 'error') return Promise.reject(new Error('Controlled fetch failure'));
      if (kind === 'timeout') return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('Controlled timeout')), { once: true });
      });
      return Promise.resolve({ type: kind === 'opaque' ? 'opaque' : 'basic', status: kind === 'opaque' ? 0 : Number(kind) });
    },
  };
  vm.runInNewContext(text + '\nthis.probe = checkServer;', sandbox);
  const result = await sandbox.probe('Controlled health probe', 'http://fixture.invalid/');
  const observation = { variant, kind, ready: result.ready, latency: result.latency,
    abortCalls, remainingTimers: timers.size };
  for (const timer of timers) clearTimeout(timer);
  report.vmCases.push(observation);
  return observation;
}

async function runBrowser() {
  const { chromium } = require(process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE || 'C:/Users/jon', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
  const serverCases = new Map(), sockets = new Set(), network = new Map();
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    if (!pathname.startsWith('/probe/')) {
      response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
      response.end('<!doctype html><title>Local health-probe fixture</title><p>Controlled local test</p>');
      return;
    }
    const kind = pathname.split('/').at(-1);
    const record = { received: true, closed: false, writableEnded: false, response };
    serverCases.set(pathname, record);
    response.on('close', () => { record.closed = true; record.writableEnded = response.writableEnded; });
    if (kind === 'timeout') return; // Deliberately do not send headers.
    response.writeHead(Number(kind), { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.flushHeaders();
    response.write('{"fixture":true}\n'); // Deliberately never call end().
  });
  server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const deadline = setTimeout(() => browser?.close().catch(() => {}), 45000);
  try {
    browser = await chromium.launch({
      executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      headless: true, timeout: 20000,
      args: ['--no-first-run', '--no-default-browser-check', '--disable-extensions'],
    });
    const context = await browser.newContext({ acceptDownloads: false });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    cdp.on('Network.requestWillBeSent', event => {
      const pathname = new URL(event.request.url).pathname;
      if (!pathname.startsWith('/probe/')) return;
      network.set(event.requestId, { pathname, resourceType: event.type, startedAt: event.timestamp,
        status: null, responseAt: null, terminal: null });
    });
    cdp.on('Network.responseReceived', event => {
      const record = network.get(event.requestId); if (!record) return;
      record.status = event.response.status; record.responseAt = event.timestamp;
    });
    cdp.on('Network.loadingFinished', event => {
      const record = network.get(event.requestId); if (!record) return;
      record.terminal = { type: 'loadingFinished', canceled: false, at: event.timestamp };
    });
    cdp.on('Network.loadingFailed', event => {
      const record = network.get(event.requestId); if (!record) return;
      record.terminal = { type: 'loadingFailed', canceled: Boolean(event.canceled),
        errorText: event.errorText, at: event.timestamp };
    });
    await page.goto(origin, { waitUntil: 'load', timeout: 10000 });
    for (const kind of ['200', '401', '503', 'timeout']) {
      for (const [variant, text] of [['original', original], ['candidate', candidate]]) {
        await check(`Chrome ${variant} streaming ${kind}: result and completion contract`, async () => {
          const pathname = `/probe/${variant}/${kind}`, caseId = `${variant}-${kind}`;
          try {
            const observed = await page.evaluate(async ({ text, url, timeout, caseId }) => {
              const controllers = [], timers = new Set();
              let abortCalls = 0, clockCalls = 0;
              class Controller extends AbortController {
                constructor() { super(); controllers.push(this); }
                abort(...values) { abortCalls++; return super.abort(...values); }
              }
              const scopedWindow = {
                setTimeout(callback, delay) {
                  const timer = window.setTimeout(() => { timers.delete(timer); callback(); }, delay);
                  timers.add(timer); return timer;
                },
                clearTimeout(timer) { timers.delete(timer); window.clearTimeout(timer); },
              };
              const factory = new Function('CHECK_TIMEOUT', 'AbortController', 'window', 'performance',
                text + '\nreturn checkServer;');
              const probe = factory(timeout, Controller, scopedWindow,
                { now: () => ++clockCalls === 1 ? 100 : 125 });
              window.__healthFixtureCleanup ||= {};
              window.__healthFixtureCleanup[caseId] = () => {
                controllers.forEach(controller => controller.abort());
                timers.forEach(timer => window.clearTimeout(timer));
              };
              const result = await probe('Controlled health probe', url);
              return { ready: result.ready, latency: result.latency, abortCalls, remainingTimers: timers.size };
            }, { text, url: origin + pathname, timeout: browserTimeout, caseId });
            const shouldClose = variant === 'candidate' || kind === 'timeout';
            if (shouldClose) {
              await waitUntil(() => serverCases.get(pathname)?.closed &&
                [...network.values()].find(record => record.pathname === pathname)?.terminal, 2500,
              'server close and CDP completion');
            } else {
              await new Promise(resolve => setTimeout(resolve, browserTimeout * 2));
            }
            const serverRecord = serverCases.get(pathname);
            const net = [...network.values()].find(record => record.pathname === pathname);
            const snapshot = { variant, kind, ...observed,
              server: { received: Boolean(serverRecord?.received), closed: Boolean(serverRecord?.closed),
                writableEnded: Boolean(serverRecord?.writableEnded) },
              cdp: net ? { resourceType: net.resourceType, status: net.status,
                responseAfterMs: net.responseAt === null ? null : +(1000 * (net.responseAt - net.startedAt)).toFixed(3),
                terminal: net.terminal ? { type: net.terminal.type, canceled: net.terminal.canceled,
                  errorText: net.terminal.errorText || null,
                  afterMs: +(1000 * (net.terminal.at - net.startedAt)).toFixed(3) } : null } : null };
            report.browserCases.push(snapshot);
            assert.equal(observed.ready, kind === '200' || kind === '401');
            assert.equal(observed.latency, kind === 'timeout' ? 0 : 25);
            assert.equal(observed.remainingTimers, 0);
            assert.equal(observed.abortCalls, (variant === 'candidate' ? 1 : 0) + (kind === 'timeout' ? 1 : 0));
            assert(serverRecord?.received, 'fixture must receive the request');
            assert.equal(Boolean(serverRecord.closed), shouldClose);
            assert.equal(Boolean(net?.terminal), shouldClose);
            if (kind !== 'timeout') assert.equal(net.status, Number(kind));
            if (shouldClose) {
              assert.equal(serverRecord.writableEnded, false, 'test server never completed the body itself');
              assert.equal(net.terminal.type, 'loadingFailed');
              assert.equal(net.terminal.canceled, true, 'own-controller cancellation must be visible to CDP');
            }
          } finally {
            await page.evaluate(caseId => {
              window.__healthFixtureCleanup?.[caseId]?.();
              delete window.__healthFixtureCleanup?.[caseId];
            }, caseId).catch(() => {});
            serverCases.get(pathname)?.response.destroy();
          }
        });
      }
    }
  } finally {
    clearTimeout(deadline);
    await browser?.close().catch(() => {});
    for (const socket of sockets) socket.destroy();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
async function waitUntil(predicate, timeout, label) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('Timed out waiting for ' + label);
}

(async () => {
  for (const kind of ['200', '401', '503', 'opaque', 'error', 'timeout']) {
    await check(`VM ${kind}: candidate preserves result and retires its controller`, async () => {
      const before = await runVmVariant(original, 'original', kind);
      const after = await runVmVariant(candidate, 'candidate', kind);
      assert.deepEqual({ ready: after.ready, latency: after.latency }, { ready: before.ready, latency: before.latency });
      assert.equal(after.ready, ['200', '401', 'opaque'].includes(kind));
      assert.equal(after.latency, ['error', 'timeout'].includes(kind) ? 0 : 25);
      assert.equal(before.abortCalls, kind === 'timeout' ? 1 : 0);
      assert.equal(after.abortCalls, kind === 'timeout' ? 2 : 1);
      assert.equal(before.remainingTimers, 0); assert.equal(after.remainingTimers, 0);
    });
    if (!args.compare) await check(`Product ${kind}: actual checkServer includes cleanup`, async () => {
      const observed = await runVmVariant(current, 'product', kind);
      assert.equal(observed.ready, ['200', '401', 'opaque'].includes(kind));
      assert.equal(observed.latency, ['error', 'timeout'].includes(kind) ? 0 : 25);
      assert.equal(observed.abortCalls, kind === 'timeout' ? 2 : 1);
      assert.equal(observed.remainingTimers, 0);
    });
  }
  if (args.browser) await check('Controlled Chrome loopback fixture completes', runBrowser);
})().catch(error => {
  report.failures++;
  report.fatalError = String(error.message).slice(0, 1500);
}).finally(() => {
  report.finishedAt = new Date().toISOString();
  if (args.out) fs.writeFileSync(path.resolve(args.out), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.failures ? 1 : 0;
});
