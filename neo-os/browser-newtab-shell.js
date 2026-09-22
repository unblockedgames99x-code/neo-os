(() => {
  const messageTargetOrigin = window.location.origin === "null" ? "*" : window.location.origin;
  const trustedMessageOrigin = (origin) => window.location.origin === "null" ? origin === "null" : origin === window.location.origin;
  let selectedElement = document.documentElement;
  let inspectMode = false;
  let highlight = null;

  function selectorFor(element) {
    if (!(element instanceof Element)) return "html";
    if (element.id) return `#${CSS.escape(element.id)}`;
    const parts = [];
    let current = element;
    while (current && parts.length < 5) {
      let part = current.localName || "div";
      if (current.classList.length) part += `.${[...current.classList].slice(0, 2).map((name) => CSS.escape(name)).join(".")}`;
      parts.unshift(part);
      current = current.parentElement;
    }
    return parts.join(" > ");
  }

  function describe(element) {
    const target = element instanceof Element ? element : document.documentElement;
    const rect = target.getBoundingClientRect();
    const computed = getComputedStyle(target);
    const styles = {};
    ["display", "position", "width", "height", "margin", "padding", "color", "background-color", "font-family", "font-size"].forEach((property) => {
      styles[property] = computed.getPropertyValue(property).trim().slice(0, 220);
    });
    return {
      selector: selectorFor(target).slice(0, 800),
      tag: (target.localName || "html").slice(0, 40),
      markup: target.outerHTML.slice(0, 6000),
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      styles,
    };
  }

  function paint(element) {
    if (!(element instanceof Element)) return;
    selectedElement = element;
    const rect = element.getBoundingClientRect();
    if (!highlight) {
      highlight = document.createElement("div");
      Object.assign(highlight.style, {
        position: "fixed",
        zIndex: "2147483647",
        pointerEvents: "none",
        boxSizing: "border-box",
        border: "2px solid #4aa8ff",
        background: "rgba(74,168,255,.14)",
      });
      document.documentElement.appendChild(highlight);
    }
    Object.assign(highlight.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${Math.max(0, rect.width)}px`,
      height: `${Math.max(0, rect.height)}px`,
    });
  }

  function clearHighlight() {
    highlight?.remove();
    highlight = null;
  }

  document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    selectedElement = event.target instanceof Element ? event.target : document.documentElement;
    window.parent.postMessage({
      type: "neo-browser:context-menu",
      inspection: describe(selectedElement),
      x: event.clientX,
      y: event.clientY,
    }, messageTargetOrigin);
  }, true);

  document.addEventListener("pointermove", (event) => {
    if (inspectMode) paint(event.target);
  }, true);

  document.addEventListener("pointerdown", (event) => {
    if (event.button !== 2 && !inspectMode) {
      window.parent.postMessage({ type: "neo-browser:context-dismiss" }, messageTargetOrigin);
    }
  }, true);

  document.addEventListener("click", (event) => {
    if (!inspectMode) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    selectedElement = event.target instanceof Element ? event.target : document.documentElement;
    inspectMode = false;
    document.documentElement.style.cursor = "";
    window.parent.postMessage({ type: "neo-browser:inspect-selected", inspection: describe(selectedElement) }, messageTargetOrigin);
  }, true);

  window.addEventListener("message", (event) => {
    if (!trustedMessageOrigin(event.origin)) return;
    if (event.data?.type === "neo-browser:inspect-mode") {
      inspectMode = true;
      document.documentElement.style.cursor = "crosshair";
    } else if (event.data?.type === "neo-browser:inspect-highlight") {
      paint(selectedElement);
    } else if (event.data?.type === "neo-browser:inspect-clear") {
      inspectMode = false;
      document.documentElement.style.cursor = "";
      clearHighlight();
    }
  });
})();
