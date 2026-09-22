(() => {
  "use strict";

  const SEARCH_URL = "https://www.bing.com/search?q=";

  function scopedSetting(name) {
    try {
      const instanceId = window._sessionInstId || sessionStorage.getItem("__neo_inst__");
      return instanceId ? localStorage.getItem(`${instanceId}:${name}`) : null;
    } catch {
      return null;
    }
  }

  function usesBuiltInSearch() {
    return (scopedSetting("neo:engine:v1") || "ddg") !== "custom";
  }

  function isSearchPhrase(value) {
    const input = String(value || "").trim();
    if (!input || /^(?:neo|about|data|blob|javascript):/i.test(input)) return false;
    try {
      const parsed = new URL(input);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") return false;
    } catch {}
    return !(!input.includes(" ") && input.includes("."));
  }

  function reliableDestination(value) {
    const input = String(value || "").trim();
    if (!usesBuiltInSearch() || !isSearchPhrase(input)) return input;
    return `${SEARCH_URL}${encodeURIComponent(input)}`;
  }

  function rewriteInput(input) {
    if (!(input instanceof HTMLInputElement)) return;
    const destination = reliableDestination(input.value);
    if (destination && destination !== input.value) input.value = destination;
  }

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    if (event.target?.matches?.("#url, #ntSearch")) rewriteInput(event.target);
  }, true);

  function rewriteButtonSearch(event) {
    const button = event.target?.closest?.("#go, #ntSearchBtn");
    if (!button) return;
    rewriteInput(document.getElementById(button.id === "go" ? "url" : "ntSearch"));
  }

  document.addEventListener("pointerdown", rewriteButtonSearch, true);
  document.addEventListener("mousedown", rewriteButtonSearch, true);
  document.addEventListener("click", rewriteButtonSearch, true);

  window.NEOSearchReliability = Object.freeze({
    endpoint: SEARCH_URL,
    destinationFor: reliableDestination
  });
})();
