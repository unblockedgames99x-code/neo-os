import "./browser-runtime/uv/uv.bundle.js?engine=neo-browse-v71";
import "./browser-runtime/uv/uv.config.js?engine=neo-browse-v71";
import "./browser-runtime/uv/uv.sw.js";

const ENGINE_VERSION = "neo-browse-v71";
const ROUTE_PREFIX = new URL("./browse-v71/", self.location.href).pathname;
const ultraviolet = new UVServiceWorker();
const MAX_GAME_DOCUMENT_BYTES = 8 * 1024 * 1024;
const MAX_PROXY_RESOURCE_BYTES = 16 * 1024 * 1024;
const RETRYABLE_METHODS = new Set(["GET", "HEAD"]);
const FALLBACK_TIMEOUT_MS = 8000;
let fallbackRequest = null;
const activeMusicStreams = new Map();

function requestFallbackFromClient() {
  if (fallbackRequest) return fallbackRequest;

  fallbackRequest = self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clients) => {
      if (!clients.length) throw new Error("No web client is available.");

      return new Promise((resolve, reject) => {
        let remaining = clients.length;
        let settled = false;
        const timeoutIds = new Set();
        let lastError = new Error("The web fallback was unavailable.");
        const failed = (error) => {
          if (settled) return;
          lastError = error instanceof Error ? error : lastError;
          remaining -= 1;
          if (remaining === 0) {
            settled = true;
            for (const timeoutId of timeoutIds) clearTimeout(timeoutId);
            reject(lastError);
          }
        };
        const succeeded = (transport) => {
          if (settled) return;
          settled = true;
          for (const timeoutId of timeoutIds) clearTimeout(timeoutId);
          resolve(transport);
        };

        for (const client of clients) {
          const channel = new MessageChannel();
          const timeoutId = setTimeout(
            () => failed(new Error("The web fallback response timed out.")),
            FALLBACK_TIMEOUT_MS,
          );
          timeoutIds.add(timeoutId);
          channel.port1.onmessage = (event) => {
            clearTimeout(timeoutId);
            timeoutIds.delete(timeoutId);
            if (event.data?.ok) succeeded(event.data.transport);
            else failed(new Error(event.data?.message || "The web fallback failed."));
          };
          channel.port1.onmessageerror = () => {
            clearTimeout(timeoutId);
            timeoutIds.delete(timeoutId);
            failed(new Error("The web fallback response was invalid."));
          };
          try {
            client.postMessage({ type: "neo-browser:transport-fallback", engine: ENGINE_VERSION }, [
              channel.port2,
            ]);
          } catch (error) {
            clearTimeout(timeoutId);
            timeoutIds.delete(timeoutId);
            failed(error);
          }
        }
      });
    })
    .finally(() => {
      fallbackRequest = null;
    });
  return fallbackRequest;
}

const bareFetch = ultraviolet.bareClient.fetch.bind(ultraviolet.bareClient);
ultraviolet.bareClient.fetch = async (input, options = {}) => {
  try {
    return await bareFetch(input, options);
  } catch (error) {
    if (options.signal?.aborted || error?.name === "AbortError") throw error;
    const method = String(
      options.method || (input instanceof Request ? input.method : "GET"),
    ).toUpperCase();
    if (!RETRYABLE_METHODS.has(method)) throw error;
    await requestFallbackFromClient();
    return bareFetch(input, options);
  }
};

function isNavigationRequest(request) {
  return request.mode === "navigate" || ["document", "iframe"].includes(request.destination);
}

function musicAudioSource(request) {
  try {
    const requestUrl = new URL(request.url);
    if (!requestUrl.pathname.startsWith(ROUTE_PREFIX)) return null;
    const encoded = requestUrl.pathname.slice(ROUTE_PREFIX.length);
    const source = new URL(decodeURIComponent(encoded));
    if (source.hostname !== "vcsa.huangqirui.xyz") return null;
    if (!/^\/api\/(?:music\/xstream|yt\/astream\/)/i.test(source.pathname)) return null;
    return source;
  } catch (error) {
    return null;
  }
}

function openMusicStream(event, source) {
  const key = event.clientId || event.resultingClientId || "shared";
  let stream = activeMusicStreams.get(key);
  if (!stream || stream.source !== source.href) {
    if (stream) {
      for (const controller of stream.controllers) controller.abort();
    }
    stream = { source: source.href, controllers: new Set() };
    activeMusicStreams.set(key, stream);
  }

  const controller = new AbortController();
  stream.controllers.add(controller);
  const abortRequest = () => controller.abort(event.request.signal.reason);
  if (event.request.signal.aborted) abortRequest();
  else event.request.signal.addEventListener("abort", abortRequest, { once: true });

  const release = () => {
    event.request.signal.removeEventListener("abort", abortRequest);
    stream.controllers.delete(controller);
    if (!stream.controllers.size && activeMusicStreams.get(key) === stream) {
      activeMusicStreams.delete(key);
    }
  };
  return { controller, release };
}

function streamMusicBody(body, controller, release) {
  if (!body) {
    release();
    return null;
  }
  const reader = body.getReader();
  return new ReadableStream({
    async pull(output) {
      try {
        const chunk = await reader.read();
        if (chunk.done) {
          release();
          output.close();
        } else {
          output.enqueue(chunk.value);
        }
      } catch (error) {
        release();
        output.error(error);
      }
    },
    async cancel(reason) {
      controller.abort(reason);
      try {
        await reader.cancel(reason);
      } finally {
        release();
      }
    },
  });
}

async function fetchMusicAudio(event, source) {
  const request = event.request;
  const stream = openMusicStream(event, source);
  const headers = new Headers();
  for (const name of ["accept", "if-range", "range"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  let upstream;
  try {
    upstream = await ultraviolet.bareClient.fetch(source.href, {
      method: request.method,
      headers,
      redirect: "follow",
      signal: stream.controller.signal,
    });
  } catch (error) {
    stream.release();
    throw error;
  }
  const responseHeaders = new Headers(upstream.rawHeaders || upstream.headers);
  for (const name of ["content-encoding", "content-security-policy", "cross-origin-resource-policy", "set-cookie", "transfer-encoding"]) {
    responseHeaders.delete(name);
  }
  responseHeaders.set("cache-control", "no-store");
  responseHeaders.set("x-neo-music-stream", "1");
  const body = request.method === "HEAD"
    ? (stream.release(), null)
    : streamMusicBody(upstream.body, stream.controller, stream.release);
  return new Response(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

async function isMissingTransportResponse(response) {
  if (!response || response.status !== 500) return false;
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return false;
  const body = await response.clone().text().catch(() => "");
  return /there are no bare clients|No BareTransport was set|wasm not loaded yet|please call libcurl\.load_wasm|Hyper client|hyper_util::client::legacy::Error|MuxTaskEnded|Multiplexor task ended/i.test(body);
}

async function proxyFetchWithRecovery(event) {
  let response = await ultraviolet.fetch(event);
  if (!isNavigationRequest(event.request) || !(await isMissingTransportResponse(response))) {
    return response;
  }

  try {
    await requestFallbackFromClient();
    response = await ultraviolet.fetch(event);
    if (!(await isMissingTransportResponse(response))) return response;
  } catch (error) {
    // The polished navigation fallback below replaces Ultraviolet's raw error page.
  }
  return navigationError();
}

function navigationError() {
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>Page unavailable</title><style>` +
      `body{margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#f5f5f7;font:14px system-ui}` +
      `main{max-width:520px;padding:32px;text-align:center}h1{font-size:22px}p{color:#a1a1aa;line-height:1.55}` +
      `</style><main><h1>This page could not be loaded</h1>` +
      `<p>This destination could not be reached. Check the address and try again.</p></main></html>`,
    { status: 502, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "neo-browser:activate" && event.data.engine === ENGINE_VERSION) {
    event.waitUntil(self.skipWaiting());
    return;
  }
  if (event.data?.type === "neo-browser:game-document" && event.data.engine === ENGINE_VERSION) {
    const reply = event.ports[0];
    event.waitUntil((async () => {
      try {
        const target = new URL(String(event.data.url || ""));
        if (
          target.protocol !== "https:" ||
          target.hostname.toLowerCase() !== "a.luminsdk.com" ||
          !/^\/g\/[A-Za-z0-9_-]+\//.test(target.pathname)
        ) {
          throw new Error("This game document source is not trusted.");
        }
        const upstream = await ultraviolet.bareClient.fetch(target.href, {
          method: "GET",
          headers: {
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "accept-language": "en-US,en;q=0.9",
            referer: "https://fern.best/",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36",
          },
          redirect: "follow",
        });
        if (!upstream || upstream.status < 200 || upstream.status >= 300) {
          const detail = upstream && typeof upstream.text === "function"
            ? String(await upstream.text()).replace(/\s+/g, " ").trim().slice(0, 160)
            : "";
          throw new Error(`The game host returned ${upstream?.status || "an invalid response"}.${detail ? ` ${detail}` : ""}`);
        }
        const declaredSize = Number((upstream.rawHeaders || upstream.headers)?.["content-length"] || 0);
        if (declaredSize > MAX_GAME_DOCUMENT_BYTES) throw new Error("The game document is too large.");
        const html = typeof upstream.text === "function"
          ? await upstream.text()
          : await new Response(upstream.body).text();
        if (html.length > MAX_GAME_DOCUMENT_BYTES) throw new Error("The game document is too large.");
        reply?.postMessage({ ok: true, html, url: target.href });
      } catch (error) {
        reply?.postMessage({ ok: false, message: String(error?.message || error) });
      }
    })());
    return;
  }
  if (event.data?.type === "neo-browser:proxy-resource" && event.data.engine === ENGINE_VERSION) {
    const reply = event.ports[0];
    event.waitUntil((async () => {
      try {
        const target = new URL(String(event.data.url || ""));
        if (target.protocol !== "https:" && target.protocol !== "http:") {
          throw new Error("This resource address is not supported.");
        }
        const upstream = await ultraviolet.bareClient.fetch(target.href, {
          method: "GET",
          headers: {
            accept: String(event.data.accept || "*/*").slice(0, 512),
            "accept-language": "en-US,en;q=0.9",
          },
          redirect: "follow",
        });
        if (!upstream || upstream.status < 200 || upstream.status >= 300) {
          throw new Error(`The resource host returned ${upstream?.status || "an invalid response"}.`);
        }
        const upstreamHeaders = upstream.rawHeaders || upstream.headers;
        const headerValue = (name) => {
          if (upstreamHeaders && typeof upstreamHeaders.get === "function") return upstreamHeaders.get(name) || "";
          const direct = upstreamHeaders?.[name] || upstreamHeaders?.[name.toLowerCase()] || "";
          return Array.isArray(direct) ? direct.join(", ") : String(direct || "");
        };
        const declaredSize = Number(headerValue("content-length") || 0);
        if (declaredSize > MAX_PROXY_RESOURCE_BYTES) throw new Error("The proxied resource is too large.");
        const bytes = typeof upstream.arrayBuffer === "function"
          ? await upstream.arrayBuffer()
          : await new Response(upstream.body).arrayBuffer();
        if (bytes.byteLength > MAX_PROXY_RESOURCE_BYTES) throw new Error("The proxied resource is too large.");
        reply?.postMessage({
          ok: true,
          bytes,
          type: headerValue("content-type") || "application/octet-stream",
          url: target.href,
        }, [bytes]);
      } catch (error) {
        reply?.postMessage({ ok: false, message: String(error?.message || error) });
      }
    })());
    return;
  }
  if (event.data?.type !== "neo-browser:warm") return;
  if (event.data.bareMuxPort instanceof MessagePort) {
    ultraviolet.bareClient = new self.Ultraviolet.BareClient(event.data.bareMuxPort);
  }
  event.ports[0]?.postMessage({ ok: true, engine: ENGINE_VERSION });
});

self.addEventListener("fetch", (event) => {
  if (!ultraviolet.route(event)) return;

  const audioSource = musicAudioSource(event.request);
  if (audioSource) {
    event.respondWith(fetchMusicAudio(event, audioSource).catch(() => {
      return new Response(null, {
        status: 502,
        headers: { "x-neo-music-stream": "error" },
      });
    }));
    return;
  }

  event.respondWith(
    proxyFetchWithRecovery(event).catch(() => {
      if (event.request.mode === "navigate") return navigationError();
      return new Response(null, { status: 502 });
    }),
  );
});
