const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const browserRoot = path.join(projectRoot, "neo-os", "NEO-BROWSER");
const sourceHtml = path.join(browserRoot, "index.html");
const outputDir = path.join(projectRoot, "exports");
const outputFile = path.join(outputDir, "NEO-Browser-Single.html");

const mimeTypes = {
  ".avif": "image/avif",
  ".css": "text/css;charset=utf-8",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript;charset=utf-8",
  ".json": "application/json",
  ".mjs": "text/javascript;charset=utf-8",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".otf": "font/otf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".webm": "video/webm",
  ".webmanifest": "application/manifest+json",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function stripQuery(value) {
  return String(value || "").split(/[?#]/, 1)[0];
}

function resolveLocal(fromFile, reference) {
  const clean = stripQuery(reference);
  if (!clean || /^(?:[a-z]+:|\/\/|#)/i.test(clean)) return null;
  const resolved = path.resolve(path.dirname(fromFile), clean.replaceAll("/", path.sep));
  const relative = path.relative(projectRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Asset escapes the project: ${reference}`);
  }
  return resolved;
}

function dataUri(file) {
  const mime = mimeTypes[path.extname(file).toLowerCase()] || "application/octet-stream";
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}

function inlineCssUrls(css, cssFile) {
  return css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (full, _quote, value) => {
    if (/^(?:data:|blob:|https?:|\/\/|#)/i.test(value)) return full;
    const asset = resolveLocal(cssFile, value);
    if (!asset || !fs.existsSync(asset) || !fs.statSync(asset).isFile()) return full;
    return `url("${dataUri(asset)}")`;
  });
}

function scriptDataUri(source) {
  return `data:text/javascript;base64,${Buffer.from(source, "utf8").toString("base64")}`;
}

function readScript(file) {
  let source = fs.readFileSync(file, "utf8");
  const relative = path.relative(browserRoot, file).replaceAll(path.sep, "/");

  if (relative === "assets/scramjet-runtime.js") {
    // A file:// document cannot register the service worker required by the
    // multi-file Jet transport. Keep the relay contract that app.js consumes,
    // but deliberately report Jet as unsupported so navigation uses the full
    // Libcurl/WASM compatibility engine embedded below.
    source = `(() => {
      "use strict";
      const fallbackRelay = "wss://wisp.mercurywork.shop/";
      const normalize = (value) => {
        try {
          const url = new URL(String(value || ""));
          if (url.protocol !== "ws:" && url.protocol !== "wss:") return "";
          return url.href.endsWith("/") ? url.href : url.href + "/";
        } catch (_error) { return ""; }
      };
      const activeRelay = () => normalize(globalThis.__neoStandaloneRelay) || fallbackRelay;
      globalThis.NeoScramjet = Object.freeze({
        supports: () => false,
        isProxyUrl: () => false,
        go: null,
        deactivate() {},
        configuredRelay: activeRelay,
        allowRelay: (value) => Boolean(normalize(value)),
        setRelay: (value) => { const next = normalize(value); if (next) globalThis.__neoStandaloneRelay = next; return activeRelay(); },
        relayCandidates: () => [activeRelay()],
        relayOptions: () => [{ name: "Standalone Wisp", url: activeRelay() }],
        get active() { return false; },
      });
    })();`;
  }

  if (relative === "../neo-app-theme.js") {
    const interfaceStylesFile = path.join(projectRoot, "neo-os", "neo-interface-styles.css");
    const interfaceStyles = inlineCssUrls(
      fs.readFileSync(interfaceStylesFile, "utf8"),
      interfaceStylesFile,
    );
    const interfaceStylesUri = `data:text/css;base64,${Buffer.from(interfaceStyles, "utf8").toString("base64")}`;
    source = source.replace(
      /const interfaceStyleSheet = document\.currentScript[\s\S]*?document\.baseURI\)\.href;/,
      `const interfaceStyleSheet = ${JSON.stringify(interfaceStylesUri)};`,
    );
  }

  if (relative === "assets/libcurl-compat.js") {
    source = source.replace(
      /const runtimeUrl = new URL\([^;]+;/,
      'const runtimeUrl = "about:blank";',
    );
  }

  if (relative === "assets/libcurl-0.7.4.js") {
    const embeddedWasm = fs.readFileSync(path.join(browserRoot, "assets", "libcurl-0.7.4.wasm")).toString("base64");
    const moduleBootstrap = `var Module={wasmBinary:Uint8Array.from(atob(${JSON.stringify(embeddedWasm)}),function(c){return c.charCodeAt(0);})};`;
    if (!source.includes('var Module=typeof Module!="undefined"?Module:{};')) {
      throw new Error("Expected Libcurl Module bootstrap was not found");
    }
    source = source.replace('var Module=typeof Module!="undefined"?Module:{};', moduleBootstrap);
  }

  if (relative === "assets/app.js") {
    const appLogoFile = path.join(browserRoot, "assets", "neo-logo-64.png");
    source = source.replaceAll("assets/neo-logo-64.png", dataUri(appLogoFile));

    const fontAwesomeFile = path.join(browserRoot, "assets", "vendor", "fontawesome", "css", "all.min.css");
    const fontAwesomeCss = inlineCssUrls(fs.readFileSync(fontAwesomeFile, "utf8"), fontAwesomeFile);
    const fontAwesomeUri = `data:text/css;base64,${Buffer.from(fontAwesomeCss, "utf8").toString("base64")}`;
    source = source.replaceAll("assets/vendor/fontawesome/css/all.min.css", fontAwesomeUri);

    const acornFile = path.join(browserRoot, "assets", "acorn-8.14.0.min.js");
    source = source.replaceAll("assets/acorn-8.14.0.min.js", scriptDataUri(fs.readFileSync(acornFile, "utf8")));
  }

  return source;
}

let html = fs.readFileSync(sourceHtml, "utf8");

html = html.replace(/\s*<link\b[^>]*\brel=["']manifest["'][^>]*>\s*/gi, "\n");
html = html.replace(/\s*<link\b[^>]*\brel=["']preload["'][^>]*>\s*/gi, "\n");

html = html.replace(/<link\b([^>]*?)\brel=["']stylesheet["']([^>]*?)\bhref=["']([^"']+)["']([^>]*)>/gi,
  (full, before, middle, href) => {
    const file = resolveLocal(sourceHtml, href);
    if (!file || !fs.existsSync(file)) return full;
    const css = inlineCssUrls(fs.readFileSync(file, "utf8"), file);
    return `<style data-bundled-from="${path.relative(projectRoot, file).replaceAll(path.sep, "/")}">\n${css}\n</style>`;
  });

html = html.replace(/<link\b([^>]*?)\bhref=["']([^"']+)["']([^>]*)>/gi, (full, before, href, after) => {
  if (!/\brel=["'](?:icon|apple-touch-icon)["']/i.test(full)) return full;
  const file = resolveLocal(sourceHtml, href);
  if (!file || !fs.existsSync(file)) return full;
  return `<link${before}href="${dataUri(file)}"${after}>`;
});

const runtimeFile = path.join(browserRoot, "assets", "libcurl-0.7.4.js");
const runtimeSource = readScript(runtimeFile);
const runtimeBootstrap = [
  `<script src="${scriptDataUri(runtimeSource)}" data-bundled-from="assets/libcurl-0.7.4.js"></script>`,
].join("\n");

html = html.replace(/<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
  (full, before, src, after) => {
    const file = resolveLocal(sourceHtml, src);
    if (!file || !fs.existsSync(file)) return full;
    const relative = path.relative(browserRoot, file).replaceAll(path.sep, "/");
    if (relative === "assets/libcurl-0.7.4.js") return "";
    const bundled = `<script${before}src="${scriptDataUri(readScript(file))}"${after} data-bundled-from="${relative}"></script>`;
    return relative === "assets/libcurl-compat.js" ? `${runtimeBootstrap}\n${bundled}` : bundled;
  });

// A local srcset can override an already embedded src at higher pixel densities.
// The single embedded source is lossless, so it is safe to use it at every density.
html = html.replace(/\s+srcset=["'][^"']+["']/gi, "");

html = html.replace(/\b(src|poster)=["']([^"']+)["']/gi, (full, attribute, value) => {
  const file = resolveLocal(sourceHtml, value);
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) return full;
  return `${attribute}="${dataUri(file)}"`;
});

html = html.replace(
  /<title>NEO BROWSER<\/title>/i,
  '<title>NEO BROWSER — Single File</title>',
);
html = html.replace(
  /<\/head>/i,
  `<style id="neo-single-black-ui">
    :root,
    html[data-neo-theme] {
      --desktop-bg: #000000 !important;
      --desktop-surface: #090909 !important;
      --desktop-surface-2: #111111 !important;
      --desktop-text: #ffffff !important;
      --desktop-muted: #9b9b9b !important;
      --desktop-line: #272727 !important;
      --desktop-accent: #ffffff !important;
      --desktop-accent-text: #050505 !important;
      --neo-theme-bg: #000000 !important;
      --neo-theme-surface: #090909 !important;
      --neo-theme-raised: #121212 !important;
      --neo-theme-soft: #080808 !important;
      --neo-theme-hover: #1a1a1a !important;
      --neo-theme-control: #0d0d0d !important;
      --neo-theme-control-hover: #1b1b1b !important;
      --neo-theme-selected: #202020 !important;
      --neo-theme-glass: rgba(9, 9, 9, 0.96) !important;
      --neo-theme-overlay: rgba(0, 0, 0, 0.82) !important;
      --neo-panel-solid: #000000 !important;
      --neo-panel: #090909 !important;
      --neo-text: #ffffff !important;
      --neo-muted: #9b9b9b !important;
      --neo-border: #272727 !important;
      --neo-accent: #ffffff !important;
      --background: #000000 !important;
      --panel: #090909 !important;
      --panel-soft: #101010 !important;
      --ink: #ffffff !important;
      --text: #ffffff !important;
      --muted: #9b9b9b !important;
      --line: #272727 !important;
      --accent: #ffffff !important;
      --accent-contrast: #050505 !important;
      --browser-accent: #ffffff !important;
      --browser-accent-strong: #ffffff !important;
      --browser-accent-ink: #050505 !important;
      --browser-chrome: #000000 !important;
      --browser-canvas: #000000 !important;
      --browser-field: #0c0c0c !important;
      --browser-line: #2b2b2b !important;
      --bg0: #000000 !important;
      --bg1: #000000 !important;
      --bg2: #030303 !important;
      --bg3: #090909 !important;
      --bg-elevated: #030303 !important;
      --surface: rgba(255, 255, 255, 0.055) !important;
      --surface2: rgba(255, 255, 255, 0.10) !important;
      --bd: #242424 !important;
      --bd2: #383838 !important;
      --tx: #ffffff !important;
      --tx2: #b8b8b8 !important;
      --tx3: #7f7f7f !important;
      --ac: #ffffff !important;
      --ac2: #d8d8d8 !important;
      color-scheme: dark !important;
    }
    html, body, .app, main, .view,
    .browser-chrome-inner, .titlebar, .navbar, .bookmarks-bar,
    .newtab, .neo-browser-minimal .newtab, #frame {
      background: #000000 !important;
      background-color: #000000 !important;
    }
    .nt-bg, .neo-browser-minimal .nt-bg,
    .nt-overlay, .neo-browser-minimal .nt-overlay {
      background: #000000 !important;
      background-image: none !important;
      opacity: 1 !important;
    }
    .tab, .neo-browser-minimal .tab {
      color: #a8a8a8 !important;
      background: #050505 !important;
      border-color: transparent !important;
    }
    .tab.active, .neo-browser-minimal .tab.active {
      color: #ffffff !important;
      background: #0d0d0d !important;
      border-color: #2b2b2b !important;
      box-shadow: inset 0 1px rgba(255, 255, 255, 0.07) !important;
    }
    .omnibox, .nt-search, .find-input-wrap, .settings-input,
    .bookmark-modal-input, .neo-browser-minimal .omnibox,
    .neo-browser-minimal .nt-search {
      color: #ffffff !important;
      background: #0c0c0c !important;
      border-color: #2b2b2b !important;
    }
    .nt-search-engine, .neo-browser-minimal .nt-search-engine {
      color: #b8b8b8 !important;
      background: #171717 !important;
    }
    .nav-pill-btn, .omni-btn.go, .nt-search > button,
    .neo-audio-button, .neo-more-button {
      color: #050505 !important;
      background: #ffffff !important;
      border-color: #ffffff !important;
    }
    .nt-fav-box, .nt-fav-add, .nt-wallpaper-btn,
    .neo-browser-menu, .settings-card, .bookmark-modal-content,
    .adblock-modal-content, .site-info-box {
      color: #ffffff !important;
      background: #090909 !important;
      border-color: #292929 !important;
    }
  </style>
  <script id="neo-single-oled-lock">
    (() => {
      const forceOled = () => {
        const root = document.documentElement;
        root.dataset.neoTheme = 'oled';
        root.style.colorScheme = 'dark';
      };
      forceOled();
      addEventListener('neo-theme-change', forceOled);
      addEventListener('DOMContentLoaded', forceOled, { once: true });
    })();
  </script>
</head>`,
);
html = html.replace(
  /<!doctype html>/i,
  '<!doctype html>\n<!-- Self-contained NEO Browser build. Open this file directly or host it as one HTML file. -->',
);

function buildNewestShell(embeddedBrowserHtml) {
  const newestRoot = path.join(projectRoot, "neo-os", "nextnode-browser");
  const newestHtmlFile = path.join(newestRoot, "index.html");
  const classroomIcon = dataUri(path.join(projectRoot, "neo-os", "assets", "tab-appearance", "classroom.png"));
  let inner = embeddedBrowserHtml.replace(
    /<\/head>/i,
    `<script id="neo-embedded-initial-relay">
      globalThis.__neoStandaloneRelay = atob('__NEO_STANDALONE_RELAY_B64__');
    </script>
    <style id="neo-embedded-renderer-ui">
      html, body, .app, main, .view, #frame {
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
        background: #000 !important;
      }
      html, body { overflow: hidden !important; }
      .app { display: block !important; position: fixed !important; inset: 0 !important; }
      .browser-chrome-inner, .bookmarks-bar-wrap, .newtab, .find-bar,
      .logs, .elements, .ai-sidebar, #newtab, #settingsPage {
        display: none !important;
      }
      main, .view { position: fixed !important; inset: 0 !important; }
      #frame {
        display: block !important;
        position: absolute !important;
        inset: 0 !important;
        border: 0 !important;
        opacity: 1 !important;
      }
    </style>
  </head>`,
  );
  const bridgeMarkup = `<script id="neo-embedded-renderer-bridge">
      (() => {
        const send = (data) => parent.postMessage({ neoStandaloneRenderer: true, ...data }, '*');
        const submit = (url) => {
          const input = document.getElementById('url');
          if (!input) return;
          input.value = String(url || '');
          input.focus();
          ['keydown', 'keypress', 'keyup'].forEach(type => input.dispatchEvent(new KeyboardEvent(type, {
            key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
          })));
        };
        addEventListener('message', event => {
          if (event.data?.type === 'neo-standalone-go') submit(event.data.url);
          if (event.data?.type === 'neo-standalone-relay') {
            try {
              globalThis.__neoStandaloneRelay = event.data.url;
              globalThis.NeoScramjet?.setRelay?.(event.data.url);
              globalThis.libcurl?.set_websocket?.(event.data.url);
            } catch (_error) {}
          }
        });
        addEventListener('DOMContentLoaded', () => {
          send({ type: 'ready' });
          let lastHealth = '';
          setInterval(() => {
            const url = document.getElementById('url')?.value || '';
            let title = '';
            let frameText = '';
            try {
              const frameDocument = document.getElementById('frame')?.contentDocument;
              title = frameDocument?.title || '';
              frameText = frameDocument?.body?.innerText || '';
            } catch (_error) {}
            if (title) document.title = title;
            send({ type: 'state', url, title });
            const status = [
              document.getElementById('statusText')?.textContent || '',
              document.getElementById('overlayText')?.textContent || '',
              frameText.slice(0, 1200)
            ].join(' ');
            const failed = /transport (?:failed|error)|failed to fetch|proxy request failed|could not connect|connection (?:failed|refused)|timed out/i.test(status);
            const health = failed ? 'failed' : (frameText.trim() ? 'ready' : 'loading');
            if (health !== lastHealth) {
              lastHealth = health;
              let signal = document.getElementById('neo-standalone-health-signal');
              if (failed) {
                if (!signal) {
                  signal = document.createElement('span');
                  signal.id = 'neo-standalone-health-signal';
                  signal.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
                  document.body.appendChild(signal);
                }
                signal.textContent = 'transport failed';
              } else signal?.remove();
              send({ type: 'health', health });
            }
          }, 400);
        }, { once: true });
      })();
    </script>
  `;
  const closingBodyIndex = inner.toLowerCase().lastIndexOf("</body>");
  if (closingBodyIndex < 0) throw new Error("Embedded browser closing body was not found");
  inner = inner.slice(0, closingBodyIndex) + bridgeMarkup + inner.slice(closingBodyIndex);

  const embeddedBase64 = Buffer.from(inner, "utf8").toString("base64");
  const rendererShim = `(() => {
    'use strict';
    const embeddedBrowser = ${JSON.stringify(embeddedBase64)};
    const decodeBrowser = () => atob(embeddedBrowser);
    const frames = new Set();

    class StandalonePlugin {
      constructor(callback) { this.callback = typeof callback === 'function' ? callback : null; }
      install() {}
    }

    class StandaloneFrame {
      constructor(element, options, owner) {
        this.element = element;
        this.owner = owner;
        this.pendingUrl = '';
        this.ready = false;
        this.watchers = (options?.plugins || []).map(plugin => plugin?.callback).filter(Boolean);
        this.onMessage = event => {
          if (event.source !== this.element.contentWindow || !event.data?.neoStandaloneRenderer) return;
          if (event.data.type === 'ready') {
            this.ready = true;
            this.postRelay();
            this.flush();
          }
          if (event.data.type === 'state' && /^https?:/i.test(event.data.url || '')) {
            this.watchers.forEach(callback => { try { callback(event.data.url); } catch (_error) {} });
          }
          if (event.data.type === 'health') this.element.dispatchEvent(new Event('load'));
        };
        addEventListener('message', this.onMessage);
        this.element.srcdoc = this.renderSource();
      }
      relay() {
        const value = this.owner.transport?.url;
        return /^wss?:\\/\\//i.test(value || '') ? value : 'wss://cleanhost5896.b-cdn.net/w/';
      }
      renderSource() { return decodeBrowser().replace('__NEO_STANDALONE_RELAY_B64__', btoa(this.relay())); }
      post(message) {
        try { this.element.contentWindow?.postMessage(message, '*'); } catch (_error) {}
      }
      postRelay() {
        if (this.owner.transport?.url) this.post({ type: 'neo-standalone-relay', url: this.owner.transport.url });
      }
      flush() {
        if (this.ready && this.pendingUrl) this.post({ type: 'neo-standalone-go', url: this.pendingUrl });
      }
      go(url) {
        this.pendingUrl = String(url || '');
        this.flush();
        return Promise.resolve();
      }
      back() { try { this.element.contentWindow?.history.back(); } catch (_error) {} }
      forward() { try { this.element.contentWindow?.history.forward(); } catch (_error) {} }
      reload() {
        const url = this.pendingUrl;
        this.ready = false;
        this.element.srcdoc = this.renderSource();
        this.pendingUrl = url;
      }
      switchTransport() { this.reload(); }
      destroy() {
        removeEventListener('message', this.onMessage);
        frames.delete(this);
        this.element.remove();
      }
    }

    class StandaloneController {
      constructor(options = {}) { this.transport = options.transport || null; }
      wait() { return Promise.resolve(); }
      createFrame(element, options = {}) {
        const frame = new StandaloneFrame(element, options, this);
        frames.add(frame);
        return frame;
      }
      setTransport(transport) {
        this.transport = transport || null;
        frames.forEach(frame => frame.switchTransport());
      }
    }

    class StandaloneTransport {
      constructor(options) {
        const value = typeof options === 'string' ? options : options?.wisp;
        this.url = /^wss?:\\/\\//i.test(value || '') ? String(value) : 'wss://cleanhost5896.b-cdn.net/w/';
      }
    }

    const pluginExports = new Proxy({}, { get: () => StandalonePlugin });
    globalThis.$internal = globalThis.$internal || {};
    globalThis.$internalController = { Controller: StandaloneController, config: {} };
    globalThis.$internalUtils = pluginExports;
    globalThis.LibcurlTransport = { LibcurlClient: StandaloneTransport, default: StandaloneTransport };

    const worker = { state: 'activated', scriptURL: 'sf-sw.js', postMessage() {}, addEventListener() {}, removeEventListener() {} };
    const registration = { active: worker, waiting: null, installing: null, update: async () => registration, unregister: async () => true };
    const serviceWorker = {
      controller: worker,
      ready: Promise.resolve(registration),
      getRegistration: async () => registration,
      register: async () => registration,
      addEventListener() {},
      removeEventListener() {},
    };
    try { Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: serviceWorker }); }
    catch (_error) { try { navigator.serviceWorker = serviceWorker; } catch (_ignored) {} }
  })();`;

  let shell = fs.readFileSync(newestHtmlFile, "utf8");
  shell = shell.replace(/\s*<link\b[^>]*\brel=["'](?:preconnect|preload)["'][^>]*>\s*/gi, "\n");
  shell = shell.replace(/<link\b([^>]*?)\brel=["']stylesheet["']([^>]*?)\bhref=["']([^"']+)["']([^>]*)>/gi,
    (full, before, middle, href) => {
      const file = resolveLocal(newestHtmlFile, href);
      if (!file || !fs.existsSync(file)) return full;
      const css = inlineCssUrls(fs.readFileSync(file, "utf8"), file);
      return `<style data-bundled-from="${path.relative(projectRoot, file).replaceAll(path.sep, "/")}">\n${css}\n</style>`;
    });
  shell = shell.replace(/<link\b([^>]*?)\bhref=["']([^"']+)["']([^>]*?)\brel=["']stylesheet["']([^>]*)>/gi,
    (full, before, href) => {
      const file = resolveLocal(newestHtmlFile, href);
      if (!file || !fs.existsSync(file)) return full;
      const css = inlineCssUrls(fs.readFileSync(file, "utf8"), file);
      return `<style data-bundled-from="${path.relative(projectRoot, file).replaceAll(path.sep, "/")}">\n${css}\n</style>`;
    });
  shell = shell.replace(/<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
    (full, before, src, after) => {
      const file = resolveLocal(newestHtmlFile, src);
      if (!file || !fs.existsSync(file)) return full;
      const relative = path.relative(newestRoot, file).replaceAll(path.sep, "/");
      if (/^study\/(?:sf-engine|sf-ctl|sf-utils|libcurl)\.js$/i.test(relative)) return "";
      return `<script${before}src="${scriptDataUri(fs.readFileSync(file, "utf8"))}"${after} data-bundled-from="${relative}"></script>`;
    });
  shell = shell.replace(/\b(src|poster)=["']([^"']+)["']/gi, (full, attribute, value) => {
    const file = resolveLocal(newestHtmlFile, value);
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) return full;
    return `${attribute}="${dataUri(file)}"`;
  });

  const erudaFile = path.join(newestRoot, "browser-vendor", "eruda.min.js");
  shell = shell.replace(
    /new URL\('\.\/browser-vendor\/eruda\.min\.js',document\.baseURI\|\|location\.href\)\.href/g,
    JSON.stringify(scriptDataUri(fs.readFileSync(erudaFile, "utf8"))),
  );
  const mainScriptMarker = "<script>(function(_0x4e21b3";
  if (!shell.includes(mainScriptMarker)) throw new Error("Newest browser main script marker was not found");
  shell = shell.replace(mainScriptMarker, `<script id="neo-single-renderer-shim">${rendererShim}</script>\n${mainScriptMarker}`);
  shell = shell.replace(/<title>Browser<\/title>/i, "<title>Home - Classroom</title>");
  shell = shell.replace(/<\/head>/i, `<style id="neo-single-oled-ui">
    :root, html[data-neo-theme] {
      --theme-bg: #000000 !important;
      --theme-surface: #090909 !important;
      --theme-text: #ffffff !important;
      --theme-muted: #9d9d9d !important;
      --theme-line: #282828 !important;
      --theme-accent: #ffffff !important;
      --theme-accent-text: #050505 !important;
      --bg: #000000 !important;
      --chrome: #050505 !important;
      --surface: #0d0d0d !important;
      --surface-2: #171717 !important;
      --line: #292929 !important;
      --line-strong: #444444 !important;
      --text: #ffffff !important;
      --text-dim: #b1b1b1 !important;
      --text-faint: #777777 !important;
      --accent: #ffffff !important;
      --accent-soft: rgba(255,255,255,.14) !important;
      --accent-faint: rgba(255,255,255,.06) !important;
      color-scheme: dark !important;
    }
    html, body, .app, .chrome, .tabbar, .viewport, .new-tab, .blocked {
      background: #000000 !important;
      background-color: #000000 !important;
    }
    .new-tab { background-image: none !important; }
    .frames iframe.page { background: #000000 !important; }
    .url-wrap, .nt-search, .wisp-panel { background: #0d0d0d !important; }
    .tab.active { background: #171717 !important; }
  </style>
  <script id="neo-single-oled-lock">
    (() => {
      const lock = () => { document.documentElement.dataset.neoTheme = 'oled'; document.documentElement.style.colorScheme = 'dark'; };
      lock(); addEventListener('message', lock); addEventListener('DOMContentLoaded', lock, { once: true });
    })();
  </script>
  <link id="neo-single-classroom-icon" rel="icon" type="image/png" href="${classroomIcon}">
  <script id="neo-single-classroom-startup">
    (() => {
      const startupTitle = 'Home - Classroom';
      const startupIcon = ${JSON.stringify(classroomIcon)};
      const decorateDocument = target => {
        if (!target) return;
        target.title = startupTitle;
        let link = target.querySelector('link[data-neo-tab-icon], link[rel~="icon"]');
        if (!link) {
          link = target.createElement('link');
          link.rel = 'icon';
          (target.head || target.documentElement).appendChild(link);
        }
        link.dataset.neoTabIcon = 'classroom';
        link.type = 'image/png';
        link.href = startupIcon;
      };
      const decorateBrowserTab = () => {
        const address = document.getElementById('url');
        if (address && address.value.trim()) return false;
        const tab = document.querySelector('.tab.active');
        if (!tab) return false;
        const label = tab.querySelector('.ttl');
        if (label && label.textContent !== 'Google Classroom') label.textContent = 'Google Classroom';
        const favicon = tab.querySelector('.tfav');
        if (favicon && favicon.dataset.neoStartupClassroom !== 'true') {
          favicon.dataset.neoStartupClassroom = 'true';
          favicon.classList.remove('letter');
          if (favicon.tagName === 'IMG') favicon.src = startupIcon;
          else {
            favicon.textContent = '';
            favicon.style.backgroundImage = 'url("' + startupIcon + '")';
            favicon.style.backgroundPosition = 'center';
            favicon.style.backgroundRepeat = 'no-repeat';
            favicon.style.backgroundSize = 'contain';
          }
        }
        return Boolean(label && favicon);
      };
      decorateDocument(document);
      try {
        if (window.top !== window && window.top.location.href === 'about:blank') decorateDocument(window.top.document);
      } catch (_error) {}
      let settled = 0;
      const observer = new MutationObserver(() => {
        if (decorateBrowserTab()) settled += 1;
        if (settled >= 3) observer.disconnect();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      addEventListener('DOMContentLoaded', decorateBrowserTab, { once: true });
      setTimeout(() => { decorateBrowserTab(); observer.disconnect(); }, 3000);
    })();
  </script>
  </head>`);
  return shell.replace(
    /<!doctype html>/i,
    '<!doctype html>\n<!-- Newest NEO NextNode browser UI with an embedded single-file proxy renderer. -->',
  );
}

html = buildNewestShell(html);

const unresolved = [];
for (const match of html.matchAll(/(?:src|href)=["'](?!data:|blob:|https?:|wss?:|#|javascript:|about:)([^"']+)["']/gi)) {
  unresolved.push(match[1]);
}
if (unresolved.length) {
  throw new Error(`Unresolved local references:\n${[...new Set(unresolved)].join("\n")}`);
}
if (/jsdelivr/i.test(html)) throw new Error("The single-file build contains a jsDelivr reference");
if (/unblockedgames99x-code/i.test(html)) throw new Error("The single-file build contains the project owner name");

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, html);

console.log(JSON.stringify({
  output: outputFile,
  bytes: Buffer.byteLength(html),
  scripts: (html.match(/data-bundled-from=/g) || []).length,
  selfContained: unresolved.length === 0,
}));
