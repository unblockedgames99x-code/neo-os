const APP_ROUTE = "__neo_app__/";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

function prepareAppDocument(source) {
  const baseUrl = new URL("./", self.location.href).href;
  let html = String(source || "")
    .replace(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "");
  const base = `<base href="${baseUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" target="_self">`;
  if (/<base\b[^>]*>/i.test(html)) html = html.replace(/<base\b[^>]*>/i, base);
  else if (/<head(?:\s[^>]*)?>/i.test(html)) html = html.replace(/<head(?:\s[^>]*)?>/i, (head) => head + base);
  return html;
}

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  const appUrl = new URL(APP_ROUTE, self.registration.scope);
  if (event.request.mode !== "navigate" || requestUrl.origin !== appUrl.origin || requestUrl.pathname !== appUrl.pathname) return;
  event.respondWith(
    fetch(new URL("index.html?neo-app-shell=1", self.location.href), { cache: "force-cache", credentials: "omit" })
      .then((response) => {
        if (!response.ok) throw new Error(`App document returned ${response.status}.`);
        return response.text();
      })
      .then((source) => new Response(prepareAppDocument(source), {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      }))
  );
});
