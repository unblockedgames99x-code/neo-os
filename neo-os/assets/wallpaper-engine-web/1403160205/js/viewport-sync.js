(function () {
  "use strict";

  var lastWidth = window.innerWidth;
  var lastHeight = window.innerHeight;
  var reloadTimer = 0;

  function fitCanvas() {
    var canvas = document.getElementById("container");
    if (!canvas) return;

    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
  }

  function handleViewportChange() {
    fitCanvas();

    var nextWidth = window.innerWidth;
    var nextHeight = window.innerHeight;
    if (Math.abs(nextWidth - lastWidth) < 2 && Math.abs(nextHeight - lastHeight) < 2) return;

    lastWidth = nextWidth;
    lastHeight = nextHeight;
    window.clearTimeout(reloadTimer);
    reloadTimer = window.setTimeout(function () {
      window.location.reload();
    }, 220);
  }

  fitCanvas();
  window.addEventListener("resize", handleViewportChange, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", handleViewportChange, { passive: true });
  }
})();
