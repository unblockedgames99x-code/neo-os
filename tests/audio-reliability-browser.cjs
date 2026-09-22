const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const target = process.env.NEO_CDN_LIVE_URL || 'http://127.0.0.1:3092/neo-os/';

function silentWavDataUrl(seconds = 2) {
  const sampleRate = 8000;
  const dataLength = sampleRate * seconds;
  const buffer = Buffer.alloc(44 + dataLength, 128);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate, 28);
  buffer.writeUInt16LE(1, 32);
  buffer.writeUInt16LE(8, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);
  return `data:audio/wav;base64,${buffer.toString('base64')}`;
}

async function desktopDocument(page) {
  if (target.endsWith('.svg')) {
    await page.waitForSelector('#neo-os', { timeout: 120000 });
  }
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const outer = await page.$('#neo-os');
    if (!outer) return page.mainFrame();
    const frame = await outer.contentFrame() ||
      page.frames().find((candidate) => candidate.parentFrame() === page.mainFrame());
    if (frame) return frame;
    await page.waitForTimeout(100);
  }
  throw new Error('CDN launcher iframe did not become ready');
}

async function launchedAppDocument(frame) {
  if (!frame.url() || /^about:(?:blank|srcdoc)$/i.test(frame.url())) {
    await frame.waitForURL((url) => Boolean(url.href) && !/^about:(?:blank|srcdoc)$/i.test(url.href), { timeout: 120000 });
  }
  if (!/\.svg(?:[?#]|$)/i.test(frame.url())) return frame;
  const handle = await frame.waitForSelector('#neo-app', { timeout: 120000 });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidates = frame.page().frames();
    const routed = candidates.find((candidate) => candidate.url().includes('/music-v2/__neo_app__/'));
    if (routed) {
      return routed;
    }
    const inner = await handle.contentFrame();
    if (inner && inner !== frame && !/\.svg(?:[?#]|$)/i.test(inner.url())) return inner;
    await frame.waitForTimeout(100);
  }
  throw new Error('The launched app iframe did not become ready');
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--autoplay-policy=user-gesture-required'],
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const diagnostics = [];
  page.on('console', (message) => {
    const text = message.text();
    if (/music|meting|ReferenceError|TypeError|failed/i.test(text)) diagnostics.push(`${message.type()}: ${text}`);
  });
  page.on('pageerror', (error) => diagnostics.push(`pageerror: ${error.message}`));
  try {
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const desktop = await desktopDocument(page);
    await desktop.locator('[data-start-mode="laptop"]').click();
    await desktop.locator('[data-neo-login-guest]').click();
    await desktop.waitForFunction(() => {
      const gate = document.getElementById('neo-login-gate');
      return Boolean(gate && gate.hidden && window.NEO_SHELL);
    });
    await desktop.evaluate(() => {
      if (!window.NEO_SHELL.isInstalled('stream')) window.NEO_SHELL.setInstalled('stream', true);
      window.NEO_SHELL.openApp('stream');
    });
    const frameHandle = await desktop.waitForSelector('.neo-window[data-app-id="stream"] iframe');
    let music = await frameHandle.contentFrame();
    assert.ok(music, 'Music iframe was not available');
    music = await launchedAppDocument(music);
    try {
      await music.waitForFunction(() => document.documentElement.dataset.neoMusicReady === 'true' && window.__NEO_METING_PLAYER__, null, { timeout: 30000 });
    } catch (error) {
      diagnostics.push(`music-url: ${music.url()}`);
      diagnostics.push(`frames: ${JSON.stringify(page.frames().map((frame) => frame.url()))}`);
      diagnostics.push(`music-state: ${JSON.stringify(await music.evaluate(() => ({
        ready: document.documentElement.dataset.neoMusicReady,
        player: Boolean(window.__NEO_METING_PLAYER__),
        api: Boolean(window.__NEO_MUSIC_API__),
        scripts: [...document.scripts].map((script) => script.src),
      })))}`);
      throw new Error(`${error.message}\n${diagnostics.join('\n')}`);
    }

    const initial = await music.evaluate(() => ({
      audioCount: document.querySelectorAll('audio').length,
      api: window.__NEO_MUSIC_API__?.base,
      preloads: [...document.querySelectorAll('audio')].map((audio) => audio.preload),
      bridge: Boolean(window.__NEO_METING_PLAYER__),
    }));
    assert.ok(initial.audioCount <= 1, 'Music created duplicate audio elements before playback');
    assert.ok(initial.preloads.every((value) => value === 'metadata'), 'Audio should not preload full tracks');
    assert.equal(initial.bridge, true);
    assert.equal(initial.api, 'https://neo-stratus-api-w6nw.onrender.com');

    const relayStarted = Date.now();
    await music.locator('.music-card').first().click();
    await music.waitForFunction(() => {
      const audio = document.querySelector('audio');
      return audio && /neo-stratus-api-w6nw\.onrender\.com\/music\/v1\/audio\//.test(audio.currentSrc || audio.src);
    }, null, { timeout: 5000 });
    const relayMs = Date.now() - relayStarted;
    assert.ok(relayMs < 2500, `embedded Music relay routing took ${relayMs}ms`);

    await desktop.evaluate(() => {
      const frame = document.querySelector('.neo-window[data-app-id="stream"] iframe');
      frame.contentWindow.postMessage({ neoMusicControl: { action: 'volume', value: 0.37 } }, '*');
      frame.contentWindow.postMessage({ neoMusicControl: { action: 'mute', value: true } }, '*');
    });
    await music.waitForFunction(() => {
      return localStorage.getItem('music-volume') === '0.37' && localStorage.getItem('music-muted') === 'true';
    });
    assert.deepEqual(await music.evaluate(() => ({
      volume: Number(localStorage.getItem('music-volume')),
      muted: localStorage.getItem('music-muted'),
    })), { volume: 0.37, muted: 'true' });

    await music.evaluate((src) => {
      const audio = new Audio();
      audio.id = 'neo-audio-test';
      audio.preload = 'metadata';
      audio.src = src;
      audio.loop = true;
      audio.muted = false;
      document.body.appendChild(audio);
      let button = document.getElementById('neo-audio-test-unlock');
      if (!button) {
        button = document.createElement('button');
        button.id = 'neo-audio-test-unlock';
        button.textContent = 'Start audio';
        button.style.position = 'fixed';
        button.style.inset = '8px auto auto 8px';
        button.style.zIndex = '999999';
        document.body.appendChild(button);
      }
      button.onclick = () => audio.play();
    }, silentWavDataUrl());
    await music.locator('#neo-audio-test-unlock').click();
    await music.waitForFunction(() => {
      const audio = document.getElementById('neo-audio-test');
      return audio && !audio.paused && audio.currentTime > 0;
    }, null, { timeout: 5000 });
    assert.equal(await music.evaluate(() => document.getElementById('neo-audio-test').loop), true);

    await music.evaluate(() => {
      const audio = document.getElementById('neo-audio-test');
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      document.getElementById('neo-audio-test-unlock')?.remove();
    });
    console.log('Audio reliability browser checks passed.');
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
