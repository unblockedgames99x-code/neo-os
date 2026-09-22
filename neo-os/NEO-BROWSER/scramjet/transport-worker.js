"use strict";

let transportPromise = null;
const sockets = new Map();
const requestControllers = new Map();

function errorMessage(error) {
  return error && (error.stack || error.message) ? String(error.stack || error.message) : String(error);
}

async function readBody(body) {
  if (body == null) return null;
  if (body instanceof ArrayBuffer) return body;
  if (ArrayBuffer.isView(body)) return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
  if (body instanceof ReadableStream) return new Response(body).arrayBuffer();
  if (typeof body === "string") return new TextEncoder().encode(body).buffer;
  return new Response(body).arrayBuffer();
}

async function getTransport(transportUrl, relay) {
  if (!transportPromise) {
    transportPromise = import(transportUrl).then(async (module) => {
      const transport = new module.default({ wisp: relay });
      for (let attempt = 0; attempt < 32; attempt += 1) {
        try {
          await transport.init();
          return transport;
        } catch (error) {
          if (!String(error).includes("wasm not loaded") || attempt === 31) throw error;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      return transport;
    }).catch((error) => {
      transportPromise = null;
      throw error;
    });
  }
  return transportPromise;
}

self.addEventListener("message", async (event) => {
  const message = event.data || {};
  const id = message.id;
  if (message.type === "cancel") {
    requestControllers.get(message.requestId)?.abort();
    requestControllers.delete(message.requestId);
    return;
  }
  try {
    const transport = await getTransport(message.transportUrl, message.relay);
    if (message.type === "init") {
      self.postMessage({ id, ok: true });
      return;
    }
    if (message.type === "fetch") {
      const controller = new AbortController();
      requestControllers.set(id, controller);
      try {
        const response = await transport.request(
          new URL(message.url),
          message.method,
          message.body || null,
          message.headers || {},
          controller.signal
        );
        const headers = response.rawHeaders || response.headers || [];
        const value = {
          body: response.body,
          headers,
          status: response.status,
          statusText: response.statusText || "",
        };
        if (response.body instanceof ReadableStream) {
          try {
            self.postMessage({ id, ok: true, value }, [response.body]);
            return;
          } catch (_error) {}
        }
        const body = await readBody(response.body);
        self.postMessage({ id, ok: true, value: { ...value, body } }, body ? [body] : []);
      } finally {
        requestControllers.delete(id);
      }
      return;
    }
    if (message.type === "connect") {
      const socketId = message.socketId;
      const pair = transport.connect(
        new URL(message.url),
        message.protocols || [],
        message.headers || {},
        (protocol) => self.postMessage({ event: "socket-open", socketId, protocol: protocol || "" }),
        (data) => {
          if (data instanceof ArrayBuffer) self.postMessage({ event: "socket-message", socketId, data }, [data]);
          else self.postMessage({ event: "socket-message", socketId, data });
        },
        (code, reason) => {
          sockets.delete(socketId);
          self.postMessage({ event: "socket-close", socketId, code, reason: reason || "" });
        },
        (error) => self.postMessage({ event: "socket-error", socketId, error: errorMessage(error) })
      );
      sockets.set(socketId, pair);
      self.postMessage({ id, ok: true });
      return;
    }
    if (message.type === "socket-send") {
      const pair = sockets.get(message.socketId);
      if (pair) pair[0](message.data);
      return;
    }
    if (message.type === "socket-close") {
      const pair = sockets.get(message.socketId);
      if (pair) pair[1](message.code, message.reason || "");
      sockets.delete(message.socketId);
      return;
    }
  } catch (error) {
    self.postMessage({ id, ok: false, error: errorMessage(error) });
  }
});
