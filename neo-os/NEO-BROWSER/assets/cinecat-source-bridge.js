(() => {
  "use strict";

  if (window.__neoCinecatSourceBridge) return;
  window.__neoCinecatSourceBridge = true;
  document.documentElement.dataset.neoCinecatSourceBridge = "ready";

  const BRIDGE_VERSION = "1.4.1";
  const streamRules = new Map();
  const nativeFetch = window.fetch.bind(window);
  const nativePostMessage = window.postMessage.bind(window);
  const NativeXHR = window.XMLHttpRequest;
  const parentPostMessage = window.parent.postMessage.bind(window.parent);
  let streamHooksInstalled = false;
  let streamDebugCount = 0;
  const activeRelays = new Set();

  const makeFullUrl = (url, options = {}) => {
    let left = String(options.baseUrl || "");
    let right = String(url || "");
    if (left && !left.endsWith("/")) left += "/";
    if (right.startsWith("/")) right = right.slice(1);
    const full = left + right;
    if (!/^https?:\/\//i.test(full)) throw new Error("Only HTTP and HTTPS requests are supported.");
    const parsed = new URL(full);
    Object.entries(options.query || {}).forEach(([key, value]) => parsed.searchParams.set(key, value));
    return parsed.href;
  };

  const requestBody = (body, type) => {
    if (body == null) return undefined;
    if (type === "FormData") {
      const form = new FormData();
      for (const [key, value] of body) form.append(key, value);
      return form;
    }
    if (type === "URLSearchParams") return new URLSearchParams(body);
    if (type === "object") return JSON.stringify(body);
    return body;
  };

  const bodyBuffer = async (body) => {
    if (body == null) return null;
    if (body instanceof ArrayBuffer) return body;
    if (ArrayBuffer.isView(body)) return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
    if (body instanceof Blob) return body.arrayBuffer();
    if (body instanceof URLSearchParams) return new TextEncoder().encode(body.toString()).buffer;
    if (body instanceof FormData) {
      const response = new Response(body);
      return response.arrayBuffer();
    }
    return new TextEncoder().encode(typeof body === "string" ? body : JSON.stringify(body)).buffer;
  };

  const transportRequest = async (url, options = {}) => {
    const channel = new MessageChannel();
    const method = String(options.method || "GET").toUpperCase();
    const payload = /^(?:GET|HEAD)$/.test(method) ? null : await bodyBuffer(options.body);
    const responsePromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        channel.port1.close();
        reject(new Error("The movie request timed out."));
      }, Number(options.timeout || 45000));
      channel.port1.onmessage = (event) => {
        clearTimeout(timer);
        channel.port1.close();
        if (event.data?.ok) resolve(event.data.response);
        else {
          console.warn("[NEO Movies] transport failed", event.data?.error || "unknown error");
          reject(new Error(event.data?.error || "The movie request failed."));
        }
      };
      channel.port1.start();
    });
    const transfer = [channel.port2];
    if (payload) transfer.push(payload);
    parentPostMessage({
      type: "neo:cinecat:transport-request",
      url: String(url),
      method,
      headers: Object.fromEntries(new Headers(options.headers || {}).entries()),
      body: payload,
    }, "*", transfer);
    return responsePromise;
  };

  const responseFromTransport = (result) => new Response(result.body, {
    status: result.status,
    statusText: result.statusText || "",
    headers: result.headers || [],
  });

  const matchingRule = (input) => {
    let url;
    try { url = new URL(String(input || ""), location.href); } catch { return null; }
    for (const rule of streamRules.values()) {
      if ((rule.targetDomains || []).some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) {
        return rule;
      }
      if (rule.targetRegex) {
        try { if (new RegExp(rule.targetRegex).test(url.href)) return rule; } catch {}
      }
    }
    return null;
  };

  const debugTarget = (input) => {
    try {
      const url = new URL(String(input || ""), location.href);
      return `${url.hostname}${url.pathname}`;
    } catch {
      return "unknown";
    }
  };

  const installStreamHooks = () => {
    if (streamHooksInstalled) return;
    streamHooksInstalled = true;

    window.fetch = (input, init = {}) => {
      const target = typeof input === "string" || input instanceof URL ? String(input) : input && input.url;
      const rule = matchingRule(target);
      if (!rule || !rule.requestHeaders) return nativeFetch(input, init);
      if (streamDebugCount++ < 8) console.info("[NEO Movies] stream fetch", debugTarget(target));
      const headers = new Headers(input instanceof Request ? input.headers : undefined);
      new Headers(init.headers || {}).forEach((value, key) => headers.set(key, value));
      Object.entries(rule.requestHeaders).forEach(([key, value]) => {
        if (!headers.has(key)) headers.set(key, value);
      });
      return transportRequest(target, {
        method: init.method || (input instanceof Request ? input.method : "GET"),
        headers,
        body: init.body,
      }).then(responseFromTransport).catch((error) => {
        console.warn("[NEO Movies] stream fetch failed", error instanceof Error ? error.message : String(error));
        throw error;
      });
    };

    const forwardedEvents = ["readystatechange", "loadstart", "progress", "load", "error", "timeout", "abort", "loadend"];
    const emit = (xhr, type, event = new Event(type)) => {
      try { xhr[`on${type}`]?.call(xhr, event); } catch {}
      (xhr.__listeners.get(type) || []).forEach((listener) => {
        try { listener.call(xhr, event); } catch {}
      });
    };

    class ProxyXHR {
      constructor() {
        this.__native = new NativeXHR();
        this.__listeners = new Map();
        this.__headers = {};
        this.__responseHeaders = {};
        this.__usingNative = true;
        this.__method = "GET";
        this.__url = "";
        this.__rule = null;
        this.__readyState = 0;
        this.__status = 0;
        this.__statusText = "";
        this.__response = null;
        this.__responseText = "";
        this.__responseURL = "";
        this.__responseType = "";
        this.timeout = 0;
        this.withCredentials = false;
        this.upload = this.__native.upload;
      }

      get readyState() { return this.__usingNative ? this.__native.readyState : this.__readyState; }
      get status() { return this.__usingNative ? this.__native.status : this.__status; }
      get statusText() { return this.__usingNative ? this.__native.statusText : this.__statusText; }
      get response() { return this.__usingNative ? this.__native.response : this.__response; }
      get responseText() { return this.__usingNative ? this.__native.responseText : this.__responseText; }
      get responseURL() { return this.__usingNative ? this.__native.responseURL : this.__responseURL; }
      get responseType() { return this.__usingNative ? this.__native.responseType : this.__responseType; }
      set responseType(value) {
        this.__responseType = value || "";
        if (this.__usingNative) {
          try { this.__native.responseType = value; } catch {}
        }
      }

      addEventListener(type, listener) {
        if (!this.__listeners.has(type)) this.__listeners.set(type, []);
        this.__listeners.get(type).push(listener);
      }

      removeEventListener(type, listener) {
        const listeners = this.__listeners.get(type) || [];
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      }

      open(method, url, async = true, user, password) {
        this.__method = method || "GET";
        this.__url = String(url || "");
        this.__rule = matchingRule(this.__url);
        this.__usingNative = !this.__rule;
        if (this.__rule && streamDebugCount++ < 8) console.info("[NEO Movies] stream xhr", debugTarget(this.__url));
        if (this.__usingNative) return this.__native.open(method, url, async, user, password);
        this.__readyState = 1;
        emit(this, "readystatechange");
      }

      setRequestHeader(name, value) {
        if (this.__usingNative) return this.__native.setRequestHeader(name, value);
        this.__headers[name] = value;
      }

      getResponseHeader(name) {
        if (this.__usingNative) return this.__native.getResponseHeader(name);
        return this.__responseHeaders[String(name || "").toLowerCase()] || null;
      }

      getAllResponseHeaders() {
        if (this.__usingNative) return this.__native.getAllResponseHeaders();
        return Object.entries(this.__responseHeaders).map(([key, value]) => `${key}: ${value}`).join("\r\n");
      }

      overrideMimeType(value) {
        if (this.__usingNative) return this.__native.overrideMimeType(value);
        this.__overrideMimeType = value;
      }

      abort() {
        if (this.__usingNative) return this.__native.abort();
        this.__controller?.abort();
        this.__readyState = 0;
        emit(this, "abort");
        emit(this, "loadend");
      }

      async send(body = null) {
        if (this.__usingNative) {
          this.__native.responseType = this.__responseType;
          this.__native.timeout = this.timeout;
          this.__native.withCredentials = this.withCredentials;
          forwardedEvents.forEach((type) => this.__native.addEventListener(type, (event) => emit(this, type, event), { once: type === "loadend" }));
          return this.__native.send(body);
        }

        const ruleHeaders = this.__rule?.requestHeaders || {};
        const headers = new Headers(ruleHeaders);
        Object.entries(this.__headers).forEach(([key, value]) => headers.set(key, value));
        const referrer = ruleHeaders.Referer || ruleHeaders.referer;
        if (referrer) {
          headers.delete("referer");
          headers.delete("Referer");
        }
        this.__controller = new AbortController();
        let timeoutId = 0;
        if (this.timeout > 0) timeoutId = setTimeout(() => this.__controller.abort("timeout"), this.timeout);

        try {
          emit(this, "loadstart");
          const routed = await transportRequest(this.__url, {
            method: this.__method,
            headers,
            body: /^(?:GET|HEAD)$/i.test(this.__method) ? undefined : body,
            timeout: this.timeout || 45000,
          });
          const response = responseFromTransport(routed);
          const buffer = await response.arrayBuffer();
          this.__status = response.status;
          this.__statusText = response.statusText;
          this.__responseURL = this.__url;
          this.__responseHeaders = Object.fromEntries(response.headers.entries());
          this.__readyState = 2;
          emit(this, "readystatechange");
          this.__readyState = 3;
          emit(this, "readystatechange");
          emit(this, "progress", new ProgressEvent("progress", { loaded: buffer.byteLength, total: buffer.byteLength }));
          if (this.__responseType === "arraybuffer") {
            this.__response = buffer;
          } else if (this.__responseType === "blob") {
            this.__response = new Blob([buffer], { type: this.getResponseHeader("content-type") || this.__overrideMimeType || "application/octet-stream" });
          } else {
            const text = new TextDecoder().decode(buffer);
            this.__responseText = text;
            this.__response = this.__responseType === "json" ? JSON.parse(text) : text;
          }
          this.__readyState = 4;
          emit(this, "readystatechange");
          emit(this, "load");
          emit(this, "loadend");
        } catch (error) {
          console.warn("[NEO Movies] stream xhr failed", error instanceof Error ? error.message : String(error));
          this.__readyState = 4;
          emit(this, "readystatechange");
          emit(this, this.__controller.signal.reason === "timeout" ? "timeout" : "error");
          emit(this, "loadend");
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }
      }
    }

    ProxyXHR.UNSENT = 0;
    ProxyXHR.OPENED = 1;
    ProxyXHR.HEADERS_RECEIVED = 2;
    ProxyXHR.LOADING = 3;
    ProxyXHR.DONE = 4;
    window.XMLHttpRequest = ProxyXHR;
  };

  const makeRequest = async (body) => {
    if (!body) throw new Error("No request body was provided.");
    const url = makeFullUrl(body.url, body);
    const headers = new Headers(body.headers || {});
    console.info("[NEO Movies] provider request", JSON.stringify({
      target: debugTarget(url),
      method: body.method || "GET",
      credentials: body.credentials || "default",
      headers: [...headers.keys()],
    }));
    const routed = await transportRequest(url, {
      method: body.method || "GET",
      headers,
      body: requestBody(body.body, body.bodyType),
    });
    const response = responseFromTransport(routed);
    console.info("[NEO Movies] provider response", debugTarget(url), response.status);
    const responseHeaders = Object.fromEntries(response.headers.entries());
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    let parsedBody = text;
    if (/application\/json/i.test(contentType)) {
      try { parsedBody = JSON.parse(text); } catch {}
    }
    return {
      success: true,
      response: {
        statusCode: response.status,
        headers: responseHeaders,
        finalUrl: routed.finalUrl || url,
        body: parsedBody,
      },
    };
  };

  const handlers = {
    hello: async () => ({ success: true, version: BRIDGE_VERSION, allowed: true, hasPermission: true }),
    makeRequest,
    prepareStream: async (body) => {
      if (!body) throw new Error("No stream information was provided.");
      streamRules.set(body.ruleId || `neo-${Date.now()}`, body);
      console.info("[NEO Movies] stream rule", JSON.stringify({
        domains: body.targetDomains || [],
        regex: body.targetRegex || "",
        headers: Object.keys(body.requestHeaders || {}),
      }));
      installStreamHooks();
      return { success: true };
    },
    openPage: async (body) => {
      if (body && body.redirectUrl) location.assign(body.redirectUrl);
      return { success: true };
    },
  };

  const handleRelay = async (data, source) => {
    if (!data || data.relayed) return;
    const handler = handlers[data.name];
    if (!handler) return;
    const relayKey = `${data.name}:${data.instanceId || "none"}`;
    if (activeRelays.has(relayKey)) return;
    activeRelays.add(relayKey);
    console.info("[NEO Movies] source request", data.name);
    let result;
    try {
      result = await handler(data.body);
    } catch (error) {
      result = { success: false, error: error instanceof Error ? error.message : String(error) };
    }
    nativePostMessage({
      name: data.name,
      relayId: data.relayId,
      instanceId: data.instanceId,
      body: result,
      relayed: true,
    }, "*");
    setTimeout(() => activeRelays.delete(relayKey), 5000);
  };

  window.postMessage = function (message, targetOrigin, transfer) {
    if (message && !message.relayed && handlers[message.name]) {
      Promise.resolve().then(() => handleRelay(message, window));
      return;
    }
    const normalizedOrigin = targetOrigin && typeof targetOrigin === "object"
      ? targetOrigin.targetOrigin || "*"
      : targetOrigin || "*";
    return nativePostMessage(message, normalizedOrigin, transfer);
  };

  window.addEventListener("message", (event) => {
    handleRelay(event.data, event.source);
  });

  window.dispatchEvent(new CustomEvent("neo:cinecat-source-bridge-ready", {
    detail: { version: BRIDGE_VERSION },
  }));
  console.info("[NEO Movies] alternate source bridge ready", BRIDGE_VERSION);
})();
