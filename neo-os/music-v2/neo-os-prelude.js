(function () {
    "use strict";

    window.__NEO_MUSIC__ = true;

    // Chrome and ChromeOS reject media playback until the document receives a
    // real user gesture. Keep one gate for the whole player and retry only the
    // media element whose play request was blocked.
    if (!window.__neoMusicAudioGate && window.HTMLMediaElement) {
        var nativeMediaPlay = window.HTMLMediaElement.prototype.play;
        var pendingMedia = new Set();
        var registeredContexts = new Set();

        function resumeAudio() {
            registeredContexts.forEach(function (context) {
                if (!context || context.state !== "suspended") return;
                try { context.resume().catch(function () {}); } catch (error) {}
            });
            pendingMedia.forEach(function (media) {
                pendingMedia.delete(media);
                if (!media || !media.isConnected || !media.currentSrc && !media.src) return;
                try { nativeMediaPlay.call(media).catch(function (error) {
                    if (error && error.name === "NotAllowedError") pendingMedia.add(media);
                }); } catch (error) {}
            });
        }

        window.HTMLMediaElement.prototype.play = function () {
            var media = this;
            var result;
            try {
                result = nativeMediaPlay.call(media);
            } catch (error) {
                if (error && error.name === "NotAllowedError") pendingMedia.add(media);
                throw error;
            }
            if (result && typeof result.catch === "function") {
                result.catch(function (error) {
                    if (error && error.name === "NotAllowedError") pendingMedia.add(media);
                });
            }
            return result;
        };

        ["pointerdown", "touchend", "keydown"].forEach(function (eventName) {
            document.addEventListener(eventName, resumeAudio, { capture: true, passive: true });
        });
        window.addEventListener("pagehide", function () {
            pendingMedia.clear();
            registeredContexts.clear();
        }, { once: true });
        window.__neoMusicAudioGate = Object.freeze({
            registerContext: function (context) {
                if (context) registeredContexts.add(context);
            },
            request: function (media) {
                if (media) pendingMedia.add(media);
            },
            resume: resumeAudio
        });
    }

    // A service worker scoped to a shared CDN host can retain stale app files
    // and trigger a second module download. Immutable jsDelivr files already
    // provide caching, so the embedded runner intentionally skips PWA setup.
    if (document.querySelector('meta[name="neo-runner"]') && navigator.serviceWorker) {
        try {
            navigator.serviceWorker.register = function () {
                return Promise.reject(new DOMException("The CDN runner uses immutable HTTP caching.", "NotSupportedError"));
            };
        } catch (error) {}
    }

    // The copied upstream bundle attempts to redefine Chrome's non-configurable
    // navigator.userAgent property at module evaluation time. That exception
    // aborts the whole application before search handlers are installed. Ignore
    // only that obsolete spoof while forwarding every other property definition.
    var nativeDefineProperty = Object.defineProperty;
    var guardedDefineProperty = function (target, property, descriptor) {
        if (target === navigator && property === "userAgent") return target;
        return nativeDefineProperty(target, property, descriptor);
    };
    Object.defineProperty = guardedDefineProperty;
    window.addEventListener("load", function () {
        if (Object.defineProperty === guardedDefineProperty) Object.defineProperty = nativeDefineProperty;
    }, { once: true });

    // This self-hosted build does not receive Monochrome's deployment-time
    // instance feed. Seed the bundled client's existing cache with the same
    // API endpoint it already uses as its final fallback, for both discovery
    // and playback. Without the streaming entry, search can appear to work
    // while selecting a result still produces an empty player.
    try {
        localStorage.setItem("monochrome-api-instances-v9", JSON.stringify({
            timestamp: Date.now(),
            data: {
                api: [{ url: "https://lol.samidy.workers.dev", version: "2.10" }],
                streaming: [{ url: "https://lol.samidy.workers.dev", version: "2.10" }]
            }
        }));
    } catch (error) {}

    // Repair sessions left at an unintended slow playback rate. Run once so
    // the app's speed control remains available after the reset.
    try {
        var playbackRateRepairKey = "neo_music_playback_rate_repair_v1";
        if (localStorage.getItem(playbackRateRepairKey) !== "1") {
            localStorage.setItem("audio-effects-speed", "1");
            localStorage.setItem(playbackRateRepairKey, "1");
        }
    } catch (error) {}

    var launchUrl = new URL(window.location.href);
    var isCdnRunner = Boolean(document.querySelector('meta[name="neo-runner"]'));
    var nativeAddEventListener = window.EventTarget && window.EventTarget.prototype.addEventListener;
    var nativeDispatchEvent = window.EventTarget && window.EventTarget.prototype.dispatchEvent;
    var nativePreventDefault = window.Event && window.Event.prototype.preventDefault;
    var nativeStopPropagation = window.Event && window.Event.prototype.stopPropagation;
    var nativeClosest = window.Element && window.Element.prototype.closest;
    var nativePushState = window.History && window.History.prototype.pushState;
    var nativeReplaceState = window.History && window.History.prototype.replaceState;
    var nativeXhrOpen = window.XMLHttpRequest && window.XMLHttpRequest.prototype.open;
    var NativePopStateEvent = window.PopStateEvent;
    var historyTarget = window.history;
    var windowTarget = window;
    var appBaseUrl = new URL("./", document.currentScript.src);
    var appPath = appBaseUrl.pathname.replace(/\/$/, "");
    var baseElement = document.querySelector("base");
    var physicalLaunchPath = window.location.pathname + window.location.search;
    var virtualRouteMode = /\/__neo_app__\/?$/.test(window.location.pathname);
    var virtualPathname = "/";
    var virtualSearch = "";
    var virtualHash = "";

    function defineRouteAlias(name, getter) {
        try {
            nativeDefineProperty(window, name, { configurable: true, get: getter });
        } catch (error) {}
    }

    function syncVirtualRoute(state) {
        if (!state || typeof state !== "object") return;
        if (typeof state.neoMusicPath === "string") virtualPathname = state.neoMusicPath || "/";
        if (typeof state.neoMusicSearch === "string") virtualSearch = state.neoMusicSearch;
        if (typeof state.neoMusicHash === "string") virtualHash = state.neoMusicHash;
    }

    defineRouteAlias("__NEO_MUSIC_PATHNAME__", function () {
        return virtualRouteMode ? virtualPathname : window.location.pathname;
    });
    defineRouteAlias("__NEO_MUSIC_SEARCH__", function () {
        return virtualRouteMode ? virtualSearch : window.location.search;
    });
    defineRouteAlias("__NEO_MUSIC_HASH__", function () {
        return virtualRouteMode ? virtualHash : window.location.hash;
    });

    if (virtualRouteMode && nativePushState && nativeReplaceState) {
        function virtualHistoryCall(method, state, title, url) {
            if (url === undefined || url === null) return method.call(historyTarget, state, title);
            var destination;
            try {
                destination = new URL(String(url), window.location.origin + virtualPathname + virtualSearch + virtualHash);
            } catch (error) {
                return method.call(historyTarget, state, title, physicalLaunchPath);
            }
            if (destination.origin !== window.location.origin) return method.call(historyTarget, state, title, url);
            virtualPathname = destination.pathname || "/";
            virtualSearch = destination.search || "";
            virtualHash = destination.hash || "";
            var nextState = {};
            if (state && typeof state === "object") {
                Object.keys(state).forEach(function (key) { nextState[key] = state[key]; });
            } else if (state !== undefined) {
                nextState.neoMusicOriginalState = state;
            }
            nextState.neoMusicPath = virtualPathname;
            nextState.neoMusicSearch = virtualSearch;
            nextState.neoMusicHash = virtualHash;
            return method.call(historyTarget, nextState, title, physicalLaunchPath);
        }

        window.History.prototype.pushState = function (state, title, url) {
            return virtualHistoryCall(nativePushState, state, title, url);
        };
        window.History.prototype.replaceState = function (state, title, url) {
            return virtualHistoryCall(nativeReplaceState, state, title, url);
        };
        syncVirtualRoute(window.history.state);
        window.history.replaceState(window.history.state || { neoMusic: true }, "", virtualPathname);
        if (nativeAddEventListener) {
            nativeAddEventListener.call(window, "popstate", function (event) {
                syncVirtualRoute(event.state);
            }, true);
        }
    }

    if (baseElement) baseElement.href = appBaseUrl.href;
    window.__NEO_MUSIC_BASE__ = appPath;

    // The supplied router expects to own paths such as /, /search, and /library.
    // Keep its assets anchored to the copied app while exposing that expected route.
    if (window.location.origin !== "null" && window.location.pathname !== "/") {
        try {
            window.history.replaceState({ neoMusic: true }, "", "/");
        } catch (error) {
            // srcdoc and opaque runner frames cannot rewrite their parent origin.
        }
    }

    // The supplied compatibility bundle removes several DOM prototype methods
    // after startup. Capture them early so in-app route links keep working.
    if (nativeAddEventListener && nativeDispatchEvent && nativePushState && NativePopStateEvent) {
        nativeAddEventListener.call(document, "click", function (event) {
            var target = event.target;
            var link = nativeClosest && target ? nativeClosest.call(target, "a") : null;
            if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

            var href = link.getAttribute("href");
            if (!href || href.charAt(0) === "#") return;

            var destination;
            try {
                destination = new URL(href, windowTarget.location.href);
            } catch (error) {
                return;
            }

            if (destination.origin !== launchUrl.origin) return;
            if (/\.[a-z0-9]{2,8}$/i.test(destination.pathname)) return;

            if (nativePreventDefault) nativePreventDefault.call(event);
            if (nativeStopPropagation) nativeStopPropagation.call(event);
            historyTarget.pushState(
                { neoMusic: true },
                "",
                destination.pathname + destination.search + destination.hash
            );
            nativeDispatchEvent.call(windowTarget, new NativePopStateEvent("popstate"));
        }, true);
    }

    var baseUrl = appBaseUrl;
    var originalFetch = window.fetch.bind(window);
    var fullSongProvider = "https://vcsa.huangqirui.xyz";
    var fullSongLookups = new Map();

    function isMonochromeApiRequest(input) {
        var value = typeof input === "string" ? input : input && input.url;
        try { return new URL(value, launchUrl.href).hostname === "lol.samidy.workers.dev"; } catch (error) { return false; }
    }

    function resilientMusicFetch(input, init, attempt) {
        var retry = Number(attempt) || 0;
        return originalFetch(input, init).then(function (response) {
            if ([502, 503, 520, 521, 522, 523, 524].indexOf(response.status) === -1 || retry >= 2) return response;
            var signal = init && init.signal || (typeof Request !== "undefined" && input instanceof Request ? input.signal : null);
            if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
            return new Promise(function (resolve, reject) {
                function finish() {
                    if (signal) signal.removeEventListener("abort", abort);
                    resolve();
                }
                function abort() {
                    window.clearTimeout(timer);
                    if (signal) signal.removeEventListener("abort", abort);
                    reject(new DOMException("Aborted", "AbortError"));
                }
                var timer = window.setTimeout(finish, retry ? 700 : 250);
                if (signal) signal.addEventListener("abort", abort, { once: true });
            }).then(function () { return resilientMusicFetch(input, init, retry + 1); });
        });
    }

    function normalizedWords(value) {
        return String(value || "")
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/&/g, " and ")
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    function wordSimilarity(left, right) {
        var leftWords = new Set(normalizedWords(left).split(" ").filter(Boolean));
        var rightWords = new Set(normalizedWords(right).split(" ").filter(Boolean));
        if (!leftWords.size || !rightWords.size) return 0;
        var shared = 0;
        leftWords.forEach(function (word) { if (rightWords.has(word)) shared += 1; });
        return shared / Math.max(leftWords.size, rightWords.size);
    }

    function plainText(element) {
        if (!element) return "";
        var copy = element.cloneNode(true);
        Array.from(copy.querySelectorAll(".quality-badge, [class*='quality-badge']")).forEach(function (badge) {
            badge.remove();
        });
        return String(copy.textContent || "").replace(/\s+/g, " ").trim();
    }

    function metadataForTrackId(trackId) {
        var row = null;
        try {
            var escaped = window.CSS && typeof window.CSS.escape === "function"
                ? window.CSS.escape(String(trackId))
                : String(trackId).replace(/["\\]/g, "\\$&");
            row = document.querySelector('[data-track-id="' + escaped + '"]');
        } catch (error) {}

        var title = plainText(row && row.querySelector(".title, .track-title"));
        var artist = plainText(row && row.querySelector(".artist, .track-artist"));
        artist = artist.replace(/\s*[•·]\s*(?:19|20)\d{2}.*$/, "").replace(/\s*[•·]\s*Requested By.*$/i, "").trim();

        if (!title) {
            try {
                var mediaMetadata = navigator.mediaSession && navigator.mediaSession.metadata;
                title = String(mediaMetadata && mediaMetadata.title || "").trim();
                artist = artist || String(mediaMetadata && mediaMetadata.artist || "").trim();
            } catch (error) {}
        }

        if (!title) {
            title = plainText(document.querySelector(".now-playing-bar .title"));
            artist = artist || plainText(document.querySelector(".now-playing-bar .artist"));
        }
        return title ? { title: title, artist: artist } : null;
    }

    function playableFullSong(track) {
        if (!track || !track.src || Number(track.duration) < 45) return false;
        try {
            var stream = new URL(track.src, fullSongProvider);
            return stream.hostname === "vcsa.huangqirui.xyz" && /^\/api\/yt\/astream\/[A-Za-z0-9_-]+$/.test(stream.pathname);
        } catch (error) {
            return false;
        }
    }

    function proxiedFullSongUrl(track) {
        var upstream = new URL(track.src, fullSongProvider);
        var trackId = upstream.pathname.split("/").filter(Boolean).pop();
        var proxy = new URL("/.netlify/functions/neo-music-stream", launchUrl.origin);
        proxy.searchParams.set("id", trackId);
        return proxy.href;
    }

    function chooseFullSong(tracks, metadata) {
        var wantedTitle = normalizedWords(metadata.title);
        var wantedArtist = normalizedWords(metadata.artist);
        var ranked = (Array.isArray(tracks) ? tracks : []).filter(playableFullSong).map(function (track) {
            var title = normalizedWords(track.title);
            var artist = normalizedWords(track.artist);
            var score = title === wantedTitle ? 120 : wordSimilarity(title, wantedTitle) * 90;
            if (wantedArtist) score += artist === wantedArtist ? 45 : wordSimilarity(artist, wantedArtist) * 35;
            return { track: track, score: score };
        }).sort(function (left, right) { return right.score - left.score; });
        return ranked.length && ranked[0].score >= 72 ? ranked[0].track : null;
    }

    function fullSongSearch(query, init) {
        var endpoint = new URL("/.netlify/functions/neo-music-search", launchUrl.origin);
        endpoint.searchParams.set("q", query);
        return originalFetch(endpoint.href, {
            cache: "no-store",
            signal: init && init.signal
        }).then(function (response) {
            if (!response.ok) throw new Error("Full-song search returned HTTP " + response.status + ".");
            return response.json();
        });
    }

    function toNeoFullTrack(track) {
        var stream = proxiedFullSongUrl(track);
        var artist = String(track.artist || "Unknown Artist").trim();
        var title = String(track.title || "Unknown Track").trim();
        return {
            id: "neo-full-" + String(track.id || stream.split("/").pop()),
            title: title,
            duration: Number(track.duration) || 0,
            type: "track",
            provider: "neo-full",
            audioUrl: stream,
            audioQuality: "HIGH",
            allowStreaming: true,
            streamReady: true,
            isUnavailable: false,
            artist: { id: null, name: artist },
            artists: [{ id: null, name: artist }],
            album: {
                id: null,
                title: title,
                cover: String(track.artwork || ""),
                releaseDate: ""
            }
        };
    }

    function fallbackCombinedSearch(query, init) {
        return fullSongSearch(query, init).then(function (payload) {
            var tracks = (payload.tracks || []).filter(playableFullSong).map(toNeoFullTrack);
            var section = { items: tracks, limit: tracks.length, offset: 0, totalNumberOfItems: tracks.length };
            var empty = { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
            return new Response(JSON.stringify({
                tracks: section,
                artists: empty,
                albums: empty,
                playlists: empty,
                videos: empty
            }), {
                status: 200,
                headers: { "content-type": "application/json; charset=utf-8" }
            });
        });
    }

    // The bundled search page asks the HiFi API for every result category at
    // once. This provider does not expose that combined route, so the bundle
    // falls back to five parallel requests and waits for the slow video search
    // before it renders even the first track. Ask for tracks directly and wrap
    // that response in the combined shape the existing UI already understands.
    // Artists and albums are derived from those tracks by the bundled renderer,
    // so the useful result views no longer wait on unrelated video requests.
    function fastCombinedSearch(input, init) {
        var requestUrl = typeof input === "string" ? input : input && input.url;
        var parsed;
        try {
            parsed = new URL(requestUrl, launchUrl.href);
        } catch (error) {
            return null;
        }

        if (!/\/search\/?$/.test(parsed.pathname) || !parsed.searchParams.has("q") || parsed.searchParams.has("s")) {
            return null;
        }

        var query = parsed.searchParams.get("q");
        if (!query) return null;

        parsed.searchParams.delete("q");
        parsed.searchParams.set("s", query);

        return resilientMusicFetch(parsed.href, init).then(function (response) {
            if (!response.ok || typeof Response === "undefined") return fallbackCombinedSearch(query, init);
            return response.clone().json().then(function (payload) {
                var tracks = payload && payload.data ? payload.data : payload;
                var empty = { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
                var headers = new Headers(response.headers);
                headers.set("content-type", "application/json; charset=utf-8");
                headers.delete("content-length");
                headers.delete("content-encoding");
                return new Response(JSON.stringify({
                    tracks: tracks,
                    artists: empty,
                    albums: empty,
                    playlists: empty,
                    videos: empty
                }), {
                    status: response.status,
                    statusText: response.statusText,
                    headers: headers
                });
            }).catch(function () {
                return fallbackCombinedSearch(query, init);
            });
        }).catch(function () {
            return fallbackCombinedSearch(query, init);
        });
    }

    if (nativeXhrOpen) {
        window.XMLHttpRequest.prototype.open = function (method, url) {
            var nextUrl = url;
            try {
                if (new URL(url, launchUrl.href).hostname === "api.music.apple.com") {
                    nextUrl = new URL("./playback-compatible-search", appBaseUrl).href;
                }
            } catch (error) {}
            var args = Array.prototype.slice.call(arguments);
            args[1] = nextUrl;
            return nativeXhrOpen.apply(this, args);
        };
    }
    var localPrefixes = [
        "/assets/",
        "/editors-picks-images/",
        "/editors-picks-old/",
        "/fonts/",
        "/lib/"
    ];
    var localFiles = [
        "/editors-picks.json",
        "/instances.json",
        "/manifest.json",
        "/neo-logo.png"
    ];

    function localAssetUrl(value) {
        var text = typeof value === "string" ? value : value && value.url;
        if (!text) return null;
        var parsed;
        try {
            parsed = new URL(text, launchUrl.href);
        } catch (error) {
            return null;
        }
        if ((parsed.origin !== launchUrl.origin && parsed.origin !== appBaseUrl.origin) || parsed.pathname.indexOf(appPath + "/") === 0) return null;
        var path = parsed.pathname;
        var isLocal = localFiles.indexOf(path) !== -1 || localPrefixes.some(function (prefix) {
            return path.indexOf(prefix) === 0;
        });
        if (!isLocal) return null;
        return new URL(path.replace(/^\/+/, "") + parsed.search + parsed.hash, baseUrl).href;
    }

    // The legacy HiFi /track endpoint currently resolves to a short preview
    // while presenting it as the requested lossless stream. Resolve the same
    // title through NEO's full-song provider and return the response shape the
    // bundled player already understands. The track-id lookup also covers
    // queued/preloaded songs, so playback never borrows the current row's audio.
    function isPreviewOnlyHiFiStream(input) {
        var value = typeof input === "string" ? input : input && input.url;
        if (!value) return false;
        try {
            var parsed = new URL(value, launchUrl.href);
            return parsed.hostname === "lol.samidy.workers.dev" &&
                /\/track\/?$/.test(parsed.pathname) &&
                parsed.searchParams.has("quality");
        } catch (error) {
            return false;
        }
    }

    function fullSongResponse(input, init) {
        var requestUrl = typeof input === "string" ? input : input && input.url;
        var parsed = new URL(requestUrl, launchUrl.href);
        var trackId = parsed.searchParams.get("id") || "";
        if (fullSongLookups.has(trackId)) return fullSongLookups.get(trackId);

        var lookup = Promise.resolve().then(function () {
            var metadata = metadataForTrackId(trackId);
            if (!metadata) throw new Error("The selected track metadata is unavailable.");
            return fullSongSearch([metadata.title, metadata.artist].filter(Boolean).join(" "), init).then(function (payload) {
                var match = chooseFullSong(payload.tracks, metadata);
                if (!match) throw new Error("No matching full song was found.");
                var stream = proxiedFullSongUrl(match);
                return new Response(JSON.stringify({
                    data: {
                        OriginalTrackUrl: stream,
                        manifestMimeType: "audio/mp4",
                        audioQuality: "HIGH",
                        duration: Number(match.duration) || 0,
                        trackReplayGain: 0,
                        trackPeakAmplitude: 1,
                        albumReplayGain: 0,
                        albumPeakAmplitude: 1
                    }
                }), {
                    status: 200,
                    headers: { "content-type": "application/json; charset=utf-8" }
                });
            });
        }).catch(function (error) {
            fullSongLookups.delete(trackId);
            throw error;
        });
        fullSongLookups.set(trackId, lookup);
        return lookup;
    }

    window.fetch = function (input, init) {
        if (isPreviewOnlyHiFiStream(input)) {
            if (isCdnRunner || document.querySelector('meta[name="neo-runner"]')) return resilientMusicFetch(input, init);
            return fullSongResponse(input, init).catch(function (error) {
                return originalFetch(input, init);
            });
        }
        var replacement = localAssetUrl(input);
        if (!replacement) {
            var requestUrl = typeof input === "string" ? input : input && input.url;
            var fastSearch = fastCombinedSearch(input, init);
            if (fastSearch) return fastSearch;
            try {
                if (new URL(requestUrl, launchUrl.href).hostname === "api.music.apple.com") {
                    return Promise.reject(new Error("NEO Music uses its playback-compatible search provider."));
                }
            } catch (error) {}
            return isMonochromeApiRequest(input) ? resilientMusicFetch(input, init) : originalFetch(input, init);
        }
        if (typeof Request !== "undefined" && input instanceof Request) {
            return originalFetch(new Request(replacement, input), init);
        }
        return originalFetch(replacement, init);
    };
})();
