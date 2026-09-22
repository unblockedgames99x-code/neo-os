# NEO BROWSER

NEO BROWSER is a self-contained browser workspace with tabs, bookmarks, privacy controls, page tools, media handling, extensions, and an optional assistant. Its primary compatibility path uses Scramjet's service-worker interception runtime. A GUST-derived libcurl/WISP renderer remains available as the no-service-worker fallback.

## Run

Serve this folder with any static web server and open `index.html`. Scramjet requires HTTPS, `localhost`, or `127.0.0.1` so its service worker can run. When service workers are unavailable, the browser falls back to its bundled GUST/libcurl renderer.

All assets required by the interface and both browser runtimes are included in this folder. Internet access is still required for external browsing, relay connections, favicons, optional assistant responses, and other explicitly network-backed features. `wss://support.pired.org/lively/` is the preferred WISP endpoint in both browser paths; measured fallbacks are used only when it is unavailable.

## Files

- `index.html` — application shell
- `assets/` — interface, runtime, transport, and brand assets
- `NEO-Packager.html` — optional feature-packaging utility
- `THIRD_PARTY_NOTICES.txt` — licenses and required attributions

The minimal browser chrome follows the active NEO OS theme while keeping an amber navigation accent and a consistent high-contrast content surface. Legacy visual-style packages are not supported.
