(function () {
  "use strict";
  var icons = {
    "home": '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 22V12h6v10"/>',
    "library": '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
    "chevron-down": '<path d="m6 9 6 6 6-6"/>',
    "play": '<path d="M8.25 5.85v12.3L18.5 12Z" fill="currentColor" stroke="none"/>',
    "pause": '<path d="M8 5v14"/><path d="M16 5v14"/>',
    "search": '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    "arrow-left": '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    "skip-back": '<path d="M19 20 9 12l10-8v16Z"/><path d="M5 19V5"/>',
    "skip-forward": '<path d="m5 4 10 8-10 8V4Z"/><path d="M19 5v14"/>',
    "rotate-ccw": '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    "rotate-cw": '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    "heart": '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>',
    "volume-1": '<path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5  0 0 1 0 7"/>',
    "volume-2": '<path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>',
    "volume-x": '<path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/>',
    "repeat-2": '<path d="m2 9 3-3 3 3"/><path d="M5 6h11a4 4 0 0 1 4 4v1"/><path d="m22 15-3 3-3-3"/><path d="M19 18H8a4 4 0 0 1-4-4v-1"/>',
    "list-music": '<path d="M21 15V6"/><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M3 6h10"/><path d="M3 10h10"/><path d="M3 14h6"/><path d="M3 18h6"/>',
    "x": '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'
  };

  function createIcons(options) {
    var root = options && options.root || document;
    Array.from(root.querySelectorAll("[data-lucide]")).forEach(function (element) {
      var name = element.getAttribute("data-lucide");
      var body = icons[name];
      if (!body || element.tagName.toLowerCase() === "svg") return;
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("class", ((element.getAttribute("class") || "") + " lucide lucide-" + name).trim());
      svg.innerHTML = body;
      element.replaceWith(svg);
    });
  }

  window.lucide = Object.freeze({ createIcons: createIcons });
})();
