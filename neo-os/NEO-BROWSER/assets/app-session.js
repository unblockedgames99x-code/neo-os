(() => {
  "use strict";

  const sourceUrl = document.querySelector('meta[name="neo-source-url"]')?.content || "";
  const launchSearch = window.location.search || (sourceUrl ? new URL(sourceUrl, document.baseURI).search : "");
  const params = new URLSearchParams(launchSearch);
  if (params.get("neo-app-mode") !== "1") return;

  let target;
  try {
    target = new URL(params.get("neo-app-target") || "");
  } catch {
    return;
  }
  if (!/^https?:$/.test(target.protocol)) return;

  let hash = 2166136261;
  const identity = `${target.origin}${target.pathname}`;
  for (let index = 0; index < identity.length; index += 1) {
    hash ^= identity.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const instanceId = `neo_app_${(hash >>> 0).toString(36)}`;
  const tabStateKey = `${instanceId}:neo:tabs:v1`;
  window._sessionInstId = instanceId;

  const clearAppTabs = () => {
    try { window.localStorage.removeItem(tabStateKey); } catch {}
  };

  // Dedicated web apps may keep their own preferences, but their temporary
  // browsing tab belongs to the app window and must not survive that window.
  clearAppTabs();
  window.addEventListener("pagehide", clearAppTabs, { once: true });
})();
