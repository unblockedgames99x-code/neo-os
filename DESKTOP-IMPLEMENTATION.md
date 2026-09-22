# NEO desktop implementation

## Review this build

From this repository, run `node local-preview.mjs`, then open <http://127.0.0.1:3092/neo-os/>. Choose **Laptop** and **Continue as guest**, or use a device-local profile. This serves the edited application, not a screenshot or separate mockup.

Open **Settings → Sound** for master volume, mute and interface brightness. **Settings → Customize** opens themes, wallpaper references and desktop skins. The floating Sound/Customize buttons were removed at the user's request. Existing taskbar, wallpaper, performance and app settings remain available.

Music is also directly available at <http://127.0.0.1:3092/neo-os/music-local/>. The preserved browser interface is at <http://127.0.0.1:3092/neo-os/NEO-BROWSER/>. Type `music`, `chess`, `tetris`, `clicker`, `local`, or a same-origin path into its address bar.

## Implemented

- Existing window manager retained: all eight resize handles take precedence over dragging; bounds use the actual desktop workspace, saved coordinates are layer-relative, and viewport/taskbar changes re-contain normal windows. Snap/fullscreen geometry no longer overwrites normal saved geometry.
- Original browser HTML, tab/address/navigation/bookmark UI retained. A local adapter handles installed pages and native link navigation. Automatic public relay selection, socket probing and Google favicons are disabled. Unsupported websites show a specific connection explanation and an optional regular Chrome-tab link.
- Six shared theme palettes: dark, light, midnight, glass, retro and high contrast. Master volume preserves each app's own volume, applies to local HTML media and Web Audio destination connections, and reaches newly loaded local frames. Brightness dims the interface, not the hardware display. Reduced motion is available.
- Desktop System/Active App status cards are transparent in every theme, with white text and a subtle shadow for readability over wallpaper.
- Code workspace: local file explorer, editable tabs, line numbers, status, save/import/export/delete, command palette, keyboard shortcuts and a network-disabled HTML sandbox preview. It is explicitly a local editor simulation, not Microsoft VS Code. The local official VS Code icon is a visual reference, not an affiliation claim.
- Terminal: eight local sessions, saved history, arrow-key history and safe simulated commands. No command executes a system shell, program, or network request.
- Fourteen Rainmeter-style skin types and seven visual styles. Separate drag headers and eight resize handles, arrow-key movement/resizing, snapping guides, lock/hide/show/delete, reset size/position, text, color, font, opacity, scale, border and shadow. Skin data and layout persist. Skins and minimized desktop previews no longer intercept app titlebar controls.
- Five local gradient placeholders linked to the supplied wallpaper references. Optional local image/video sources can replace them through configuration; existing bundled videos and image/video imports remain in Wallpaper Studio.
- Local chat: attachment-only rendering fixed; conversation search, account/room-specific drafts, emoji insertion, local profile editing, immediate same-origin updates, actual local-tab typing/read indicators, unread counts and optional in-app notifications. New device profiles use salted PBKDF2-SHA-256; older hashes upgrade after successful login. Async account creation merges fresh storage state instead of overwriting intervening messages.
- Prior local music implementation retained: full demo tracks and full imported files, art, search, favorites, history, queue, playlists, preview mode, imports, persistence, loading/errors/retry, real mute and stop-on-close. Game catalog, favorites, available local covers and three complete offline games remain functional.

## Files

| Area | Main files |
| --- | --- |
| Entry/server | `index.html`, `local-preview.mjs`, `neo-os/index.html`, `neo-os/neo-local-config.js` |
| Desktop/settings/editor/terminal | `neo-os/neo-desktop-config.js`, `neo-desktop-platform.js`, `neo-desktop.css`, `neo-system-bridge.js` |
| Windows/skins/previews | `neo-os/neo-os.js`, `neo-window-resize.js`, `neo-topbar-autohide.js`, `neo-skins.js`, `neo-taskbar-preview.js` |
| Browser | `neo-os/NEO-BROWSER/index.html`, `assets/app.js`, `assets/libcurl-compat.js`, `assets/local-navigation.js`, `neo-os/local-browser/connection.html`, `connection.js` |
| Chat | `neo-os/neo-chat-transport.js`, `neo-chat-experience.js`, chat template/hooks in `index.html` and `neo-os.js` |
| Local media/game integration | `neo-os/music-local/`, `neo-apps.js`, `neo-frame-loader.js`, `neo-wallpaper-engine.js`, `games/tetris.html` |
| Tests | `tests/desktop-platform.cjs`, `browser-navigation.cjs`, `neo-chat-local-transport.cjs`, `offline-assets.cjs`, `offline-server.cjs`, `offline-browser.cjs`, `offline-shell.cjs` |

## Verification

Run each with the local server running:

```text
node tests/offline-assets.cjs
node tests/offline-server.cjs
node tests/offline-browser.cjs
node tests/offline-shell.cjs
node tests/desktop-platform.cjs
node tests/browser-navigation.cjs
node tests/neo-chat-local-transport.cjs
```

Tests use isolated Chrome profiles and block external HTTP/WebSocket requests. They do not alter the user's saved browser data. Screenshots and reports are under `.codex-tmp/offline-verification/` and `.codex-tmp/desktop-verification/`. Music failure-recovery tests intentionally create missing-resource responses. Responsive sizes include 1366×768, 1024×600, 768×1024 and 390×844. Additional isolated browser checks covered every skin type/style, all resize directions, lock/hide/show and persistence.

This is Chrome responsive testing, **not physical Chromebook/managed-network certification**. Review any changed network policy on the actual school Chromebook before an online release.

## Production release blockers — not silently simulated as working

1. **Live in-page browsing needs a backend.** No owned Wisp-compatible proxy is installed/configured. Local browsing is working; arbitrary live sites are not. A regular Chrome tab uses the user's normal connection. Restoring online proxy support requires an owned maintained endpoint, authentication/abuse limits, explicit CSP/worker permissions, transport integration and real Chromium/ChromeOS tests. Changing a URL alone is insufficient; the local adapter deliberately returns no relay.
2. **Shared accounts/chat need server-side authentication and persistence.** Device profiles, local storage passwords, tokens, DMs and receipts are not secure public authorization, end-to-end encryption, or cross-device synchronization. Anyone controlling the same browser profile can access device data. Do not reuse an important password. Offline clients cannot notify another computer. Production needs a server-authorized user/room model, durable message/blob storage, rate limits, retention/backup and delivery tests across separate devices.
3. **Music APIs, online game levels, cloud gaming and Internet TV require services and appropriately licensed assets.** Only three complete games and three original full-length demo tracks are bundled; imports play full files. Remote catalog entries are preserved but not falsely labeled offline-ready.
4. **Browser capabilities are limited.** The editor is not VS Code, terminal is not a shell, CPU/whole-system RAM/network throughput are not available, weather is a manual offline placeholder, and the equalizer skin is a labeled playback visualization rather than measured spectrum. Browser-reported battery, heap and storage values are labeled precisely.
5. **Persistence is per exact origin/device.** Keep the same host/port. Browser clearing, private mode, policy or quota can remove data. Retain original media and export important text files. The server must stay running; no installed offline PWA has been added.
6. **Deployment remains pending.** Nothing was published or pushed. The loopback server enforces a same-origin CSP and injects the shared mixer/theme into all served local HTML apps. A different production host must retain these headers and this injection (or explicitly include those local resources in every child page). Do not publish the entire historical repository blindly: inactive legacy proxy/Google routes are still present on disk and must stay excluded.

## Exact future CDN changes

Keep application scripts and app pages same-origin. For music-only media migration, follow **Exact music-only CDN switch** in `LOCAL-PREVIEW.md`: upload the complete `media/` directory, change `music-local/config.js`'s `assetBase` and `allowRemoteAssets`, allow the exact origin in both page/server CSPs and shell cover validation, and enable MIME/CORS/byte ranges on the CDN. Do not change catalog IDs or recreate playlists.

For wallpaper references, add `src` (relative file path) and optionally `type: 'video'` to the corresponding entry in `neo-desktop-config.js`. Keep its stable `id`. Local files resolve through that file's `assetBase`. To move those same files to a CDN, upload with identical paths and change only `assetBase`; explicitly add the CDN origin to image/media CSP directives in `neo-os/index.html` and `local-preview.mjs`. Leave script, frame, Google and proxy integrations disabled. Restart the server and test missing files, muted autoplay, all fit options and performance modes.

Other bundled wallpaper/video/game resources have their own existing manifests. A single CDN base cannot make missing game resources or online APIs work; inventory and upload each complete asset graph before enabling its catalog entry.

Reference assets: the editor icon came from Microsoft's [official VS Code branding page](https://code.visualstudio.com/brand). Device hashing uses the browser's [Web Crypto deriveBits API](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveBits), with no downloaded crypto library.
