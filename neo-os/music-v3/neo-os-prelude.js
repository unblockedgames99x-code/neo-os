(function () {
    "use strict";

    window.__NEO_MUSIC__ = true;

    var virtualRouting = window.location.href === "about:srcdoc" || window.location.origin === "null";
    var shellOrigin = "";
    try { shellOrigin = window.parent.location.origin; } catch (_error) {}
    if (!shellOrigin || shellOrigin === "null") shellOrigin = window.location.origin;
    var launchUrl = new URL(shellOrigin + "/");
    var nativeAddEventListener = window.EventTarget && window.EventTarget.prototype.addEventListener;
    var nativeDispatchEvent = window.EventTarget && window.EventTarget.prototype.dispatchEvent;
    var nativePreventDefault = window.Event && window.Event.prototype.preventDefault;
    var nativeStopPropagation = window.Event && window.Event.prototype.stopPropagation;
    var nativeClosest = window.Element && window.Element.prototype.closest;
    var nativePushState = window.History && window.History.prototype.pushState;
    var nativeReplaceState = window.History && window.History.prototype.replaceState;
    var NativePopStateEvent = window.PopStateEvent;
    var historyTarget = window.history;
    var windowTarget = window;
    var appBaseUrl = new URL("./", document.currentScript.src);
    var appPath = appBaseUrl.pathname.replace(/\/$/, "");
    var baseElement = document.querySelector("base");

    if (baseElement) baseElement.href = appBaseUrl.href;
    window.__NEO_MUSIC_BASE__ = appPath;

    function routeUrl(value) {
        if (typeof value !== "string" || value.charAt(0) !== "/") return value;
        return shellOrigin + value;
    }

    function setVirtualRoute(value) {
        var next;
        try { next = new URL(String(value || "/"), "https://neo-music.invalid/"); }
        catch (_error) { next = new URL("https://neo-music.invalid/"); }
        window.__NEO_ROUTE_PATH__ = next.pathname || "/";
        window.__NEO_ROUTE_SEARCH__ = next.search || "";
        window.__NEO_ROUTE_HASH__ = next.hash || "";
    }

    if (nativePushState && nativeReplaceState) {
        window.History.prototype.pushState = function (state, title, url) {
            if (virtualRouting) {
                setVirtualRoute(url);
                return;
            }
            return nativePushState.call(this, state, title, routeUrl(url));
        };
        window.History.prototype.replaceState = function (state, title, url) {
            if (virtualRouting) {
                setVirtualRoute(url);
                return;
            }
            return nativeReplaceState.call(this, state, title, routeUrl(url));
        };
    }

    // The supplied router expects to own paths such as /, /search, and /library.
    // Keep its assets anchored to the copied app while exposing that expected route.
    if (window.location.pathname !== "/") {
        window.history.replaceState({ neoMusic: true }, "", "/");
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
                destination = new URL(href, launchUrl.href);
            } catch (error) {
                return;
            }

            if (destination.origin !== launchUrl.origin) return;
            if (/\.[a-z0-9]{2,8}$/i.test(destination.pathname)) return;

            if (nativePreventDefault) nativePreventDefault.call(event);
            if (nativeStopPropagation) nativeStopPropagation.call(event);
            window.history.pushState(
                { neoMusic: true },
                "",
                routeUrl(destination.pathname + destination.search + destination.hash)
            );
            nativeDispatchEvent.call(windowTarget, new NativePopStateEvent("popstate"));
        }, true);
    }

    var baseUrl = appBaseUrl;
    var originalFetch = window.fetch.bind(window);
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
        if (!text || text.charAt(0) !== "/" || text.indexOf("//") === 0) return null;
        var path = text.split("?")[0].split("#")[0];
        var isLocal = localFiles.indexOf(path) !== -1 || localPrefixes.some(function (prefix) {
            return path.indexOf(prefix) === 0;
        });
        if (!isLocal) return null;
        return new URL(text.replace(/^\/+/, ""), baseUrl).href;
    }

    window.fetch = function (input, init) {
        var replacement = localAssetUrl(input);
        if (!replacement) return originalFetch(input, init);
        if (typeof Request !== "undefined" && input instanceof Request) {
            return originalFetch(new Request(replacement, input), init);
        }
        return originalFetch(replacement, init);
    };
})();
