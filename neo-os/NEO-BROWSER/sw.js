"use strict";

importScripts("./jet/jet.sw.js");
importScripts("./assets/neo-ad-shield.js?v=20260912-sitewide-v2");

const NEO_ASSET_CACHE = "neo-proxy-assets-v9";
const NEO_BROWSER_APP_PATH = new URL("./__neo_app__/", self.location.href).pathname;
const NEO_CINECAT_BRIDGE_URL = new URL("./assets/cinecat-source-bridge.js?v=20260922-source-recovery-v10", self.location.href).href;
const NEO_ASSET_MAX_AGE = 10 * 60 * 1000;
const NEO_ASSET_MAX_BYTES = 5 * 1024 * 1024;
const NEO_CACHEABLE_DESTINATIONS = new Set(["font", "image", "script", "style"]);

function originalRequestUrl(requestUrl) {
  try {
    const parsed = new URL(requestUrl);
    const marker = "/~/";
    const start = parsed.pathname.indexOf(marker);
    if (start === -1) return "";
    const routed = parsed.pathname.slice(start + marker.length).split("/");
    const encoded = routed.length > 2 ? routed.slice(2).join("/") : routed.at(-1);
    return decodeURIComponent(encoded || "");
  } catch (_error) {
    return "";
  }
}

function needsHtmlContentType(request, destination) {
  if (request.mode !== "navigate" && !["document", "iframe"].includes(request.destination)) return false;
  try {
    const url = new URL(destination);
    return url.hostname === "raw.githubusercontent.com" && /\.html?$/i.test(url.pathname);
  } catch (_error) {
    return false;
  }
}

async function routeNavigation(event, destination) {
  const response = await globalThis.$scramjetController.route(event);
  let isCinecatDocument = false;
  try {
    const url = new URL(destination);
    isCinecatDocument = (url.hostname === "cinecat.eu" || url.hostname.endsWith(".cinecat.eu")) &&
      (event.request.mode === "navigate" || ["document", "iframe"].includes(event.request.destination));
  } catch (_error) {}

  if (!needsHtmlContentType(event.request, destination) && !isCinecatDocument) return response;
  const headers = new Headers(response.headers);
  let body = response.body;
  if (isCinecatDocument && /text\/html/i.test(headers.get("content-type") || "")) {
    const html = await response.text();
    const escapedBridgeUrl = NEO_CINECAT_BRIDGE_URL.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    const bridgeTag = `<script src="${escapedBridgeUrl}" data-neo-cinecat-source-bridge="1"></script>`;
    body = /<\/body>/i.test(html)
      ? html.replace(/<\/body>/i, `${bridgeTag}</body>`)
      : `${html}${bridgeTag}`;
    headers.delete("content-length");
    headers.delete("content-encoding");
    headers.delete("content-security-policy");
    headers.delete("content-security-policy-report-only");
    headers.set("x-neo-cinecat-bridge", "1");
  }
  if (needsHtmlContentType(event.request, destination)) {
    headers.set("content-type", "text/html; charset=utf-8");
    headers.delete("content-disposition");
    headers.set("x-neo-game-document", "1");
  }
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then((names) => Promise.all(names
      .filter((name) => name.startsWith("neo-proxy-assets-") && name !== NEO_ASSET_CACHE)
      .map((name) => caches.delete(name)))),
  ]));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "neo:jet:activate") self.skipWaiting();
  if (event.data?.type === "neo:jet:claim") event.waitUntil(self.clients.claim());
});

function shouldCacheAsset(request) {
  return request.method === "GET" &&
    NEO_CACHEABLE_DESTINATIONS.has(request.destination) &&
    !request.headers.has("authorization") &&
    !request.headers.has("range");
}

function cachedAt(response) {
  return Number(response?.headers.get("x-neo-cached-at") || 0);
}

function rememberAsset(cache, request, response, event) {
  if (!response?.ok) return response;
  const cacheControl = response.headers.get("cache-control") || "";
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (/\b(?:no-store|private)\b/i.test(cacheControl) || contentLength > NEO_ASSET_MAX_BYTES) {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.set("x-neo-cached-at", String(Date.now()));
  const cachedResponse = new Response(response.clone().body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  const save = cache.put(request, cachedResponse).catch(() => {});
  try { event.waitUntil(save); } catch (_error) {}
  return response;
}

async function routeStaticAsset(event) {
  const cache = await caches.open(NEO_ASSET_CACHE);
  const cached = await cache.match(event.request);
  if (cached && Date.now() - cachedAt(cached) < NEO_ASSET_MAX_AGE) return cached;
  try {
    const response = await globalThis.$scramjetController.route(event);
    return rememberAsset(cache, event.request, response, event);
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method === "GET" && requestUrl.pathname === NEO_BROWSER_APP_PATH) {
    event.respondWith((async () => {
      const indexUrl = new URL("./index.html", self.location.href);
      const response = await fetch(indexUrl, { cache: "force-cache", credentials: "omit" });
      if (!response.ok) return response;
      const base = new URL("./", self.location.href).href;
      const source = (await response.text()).replace(/<head(?:\s[^>]*)?>/i, (head) => (
        `${head}<base href="${base.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">`
      ));
      const headers = new Headers(response.headers);
      headers.set("content-type", "text/html; charset=utf-8");
      headers.delete("content-disposition");
      return new Response(source, { status: 200, headers });
    })());
    return;
  }
  if (globalThis.$scramjetController.shouldRoute(event)) {
    const destination = originalRequestUrl(event.request.url);
    if (globalThis.NEOAdShield?.shouldBlockUrl(destination)) {
      event.respondWith(new Response(null, {
        status: 204,
        statusText: "No Content",
        headers: { "X-NEO-Ad-Blocked": "1" },
      }));
      return;
    }
    event.respondWith(
      shouldCacheAsset(event.request)
        ? routeStaticAsset(event)
        : routeNavigation(event, destination)
    );
  }
});
