# NEO OS performance audit — 12 September 2026

## 1. Outcome

Published and verified an improved build. Across five-run direct-browser medians, largest-content paint improved **33.9% on desktop cold loads, 41.5% on desktop warm loads, 23.4% on mobile cold loads and 54.0% on mobile warm loads**. The release passes 32 regression suites, 27 route/viewport checks and 18 public-CDN functional checks, with the scope of each check explained below.

**The requested “faster than the reference” outcome is not achieved overall.** The reference remains faster in every direct-browser navigation condition. NEO's desktop Lighthouse score improved from 78 to 86, and mobile from 73 to 78, but these miss the requested 98/95 floors. All ten final Lighthouse runs are free of the original load-time-limit warning. The original scores retain that warning and must be interpreted cautiously. The report does not claim an instantaneous site, universally faster performance, measured field INP, or zero remaining bugs.

Cold first paint improved modestly; warm desktop first paint was effectively unchanged (+8 ms). Cold transfer increased because formerly missing fonts/media now work. Desktop cold main-thread task time also increased 4.3%. Those costs are included in the results, not hidden.

The changes preserve the desktop, device/guest gates, themes, apps, wallpaper collection and public routes. This was an incremental optimization and reliability pass, not a rewrite. The original worktree contained extensive unrelated work; it was preserved. Deployment used an isolated Site checkout rather than resetting or committing the entire development repository.

## 2. Before, after and reference results

Every row below is the median of **five** completed runs. There are 60 direct-browser runs and 30 scored Lighthouse runs in the evidence, plus four separately instrumented coverage/drag diagnostics. Neither dataset is real-user field data.

### Direct browser navigation

Times are milliseconds. The measured NEO route is the actual production `/neo-os/` desktop, not the outer CDN SVG launcher.

| Profile/cache | Site | TTFB | FCP | LCP | CLS |
|---|---|---:|---:|---:|---:|
| Desktop cold | Original | 817.8 | 2,496 | 4,352 | 0 |
| Desktop cold | Optimized | 827.7 | 2,336 | 2,876 | 0.0212 |
| Desktop cold | Reference | 285.6 | 568 | 568 | 0 |
| Desktop warm | Original | 767.4 | 2,224 | 4,068 | 0 |
| Desktop warm | Optimized | 753.4 | 2,232 | 2,380 | 0.0035 |
| Desktop warm | Reference | 171.6 | 416 | 416 | 0 |
| Mobile cold | Original | 819.3 | 3,956 | 6,068 | 0 |
| Mobile cold | Optimized | 819.3 | 3,860 | 4,648 | 0.0349 |
| Mobile cold | Reference | 260.9 | 1,408 | 1,408 | 0.0212 |
| Mobile warm | Original | 749.2 | 2,824 | 4,928 | 0 |
| Mobile warm | Optimized | 741.2 | 2,268 | 2,268 | 0 |
| Mobile warm | Reference | 172.0 | 880 | 880 | 0.0212 |

Start-screen readiness improved from 4,339→2,478 ms desktop cold, 4,061→2,369 ms desktop warm, 6,050→4,587 ms mobile cold and 4,908→2,700 ms mobile warm. The reference has no equivalent NEO device-selection gate, so that readiness marker is not compared across sites.

### Lighthouse cold navigation

**All ten original NEO runs hit the load-time limit and warn that results may be incomplete. None of the ten final optimized runs or ten reference runs has that warning.** Scores and timing models below must be read with the original-run caveat; they are not interchangeable with the direct observations above.

| Profile | Site | Performance | FCP ms | LCP ms | TBT ms | CLS | Speed Index ms |
|---|---|---:|---:|---:|---:|---:|---:|
| Desktop | Original | 78 | 783.3 | 2,181.8 | 0 | 0 | 2,990.8 |
| Desktop | Optimized | 86 | 923.7 | 1,798.2 | 0 | 0.0206 | 2,542.9 |
| Desktop | Reference | 73 | 2,109.7 | 2,764.4 | 0 | 0 | 2,109.7 |
| Mobile | Original | 73 | 2,076.0 | 4,751.9 | 64.5 | 0 | 8,412.3 |
| Mobile | Optimized | 78 | 2,060.9 | 4,334.9 | 46.8 | 0.0349 | 5,544.0 |
| Mobile | Reference | 80 | 3,489.9 | 3,980.5 | 0 | 0 | 3,489.9 |

NEO accessibility and SEO medians remain 100 on both profiles; best-practices medians remain 78 desktop / 79 mobile. Reference accessibility is 92, SEO 91 and best practices 100. No claim is made that those audits exercise every interactive app or account flow.

There is substantial run-to-run variation. Lighthouse desktop LCP ranges are original 997–4,164 ms, optimized 788–2,175 ms and reference 697–5,284 ms. Mobile ranges are original 4,587–4,776 ms, optimized 3,970–4,387 ms and reference 3,174–4,197 ms. Runs occurred sequentially at different times on the same workstation, not simultaneously on identical external server loads.

### Responsiveness and target status

The five-action laboratory maximum has before→after medians of 24→16 ms desktop cold, 24→16 ms desktop warm, 88→56 ms mobile cold and 96→64 ms mobile warm. All five actions succeeded in all five optimized runs per condition. Final before/after interaction conditions match, including the first-run screenshot setting. This is **not field INP**; it samples five specific actions rather than real users' entire visits.

CLS medians are below 0.05 and Lighthouse TBT medians below 100 ms. LCP, performance-score, first-paint, Speed Index and sub-200-ms TTFB targets remain unmet. Initial JS/CSS budgets also remain unmet. The drag diagnostic confirms correct movement and no sampled callback intervals over 50 ms, not a device-independent 60 FPS guarantee.

## 3. Reproducible conditions and scope

NEO OS is a static, client-rendered desktop built primarily with vanilla JavaScript, HTML and CSS. Its custom window manager renders native panels and embeds separate app documents in iframes; CDN documents can be loaded into `srcdoc` with preserved source metadata. There is no React/Next.js hydration phase in the shell. Node scripts use esbuild, Lightning CSS and Sharp to emit two JavaScript bundles, one stylesheet and optimized icons. The repository has no root package manifest or lockfile; these build dependencies come from the existing parent workspace. Delivery supports the static Site and commit-pinned GitHub/jsDelivr shards. Music/Cloud depend on the Render-hosted NEO API; YouTube uses Piped catalog APIs and YouTube embeds; AI uses external generation/search providers; Browser uses service workers, BareMux/libcurl and WebSocket proxy relays. Music also loads local Lucide/Meting/lyrics libraries and Google-hosted Inter. No dedicated analytics integration was found in the inspected first-party entry points; embedded third parties may still perform tracking.

- Original production: Site version 15, source `e8c81fca31fe208b9319ed225cb724002ee24214`, `/neo-os/`.
- Optimized production: Site version 20, source `aa69bcc52f83b2160815f168f43146726dfd37d4`, the same `/neo-os/` route and owner-private audience.
- Reference: `https://nextnode9124.b-cdn.net/`.
- Windows workstation, Ryzen 7 9700X, approximately 33.4 GB RAM; Chrome 152.0.7977.84; Node 24.18; Lighthouse 12.8.2.
- Lighthouse: five fresh-browser cold runs per site and profile; desktop 1440×900/DPR 1, unthrottled; mobile 390×844/DPR 2, simulated 4× CPU, 150 ms RTT and 1638.4 kbps. Lighthouse used an explicit Chrome 149 user-agent string while the executable was Chrome 152. Categories: performance, accessibility, best practices and SEO.
- Lighthouse limits were 35 seconds for load and 25 seconds for first paint. **All ten original NEO runs carried a load-time-limit / incomplete-results warning; none of the ten final optimized or ten reference runs did.** The original runs produced scores, but “scored” does not mean warning-free or complete. Direct browser observations are a separate cross-check, not a substitute silently pooled into these medians.
- Direct browser measurements: five fresh-context runs per condition; desktop 1440×900/DPR 1, unthrottled; mobile 390×844/DPR 3, actual CDP 4× CPU throttling, 150 ms minimum request-to-response-header latency, 1.6 Mbps download and 750 kbps upload. Cold means empty HTTP cache; warm uses one unmeasured visit followed by a new navigation in the same context, retaining the primed cache and naturally written state. DNS/TLS/OS caches are not cleared. Both sites use identical interception machinery. Authentication is attached only to the exact private Site origin.
- Direct navigation metrics are captured eight seconds after DOMContentLoaded, before scripted guest entry. The separately reported start-screen readiness marker is the enabled device-selection screen. Desktop-ready timestamps include the deliberate observation interval and subsequent automation; they are not page-load times.
- Scripted interactions compare layout selection, guest entry, app launcher opening, installed-app search and launcher closing. Only Event Timing entries with a nonzero interaction ID count. Unreported events remain missing, not zero. These are laboratory interaction samples, not field INP. The reference has no equivalent NEO desktop controls, so those actions are not a meaningful cross-site comparison.
- Main series ran sequentially, without other audit browsers/builds/uploads. A mistakenly overlapping preliminary warm series was discarded and repeated in full. Diagnostic coverage/trace/drag runs are separate from the five-run medians.
- Nine important routes were checked at 390×844, 768×1024 and 1440×900: root launch page, desktop, YouTube, Music v2, AI, TV, Browser, Cloud and Games. Performance medians cover the main desktop route; the other routes received functional/responsive checks, not five-run performance claims.

No WebPageTest account, CrUX field dataset, physical mobile device or Safari execution was available. There is no React hydration phase in the vanilla desktop shell; hydration cost is not applicable there. Embedded app and cross-origin frame internals are not fully represented by the top-level CDP session.

## 4. Prioritized changes and rationale

1. **Remove the artificial loading-video delay.** The decorative boot video no longer imposes a 1.4-second minimum or blocks startup on its error timeout. Startup yields across two animation-frame callbacks. Device selection, guest/account behavior and essential initialization remain intact. This was the highest-confidence startup change.
2. **Restore the complete production asset set.** The static build now carries the active fonts, icons, loading media and wallpaper resources, with explicit reference checks. Existing optimized media are reused file-by-file, not by copying stale scene scripts. Missing files had produced apparent freezes and broken visuals. Restoring a formerly missing asset can increase measured transfer bytes; it is not disguised as a byte reduction.
3. **Reduce repeated desktop work.** Window observation ignores unrelated inner-app changes and batches relevant updates into one frame. Widgets avoid assigning identical markup repeatedly, while preserving focused notes. The optional visualizer caches geometry/colors/gradients and cancels duplicate animation scheduling. These are targeted changes, not blanket memoization.
4. **Optimize startup artwork and fonts.** Seven icons use content-hashed lossless WebP; oversized Discord/YouTube sources are resized appropriately. Deliberate pixel art and original source assets remain. Two full-character-set WOFF2 fonts replace larger OTF delivery; an unnecessary font preload is removed.
5. **Improve cache correctness and packaging.** Shell bundles have content hashes; the builder also handles already bundled input correctly. The launch page no longer performs a redundant full HTML fetch before enabling its buttons. Unreferenced legacy TV-build assets are excluded from the new Site artifact to meet the host's expanded-size limit; source files and previously published CDN files remain recoverable.
6. **Fix verified reliability/responsiveness regressions.** Rain texture loading has a bounded failure path and static fallback. Music search fits narrow screens. YouTube history navigation works in `about:srcdoc` without a forbidden URL rewrite or duplicate Back-stack entries. Current TV controls gain touch sizing, safe-area handling and a Safari picture-in-picture fallback; Safari execution remains unverified.
7. **Retire completed health probes.** The server check uses only response headers to determine reachability, but previously left unread response bodies open after clearing its timeout. It now aborts its own request after saving the result. This releases unused streams without changing readiness or latency arithmetic. Controlled streaming-response tests exercise success, authentication/error statuses and timeout behavior; this is resource cleanup, not a delay introduced to influence Lighthouse.

No framework migration, speculative worker, bulk CSS purge, account-gate removal or delayed essential feature was used to improve a score. Startup coverage alone is not evidence that theme/app CSS can be safely deleted. The games catalog and heavy apps remain demand-loaded using the existing architecture.

## 5. Bundles, assets and requests

The original live deployment already used three shell bundles. The build's “55 source files → 3 bundles” statistic is not a new improvement from this audit.

| Static asset group | Before bytes | After bytes | Change |
|---|---:|---:|---:|
| Three shell bundles, uncompressed | 1,036,413 | 1,043,195 | +0.65% |
| Seven startup icons | 173,756 | 58,032 | −66.6% |
| Two font files | 37,500 | 23,276 | −37.9% |

The Site archive is 200,136,755 bytes compressed, with a conservative expanded-archive bound of 265,603,953 bytes (253.30 MiB), below the host's 256 MiB limit. These are deployment-package sizes, not initial page transfers. Excluding 12,956,420 bytes of unused old TV assets did not remove 13 MB from startup, because the current entry point did not request those files.

| Profile/cache | Requests before→after | Transfer KiB before→after | CDP task time ms before→after | Layout/style ms before→after |
|---|---:|---:|---:|---:|
| Desktop cold | 39→40 | 476.12→769.84 | 274.36→286.24 | 126.31→118.56 |
| Desktop warm | 38→39 | 22.75→22.15 | 261.51→195.43 | 99.65→67.63 |
| Mobile cold | 39→40 | 476.59→769.93 | 1,527.35→1,466.94 | 647.53→623.26 |
| Mobile warm | 38→39 | 23.00→22.38 | 970.52→754.38 | 411.72→290.64 |

Cold transfer increased approximately 61.7% desktop / 61.6% mobile, principally because missing font/media requests now succeed. HTTP-error request medians fell from six to one; the remaining median error is an anonymous external authentication response. Warm cache avoids most body transfers but does not eliminate the private HTML response latency. Direct reference transfers are 1,358.10/226.64 KiB desktop cold/warm and 530.51/829.16 KiB mobile cold/warm. These reflect the fixed observation window and dynamic resource loading, not universal total application sizes. **CDP encoded-byte totals can undercount unfinished requests: the reference's mobile video remains pending in all five cold snapshots. Its recorded zero encoded bytes does not mean it downloaded nothing; median decoded video bytes already received are 684,000.**

Cold initial CDP encoded-transfer medians, in bytes:

| Profile/site | JavaScript | CSS | Images | Fonts | Media |
|---|---:|---:|---:|---:|---:|
| Desktop original | 154,184 | 87,224 | 182,565 | 37,738 | 33 (HTTP 404 response) |
| Desktop optimized | 158,355 | 87,307 | 67,558 | 311,495 | 139,007 |
| Desktop reference | 86,739 | 19,745 | 46,822 | 177,188 | 843,377 |
| Mobile original | 154,324 | 87,224 | 182,569 | 37,753 | 33 (HTTP 404 response) |
| Mobile optimized | 158,188 | 87,307 | 67,580 | 311,472 | 139,016 |
| Mobile reference | 86,739 | 20,048 | 46,822 | 177,589 | pending / incomplete |

Independent category medians need not sum to the total median. Images fell approximately 63%; the restored fonts/media outweigh that saving in total cold transfer. The optimized initial JavaScript is about 154.5–154.6 KiB and CSS 85.3 KiB under this accounting, above the requested 100/30 KB budgets. Raw file sizes, CDP wire accounting and Lighthouse byte-weight estimates are different quantities. The reference's mobile cold GIF is also pending at the cutoff, so its image total undercounts alongside its media total.

Main-thread results depend on measurement scope: the direct CDP observation improved in three conditions, while desktop cold task time rose 4.3%. Lighthouse trace-work medians fell 378.92→323.08 ms desktop and 1,286.89→1,194.62 ms mobile. Those distinct windows are not pooled. Direct long-task counts stayed at 1/0/2/2 (desktop cold/warm, mobile cold/warm); the mobile blocking-sum diagnostic dropped 467→423 ms cold and 310→243 ms warm, while desktop cold rose 4→12 ms. That sum is not Lighthouse TBT.

Coverage across startup and the scripted interaction sequence changed from 25.11%→25.02% of named JavaScript source characters and 16.77%→16.75% of named CSS characters. Lighthouse separately estimates 99.86/103.64 KiB unused JS and 59.61/64.02 KiB unused CSS after the change (desktop/mobile). These limited-route estimates are not proof that rarely opened apps/themes are dead code. The shell stylesheet remains a render-blocking dependency. Safe future splitting needs per-feature/style-state coverage and visual testing; a startup-only purge would risk breaking the desktop.

## 6. Material files changed

Paths below are relative to this repository.

| File/group | Purpose |
|---|---|
| `neo-os/neo-os.js` | Boot readiness without artificial video wait |
| `neo-os/neo-window-resize.js` | Filter/coalesce window observation |
| `neo-os/neo-skins.js` | Skip unchanged widget markup, retain error invalidation |
| `neo-os/neo-bottom-visualizer.js` | Cache paint inputs and own a single animation loop |
| `neo-os/neo-connection-monitor.js` | Close unused server-check response bodies after recording results |
| `index.html` | Enable launch controls without redundant document download |
| `neo-os/neo-os.css`, `neo-os/neo-fonts.css`, `neo-os/index.html`, `neo-os/assets/fonts/*.woff2` | WOFF2 delivery and preload correction |
| Rain wallpaper `1403160205/js/index.js` and generated `index.min.js` | Texture error/timeout cleanup and fallback |
| Browser Font Awesome vendor CSS | Remove references to ten absent TTF fallbacks; retain WOFF2 |
| `neo-os/neo-tv/index.html`, `app.js`, `app.css` | Touch/safe-area/PiP compatibility |
| `neo-os/music-v2/neo-meting-theme.css` | Narrow-screen search layout |
| `neo-os/neo-youtube/app.js` | Embedded-document history and Back/Forward fix |
| `scripts/optimize-neo-shell.cjs`, `optimize-desktop-assets.cjs` | Hashed bundles and lossless startup icons |
| `scripts/build-sites-static.cjs`, `check-static-assets.cjs` | Reproducible complete static output, size guard and active-asset validation |
| `scripts/build-github-cdn-shards.cjs`, `publish-performance-cdn.cjs` | Optimized CDN shards and isolated verified publishing |
| Targeted tests and regression runner | Behavioral checks and current-source assertions |

Generated deployment differences include prior user work that was already present locally but absent from the older live build. They must not all be attributed to new performance work in this audit.

## 7. Verification and publishing

- Syntax checks passed for 15 changed JavaScript, build and test entries; scoped whitespace checks passed. There is no repository-root TypeScript or formatter command, so no repository-wide TypeScript/formatter result is claimed.
- 32/32 regression suites passed, including 34 focused checks across boot readiness, window observation, widget rendering and visualizer caching. The equalizer test checks immediate restart after revealing unchanged cached content, without replacing its DOM or duplicating the animation loop.
- The health-probe cleanup passed 21 controlled checks, including real Chrome requests to a loopback server that deliberately never ends its response. Streaming 200/401/503 requests close promptly with cleanup and remain open without it; reachability, latency arithmetic and no-headers timeout behavior are preserved. Opaque/error responses and idempotent cancellation are covered by the VM cases. The fast suite also passes against the exact packaged function.
- Browser checks passed for YouTube client routing, Shorts, theme/responsiveness and retained-player pop-out behavior. The `srcdoc` regression exercises search → watch → Back → Forward without changing the embedded document URL. Catalog/player fixtures verify client behavior, not upstream media availability.
- Real window dragging, wallpaper pause/resume/freeze recovery and custom-cursor checks passed. The freeze test's observation race was corrected; a sampled state is now captured at the transition event.
- 27/27 route/viewport checks passed with no owned static failures, page errors or horizontal overflow. These full route checks exercised version 19; version 20 changes only health-probe cleanup, covered by the controlled tests, all 20 final browser observations and the final 18-check CDN run. External failures are listed below.
- Active HTML/CSS/wallpaper reference validation: 248 references, zero missing. This is not a proof of every dynamic/API URL in the repository.
- Public CDN test: 18/18 checks passed, including actual nested desktop, three loaded hashed bundles, decoded/advancing rain wallpaper, embedded YouTube/Music, Settings and absence of page/owned-asset errors. A separate 51-URL sample validated CDN wallpaper resources and a launch document.
- Production build and packaged archive validation passed. The normal archive-upload bridge repeatedly failed; the final version uses the native source-only remote-build fallback from the exact pushed commit. The validated local archive was retained. A previous oversize deployment failed before the unused legacy TV build was excluded; it was not reported as a successful release.

Sites publishing retained the existing owner-private audience. The GitHub/jsDelivr launcher remains on its existing public-code distribution path. A commit-pinned URL is immutable; an old SHA cannot be updated in place.

Verified releases: [existing Site URL](https://neo-os-desktop-20260907.c21burroughs.chatgpt.site/) and [new CDN launcher](https://fastly.jsdelivr.net/gh/unblockedgames99x-code/neo-os-launch-cdn@5e01b44484b5054097cc2dcb7ab5e3e8cd1a1f13/launch.svg). The final Site deployment is `appgdep_6aa4c3dd3e2c8191b28f7bf96ffaa4fa`, with native status **succeeded**. Source and artifact hashes are not inferred from abbreviated commits.

## 8. Remaining bottlenecks and limits

The largest remaining navigation bottlenecks are delivery latency, the still-large shell stylesheet and restored font transfers. Optimized direct TTFB medians are 741–828 ms, compared with 172–286 ms on the public reference. The actual Lighthouse LCP element remains `main#neo-desktop > div.wallpaper > div.wallpaper-logo > img` (`neo-logo.svg`, 340×324 rendered desktop bounds), with existing eager loading and high fetch priority. The reference's LCP is its desktop clock, so the two sites are not painting equivalent content.

In optimized desktop run 3 (the median-LCP run), modeled LCP consists of 838 ms TTFB, 145 ms resource-load delay, 479 ms resource-load duration and 337 ms render delay. Mobile run 4 consists of 1,282/1,055/762/1,236 ms respectively. These individual breakdowns are illustrative, not separately calculated five-run phase medians. The longest trace-based dependency-chain medians remain 3,360 ms desktop / 3,272 ms mobile. Lighthouse estimates render-blocking FCP savings of 0/500 ms, not a proven implementation gain.

All 20 final direct-browser runs have zero pending requests at the observation cutoff, zero page exceptions, zero owned HTTP errors and zero uncanceled network failures. The server-reachability request now terminates after its headers are consumed, instead of keeping an unused response open. The normal anonymous authentication response remains 401; one mobile cold run contains a second normal probe cycle, so its console records two such responses.

External authentication requests can return anonymous 401 responses. Four sampled game-cover URLs on `noahstutoring.academy` returned 404 (nine occurrences across viewports). Third-party Music, AI, proxy and YouTube services remain independently subject to downtime, quotas, authentication and embedding restrictions. Functional fixtures are not evidence that every remote song/video or all 3,978 games works. End-to-end account login, chat/AI submission, cloud writes, prolonged sessions and existing-user service-worker/cache migration were not verified.

An optional legacy wallpaper (1509243786) still contains HTTP Google Fonts and Weatherstack URLs, which are mixed-content risks under HTTPS if those modes are exercised; these were not observed as failures in the tested default scene. The old HTTP HTML5 shim in the rain scene is IE-conditional and was not an active Chrome request. A client-side Cloud credential is necessarily public client configuration, not a confidential server secret; no value is included in this report.

The three restored SF font files total 287,392 bytes and serve six CSS faces (two family aliases, three weights). They remain unchanged. Latin-first subsets might reduce English-startup transfer, but need validated character/shaping coverage and appropriate font permissions; neither the byte savings nor the resulting speedup was tested. An ASCII-only subset or a simple second `src` URL would not preserve correct missing-glyph fallback. The original files' presence is not a promise of universal Unicode coverage.

## 9. Infrastructure settings outside this source patch

Post-benchmark GET/header checks on the final releases confirmed the following. This is a delivery inspection, not another performance benchmark or a complete security audit.

| Delivery path | Observed behavior | Remaining host action |
|---|---|---|
| Commit-pinned public CDN | Brotli for launcher/JS/CSS; one-year public immutable caching; `Vary: Accept-Encoding`; public CORS; correct font/video MIME; video range request returned 206 and the correct `Content-Range` | Already present for sampled files; no provider change was made |
| Private Site | Gzip for HTML/JS/CSS; `public, max-age=0, must-revalidate` on sampled authorized static responses; no `Vary` or `Accept-Ranges` advertised; WOFF2 served as `application/octet-stream`; video range request returned 200 without `Content-Range` | Review private-response cache policy, compression negotiation and MIME at the host; support media ranges; retain authorization on every private request |

The private gate rejected the initial probe's unsupported authentication header with 401 and `no-store`; the supported exact-origin header returned 200. This is not evidence that the successful response's `public` cache directive bypasses the gate. It does warrant checking intermediary cache/auth behavior before changing cache lifetimes. No private route was made public during this work.

- Retain private/authenticated HTML access. Do not put personalized HTML, account responses or authenticated APIs into shared public caches.
- For already-public, content-hashed static assets, use `Cache-Control: public, max-age=31536000, immutable`; keep HTML revalidated so it discovers new hashes. Content hashing alone cannot change a hosting provider's response policy.
- Enable Brotli for compressible JS/CSS/HTML/SVG at the host/CDN where supported, with gzip fallback and `Vary: Accept-Encoding`. Already compressed images/video should not be recompressed.
- Configure WOFF2 as `font/woff2` and media range requests as 206 with a valid `Content-Range` on the Site host; the sampled CDN already provides these. The Site sample ignored `Range: bytes=0-1023`, which can undermine efficient seeking for larger media. Avoid unnecessary third-party preconnects and blanket preloading.
- Lowering the measured private-origin response latency requires host/edge investigation. Client JavaScript cannot eliminate time already spent waiting for the document's first byte. Without server-side traces, the latency cannot be attributed specifically to authentication versus routing, storage or network distance. Any public-shell/private-API redesign needs a deliberate access/security decision and was not silently applied here.
- External search/playback reliability requires a supported healthy backend and appropriate authorization. No paid service was purchased and no account or payment boundary was bypassed.

## 10. Evidence and interpretation

The evidence supports faster NEO navigation versus the original, **not a universally faster site than the reference**. The final desktop Lighthouse model favors NEO (86 versus 73 performance score; 1,798 versus 2,764 ms LCP). Mobile Lighthouse and all directly observed desktop/mobile cold/warm navigation tests favor the reference. Both facts are reported.

The single before/after drag traces recorded the requested 220×140 px movement, rAF p50/p95 2.8/2.9 ms on both builds, zero sampled intervals above 50 ms, and CDP task time 212.27→191.41 ms. Style time was 69.66→67.78 ms and layout increased 0.96→6.59 ms. These traced single runs include automation overhead and do not establish a five-run FPS improvement or physical display refresh rate.

Sanitized evidence: [complete result tables](performance-evidence-2026-09-12-final/summary.md), [conditions and medians](performance-evidence-2026-09-12-final/summary.json), [60 direct-browser runs](performance-evidence-2026-09-12-final/browser-runs.json), [30 Lighthouse runs](performance-evidence-2026-09-12-final/lighthouse-runs.json), [coverage and drag diagnostics](performance-evidence-2026-09-12-final/diagnostics.json), [timeline summaries](performance-evidence-2026-09-12-final/timeline-summary.json), [reconstruction instructions](performance-evidence-2026-09-12-final/README.md), and [SHA-256 manifest](performance-evidence-2026-09-12-final/manifest.json).

The separate [delivery-header evidence](performance-delivery-headers-2026-09-12.json) records only an explicit safe header allowlist, public URLs, request ranges and response statuses. It is a post-benchmark check, not part of the 90-run metric dataset.

Compatibility was reviewed by measurement phase: all four final before/after conditions match for both initial navigation and subsequent interaction settings, including the first-run screenshot setting. Intermediate version-19 runs were archived separately and are not pooled into final medians. Raw authenticated diagnostic logs stay private; the benchmark export excludes credentials, response headers, source snippets, bodies and raw trace payloads. The separate delivery check exposes only the safe header allowlist described above. The original baseline artifacts and discarded/intermediate attempts are retained, not silently overwritten or cherry-picked.
