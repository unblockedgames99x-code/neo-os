"use strict";

const PROVIDER = "https://vcsa.huangqirui.xyz";
const TRACK_ID = /^[A-Za-z0-9_-]{6,24}$/;
const DEFAULT_RANGE = "bytes=0-1048575";

function errorResponse(statusCode, message) {
  return {
    statusCode,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    },
    body: JSON.stringify({ error: message })
  };
}

export async function handler(event) {
  const method = String(event.httpMethod || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return errorResponse(405, "Method not allowed");

  const id = String((event.queryStringParameters && event.queryStringParameters.id) || "").trim();
  if (!TRACK_ID.test(id)) return errorResponse(400, "The music stream ID is invalid.");

  const requestHeaders = {
    Accept: "audio/*,video/mp4;q=0.9,*/*;q=0.1"
  };
  if (method === "GET") {
    requestHeaders.Range = String((event.headers && (event.headers.range || event.headers.Range)) || DEFAULT_RANGE);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const upstream = await fetch(`${PROVIDER}/api/yt/astream/${encodeURIComponent(id)}`, {
      method,
      headers: requestHeaders,
      signal: controller.signal
    });
    if (!upstream.ok && upstream.status !== 206) {
      return errorResponse(upstream.status === 404 ? 404 : 502, "The full song is unavailable right now.");
    }

    const headers = {
      "Accept-Ranges": upstream.headers.get("accept-ranges") || "bytes",
      "Cache-Control": "public, max-age=300",
      "Content-Type": upstream.headers.get("content-type") || "audio/mp4",
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff"
    };
    for (const name of ["content-length", "content-range"]) {
      const value = upstream.headers.get(name);
      if (value) headers[name] = value;
    }

    if (method === "HEAD") return { statusCode: upstream.status, headers, body: "" };
    const bytes = Buffer.from(await upstream.arrayBuffer());
    headers["content-length"] = String(bytes.length);
    return {
      statusCode: upstream.status,
      headers,
      body: bytes.toString("base64"),
      isBase64Encoded: true
    };
  } catch (error) {
    return errorResponse(502, "The full song is unavailable right now.");
  } finally {
    clearTimeout(timer);
  }
}
