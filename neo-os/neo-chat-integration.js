(function () {
  "use strict";

  var root = document.documentElement;
  var legacyThemeClass = /^t-(?:dark|sky|latte|rose|mint|dusk|sunset|indigo|crimson|amber|slate|espresso|velvet|matrix|fog)$/;

  function titleCase(value) {
    return String(value || "").replace(/[-_]+/g, " ").replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }

  function stripLegacyTheme() {
    Array.from(document.body.classList).forEach(function (name) {
      if (legacyThemeClass.test(name)) document.body.classList.remove(name);
    });
  }

  function appearanceState() {
    var theme = root.dataset.neoTheme || "oled";
    var style = root.dataset.interfaceStyle || root.dataset.neoInterfaceStyle || "modern";
    return { theme: titleCase(theme), style: titleCase(style) };
  }

  function renderAppearance() {
    stripLegacyTheme();
    var item = document.querySelector('.sni[onclick*="\'themes\'"]');
    if (item) {
      var label = Array.from(item.childNodes).find(function (node) { return node.nodeType === Node.TEXT_NODE; });
      if (label) label.nodeValue = " Appearance";
      item.title = "Controlled by NEO OS";
    }
    var lightGrid = document.getElementById("tgrid-light");
    var darkGrid = document.getElementById("tgrid-dark");
    if (!lightGrid) return;
    var state = appearanceState();
    lightGrid.innerHTML = '<div class="neo-theme-sync-card"><strong>Appearance follows NEO OS</strong><p>Choose themes and switch between Modern and Retro in System Settings. NEO Chat updates automatically without a separate theme list.</p><div class="neo-theme-sync-values"><span data-neo-chat-theme>Theme: ' + state.theme + '</span><span data-neo-chat-style>Style: ' + state.style + '</span></div></div>';
    if (darkGrid) darkGrid.textContent = "";
  }

  function replaceBranding() {
    document.title = document.title.replace(/Lunchbreak/g, "NEO Chat");
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) {
      var parent = walker.currentNode.parentElement;
      if (parent && !parent.closest("script, style")) nodes.push(walker.currentNode);
    }
    nodes.forEach(function (node) {
      if (node.nodeValue && node.nodeValue.indexOf("Lunchbreak") !== -1) node.nodeValue = node.nodeValue.replace(/Lunchbreak/g, "NEO Chat");
    });
    var logo = document.querySelector(".alogo");
    if (logo) logo.textContent = "NEO CHAT";
  }

  function replaceBrandingIn(node) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.parentElement && !node.parentElement.closest("script, style") && node.nodeValue.indexOf("Lunchbreak") !== -1) {
        node.nodeValue = node.nodeValue.replace(/Lunchbreak/g, "NEO Chat");
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || node.matches("script, style")) return;
    var walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      var text = walker.currentNode;
      if (text.parentElement && !text.parentElement.closest("script, style") && text.nodeValue.indexOf("Lunchbreak") !== -1) {
        text.nodeValue = text.nodeValue.replace(/Lunchbreak/g, "NEO Chat");
      }
    }
  }

  function applySystemAppearance() {
    stripLegacyTheme();
    renderAppearance();
    replaceBranding();
  }

  function controlledApplyTheme() {
    applySystemAppearance();
    try { localStorage.removeItem("lb-theme"); } catch (_error) {}
    return "neo";
  }

  function start() {
    root.dataset.neoApp = "chat";
    window.applyTheme = controlledApplyTheme;
    window.buildThemeGrid = renderAppearance;
    applySystemAppearance();
    window.addEventListener("neo-theme-change", applySystemAppearance);
    window.addEventListener("neo-interface-style-change", applySystemAppearance);
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        if (record.type === "characterData") replaceBrandingIn(record.target);
        record.addedNodes.forEach(replaceBrandingIn);
      });
      var nextTitle = document.title.replace(/Lunchbreak/g, "NEO Chat");
      if (nextTitle !== document.title) document.title = nextTitle;
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    try { parent.postMessage({ type: "neo-chat:ready" }, location.origin); } catch (_error) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
