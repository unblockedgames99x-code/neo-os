"use strict";

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    },
    body: JSON.stringify(payload)
  };
}

export async function handler(event) {
  if (String(event.httpMethod || "GET").toUpperCase() !== "GET") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const query = String((event.queryStringParameters && event.queryStringParameters.q) || "").trim();
  if (!query || query.length > 120) {
    return jsonResponse(400, { error: "Enter a valid search" });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const upstream = await fetch(
      `https://vcsa.huangqirui.xyz/api/music/search?q=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" }, signal: controller.signal }
    );
    if (!upstream.ok) return jsonResponse(502, { error: "Music search is unavailable" });
    return jsonResponse(200, await upstream.json());
  } catch (error) {
    return jsonResponse(502, { error: "Music search is unavailable" });
  } finally {
    clearTimeout(timer);
  }
}
