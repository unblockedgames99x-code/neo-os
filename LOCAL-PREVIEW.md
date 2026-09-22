# NEO local preview

For the subsequent desktop rebuild, restored original browser UI, Settings → Sound/Customize, editor, terminal, skins, local chat improvements and outstanding production blockers, see [DESKTOP-IMPLEMENTATION.md](DESKTOP-IMPLEMENTATION.md).

## What the previous build depended on

- `index.html` selected a GitHub Pages production URL outside localhost.
- `neo-os/neo-apps.js` chose `music-v3` locally and a pinned jsDelivr HTML document elsewhere.
- `neo-os/music-v3/` contains the previous API-based streaming player. A local copy of its HTML did not make its remote catalog, artwork, and audio local.
- `neo-os/NEO-BROWSER/`, `neo-browser-runtime.js`, `browser-sw.js`, and `browser-runtime/` implement browser proxy/service-worker/network transports. The OS prewarmed them during idle startup.
- `neo-runner-host.js` forwarded requests to Google Apps Script. `neo-frame-loader.js` could fetch, rewrite, and inject `neo-runner-network.js` into child documents.
- `games/index.json` is a local catalog, but most referenced HTML files are launch wrappers with remote base URLs, scripts, iframes, or game media. Many cover URLs in `games/covers.json` also point to external hosts.
- `wallpaper-full-media.json` mixes bundled video files, web scenes, and YouTube embeds. Web scenes can have their own external dependencies.
- NEO Chat supported a Google Apps Script backend and a local preview transport.

## Current local behavior

Run `node local-preview.mjs` from the project directory. Open `http://127.0.0.1:3092/neo-os/` or the music page at `http://127.0.0.1:3092/neo-os/music-local/`. Use the same hostname/port to preserve local storage between visits. The server needs Node.js and no installed packages. NEO OS itself still works without an internet connection; live browsing additionally requires an available WISP relay.

`neo-os/neo-local-config.js` is the explicit local-mode configuration. The shell loads `music-local/index.html` directly, disables the old Google relay, and opens the rebuilt NEO Browser. That Browser uses bundled Scramjet/service-worker interception when served normally and keeps the GUST-derived libcurl/WISP renderer as its compatibility fallback. The separate local library remains available for page search and device-file previews. Google Apps Script account/network bridges are disabled even if a Google object is present in the parent page. The root launcher always opens this checkout.

The preview server binds only to loopback. Its default Content Security Policy permits same-origin assets, local blobs, and media data while denying remote scripts, requests, frames, fonts, and images. Only `/neo-os/NEO-BROWSER/` receives the separate policy required for bundled WebAssembly and user-selectable secure WISP sockets; arbitrary remote scripts and frames are still not loaded directly. The server supports byte-range requests and correct media MIME types for audio seeking, blocks old proxy routes, and redirects other remote-dependent app/game entry points to a clear local-unavailable page. The Weather widget uses the narrow `/.netlify/functions/neo-weather` endpoint: it validates a U.S. ZIP code, proxies only Open-Meteo geocoding and current-forecast requests, and caches successful conditions for ten minutes. The browser never contacts the weather provider directly, and the widget keeps its last successful result when a later refresh is unavailable.

The existing shell utilities, launch screen, taskbar, window management, local Chat, local files, media importer, static backgrounds, reactive canvas, and bundled/imported video wallpapers remain. Internet-only apps remain listed but explain their unavailable state. The Games library preserves the catalog and available disk cover art, with a default **Ready offline** filter. Three previously existing, self-contained games are enabled: **Grandmaster Chess**, **Quantum Clicker**, and **Tetris**. Tetris's remote Google font import was removed. Other games retain favorites/search/catalog entries but cannot launch until their complete resources are available locally and verified.

Music state is sent from the local player to the shell with `neo-local-music:state`; the shell checks both frame source and same origin. Commands use `neo-local-music:command`. Minimizing keeps playback; closing stops playback and removes the frame. Existing taskbar mute, now-playing metadata, and volume controls use this bridge.

## Deliberate limits

- With Wi-Fi off, the Browser retains its shell, tabs, settings, installed pages, and file previews, but live websites require a reachable WISP relay.
- Online game levels, cloud gaming, Internet TV/YouTube, and cross-device messages cannot work without a network service. They are disabled rather than silently substituted with remote embeds.
- Local Chat data and passwords use device storage, not a public account service. Passwords now use salted PBKDF2, but client storage still is not production authentication or secure cross-device messaging.
- Local media decoding depends on codecs supported by the installed Chrome version. The player/importers report unsupported formats.
- Keeping Wi-Fi off is supported while the local server is running. The application is not an installed PWA, and stopping the server prevents subsequent local page/file loads.
- Historical deployment files are retained for reference but are not active in the local launch path and are blocked by this preview server. Nothing was deployed or pushed for this rebuild.

## Moving assets to a CDN later

1. Upload the complete asset folders while preserving paths. Keep audio and cover filename casing exact.
2. Change the music asset manifest/base settings documented in `neo-os/music-local/`; retain catalog IDs so saved playlists remain valid. For shell routes, edit `configuredAssetBase` in `neo-local-config.js` (used by both routes and `resolve()`), or edit individual app routes for the groups being migrated. The exported `assetBase` field reports the resolved base; it is read-only.
3. Add the specific trusted CDN origin to the applicable `script-src`, `style-src`, `img-src`, `media-src`, `font-src`, `connect-src`, and/or `frame-src` directives in `local-preview.mjs` and page CSP meta tags. Do not use wildcard origins. Changing asset URLs alone intentionally cannot bypass the current offline policy.
4. Configure the CDN for correct MIME types, CORS for the application origin, HTTPS, and audio `Range` requests (206 responses). Use immutable versioned files and short-lived manifests.
5. If hosting the music page itself on a different origin, update the shell/player message origin allowlist and `postMessage` target together. Hosting only audio/artwork on the CDN avoids this change.
6. Re-test playback, seeking, playlists, imports, error states, and the target Chromebook layouts. Restore online service integrations independently only after replacing their missing backend dependencies; a CDN does not provide a music API, game server, or account service.

## Checks

Run the `tests/offline-*.cjs` tests added with this rebuild. Browser tests block external requests and use isolated browser storage. The offline server tests cover local pages, CSP, MIME, HEAD, ranges, and blocked legacy endpoints. Additional UI checks cover music and the shell at Chromebook/laptop/mobile widths.

## Music files and configuration

- `neo-os/music-local/index.html` and `styles.css`: responsive, local-script-only UI, inline SVG controls, local fallback artwork, dialogs, queue, loading and error panels.
- `neo-os/music-local/app.js`: native audio playback, full-track transport/seek/volume/mute, explicit 10-second previews, local search, favourites, recent tracks, playlists, queue, imports, media keys and shell messages. No remote search/player API is used.
- `neo-os/music-local/config.js`: asset URL resolver, explicit remote-asset switch, storage names and import limits.
- `neo-os/music-local/catalog.js`: stable IDs and relative audio/cover paths. Add complete audio files and artwork under `media/`, then add catalog records using this schema. No build step is needed.
- `neo-os/music-local/media/`: three complete original demo tracks (72, 80 and 64 seconds) and local SVG covers. These are original demo instrumentals, not commercial streaming tracks or excerpts. `generate-demo-media.mjs` can recreate them without network access.

**Add your own music:** use **Import music** / **Add your music**, selecting audio files and optional matching PNG/JPG/WebP covers. A cover with the same basename is paired automatically; one audio file plus one image also works. Imported tracks have **Change cover** in their options menu. Supported codecs depend on Chrome; imports are limited to 150 MiB per audio file and 12 MiB per cover. Import errors are surfaced without discarding successfully imported files. Ordinary playback is never shortened to the preview duration.

Imported audio and artwork are stored in IndexedDB. Favourites, recent history, queue, volume and playlists use localStorage. Storage is per browser profile and exact origin (hostname plus port); it does not sync across devices. Browser data clearing, private sessions, managed-browser policies or storage eviction may remove the library. Keep the original files. If persistence is denied or storage is full, the UI warns that imports are session-only. Export playlists saves metadata/IDs, not audio, and is not a complete audio-library backup.

### Exact music-only CDN switch

1. Upload the **`media` directory itself** to your HTTPS asset directory, preserving its filenames. For example, the directory represented by `assetBase` must contain `media/after-hours.wav` and `media/after-hours.svg`.
2. In `neo-os/music-local/config.js`, set `assetBase` to that absolute HTTPS directory URL **ending with `/`**, and set `allowRemoteAssets: true`. Keep track IDs and relative `src`/`cover` values in `catalog.js` unchanged. This switches packaged media, not private device imports.
3. In **both** the CSP meta tag in `neo-os/music-local/index.html` **and** the CSP string in `local-preview.mjs`, append only the CDN's exact origin to `img-src` and `media-src`. For artwork displayed in the OS shell, also append it to `img-src` in `neo-os/index.html` and explicitly allow it in `mountLocalMusic`'s cover URL check in `neo-os/neo-os.js`. Leave `script-src` and all Google/proxy integrations unchanged.
4. Configure HTTPS, audio/image MIME types and byte-range support on the CDN. For future audio analysis or cross-origin fetching, configure CORS for the app's exact origin too. Restart the local server so its updated CSP takes effect.
5. Reload and verify Play, Pause, seek near the end of a full file, Next, imported-file playback, artwork and error recovery. Inspect requests to ensure only the chosen media origin was added. The default offline test intentionally rejects CDN requests: run it again after restoring local config, or explicitly allow the one CDN origin in a separate online test.

The UI and shell page should stay same-origin; moving only media files requires no player rewrite. Uploading assets does not restore music search APIs or other online services.

### Re-running verification

With `node local-preview.mjs` running in one terminal, run these individually in a second terminal from the project directory:

```text
node tests/offline-assets.cjs
node tests/offline-server.cjs
node tests/offline-browser.cjs
node tests/offline-shell.cjs
```

The first two require only Node. Browser checks require an installed Chrome and Playwright; they use the existing bundled runtime on this workstation (no download/install performed). On another machine set `NEO_CHROME_PATH` to Chrome and `NEO_PLAYWRIGHT_PATH` to an existing Playwright package directory; `NEO_PREVIEW_URL` optionally changes the tested local origin. Tests use isolated profiles, abort non-local requests, and write reports/screenshots under `.codex-tmp/offline-verification/`. Deliberately missing audio/covers produce expected 404s only in their recovery tests.

Chrome was tested at **1366×768**, **1024×600**, **768×1024**, and **390×844**. This is desktop Chrome responsive testing, not a claim of testing on physical ChromeOS hardware or every school administrator policy.

Verification completed: **27 music checks** and **13 shell/browser/game checks** passed, as did the local asset and server suites. No external request attempts or uncaught JavaScript errors were recorded. Music recovery tests intentionally injected missing-file 404 responses; the normal shell/browser/game run had no failed responses or console errors. Music mute, minimized playback, and stop-on-close were checked against the real audio element, not just the button appearance.
