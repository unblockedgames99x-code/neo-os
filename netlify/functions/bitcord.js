"use strict";

var BITCORD_ROOT = "https://chalkle.lootline.xyz/bitcord";
var ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "DELETE"]);

function response(statusCode, payload, extraHeaders) {
  return {
    statusCode: statusCode,
    headers: Object.assign({
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }, extraHeaders || {}),
    body: typeof payload === "string" ? payload : JSON.stringify(payload)
  };
}

function safeApiPath(value) {
  var path = String(value || "").trim();
  if (!path.startsWith("/api/")) return "";
  if (path.includes("\\") || path.includes("..") || /[\r\n]/.test(path)) return "";
  return path;
}

function forwardedCookie(headers) {
  var raw = String((headers && (headers.cookie || headers.Cookie)) || "");
  var match = raw.match(/(?:^|;\s*)bc_session=([^;]+)/);
  return match ? "bc_session=" + match[1] : "";
}

function cleanSetCookie(value) {
  if (!value) return "";
  return String(value)
    .replace(/;\s*Domain=[^;]+/gi, "")
    .replace(/;\s*Path=[^;]+/gi, "; Path=/")
    .replace(/;\s*SameSite=None/gi, "; SameSite=Lax");
}

export async function handler(event) {
  var method = String(event.httpMethod || "GET").toUpperCase();
  if (!ALLOWED_METHODS.has(method)) {
    return response(405, { error: "Method not allowed" }, { Allow: Array.from(ALLOWED_METHODS).join(", ") });
  }

  var query = Object.assign({}, event.queryStringParameters || {});
  var path = safeApiPath(query.path);
  delete query.path;
  if (!path) return response(400, { error: "A valid Bitcord API path is required" });

  var target = new URL(BITCORD_ROOT + path);
  Object.entries(query).forEach(function (entry) {
    if (entry[1] != null) target.searchParams.set(entry[0], String(entry[1]));
  });

  var headers = { Accept: "application/json" };
  var cookie = forwardedCookie(event.headers);
  if (cookie) headers.Cookie = cookie;
  if (event.body && method !== "GET") headers["Content-Type"] = String((event.headers && (event.headers["content-type"] || event.headers["Content-Type"])) || "application/json");

  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, 12_000);
  try {
    var upstream = await fetch(target, {
      method: method,
      headers: headers,
      body: method === "GET" ? undefined : (event.isBase64Encoded ? Buffer.from(event.body || "", "base64") : String(event.body || "")),
      redirect: "manual",
      signal: controller.signal
    });
    var body = await upstream.text();
    var setCookie = cleanSetCookie(upstream.headers.get("set-cookie"));
    var outgoingHeaders = {};
    if (setCookie) outgoingHeaders["Set-Cookie"] = setCookie;
    return response(upstream.status, body || "{}", outgoingHeaders);
  } catch (error) {
    if (error && error.name === "AbortError") return response(504, { error: "Chalkle Chat took too long to respond" });
    return response(502, { error: "Could not reach Chalkle Chat" });
  } finally {
    clearTimeout(timer);
  }
}

