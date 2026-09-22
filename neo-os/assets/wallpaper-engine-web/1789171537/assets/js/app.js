(function () {
  "use strict";

  var canvas = document.getElementById("snow");
  var context = canvas.getContext("2d", { alpha: true });
  var flakes = [];
  var frame = 0;
  var lastTime = 0;
  var width = 1;
  var height = 1;
  var paused = false;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function resetFlake(flake, fromTop) {
    flake.x = random(0, width);
    flake.y = fromTop ? random(-80, -4) : random(0, height);
    flake.radius = random(0.8, 2.8);
    flake.speed = random(18, 46);
    flake.drift = random(-10, 10);
    flake.phase = random(0, Math.PI * 2);
    flake.opacity = random(0.28, 0.82);
  }

  function resize() {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    var target = Math.max(90, Math.min(260, Math.round((width * height) / 7600)));
    while (flakes.length < target) {
      var flake = {};
      resetFlake(flake, false);
      flakes.push(flake);
    }
    if (flakes.length > target) flakes.length = target;
    draw(performance.now(), true);
  }

  function draw(time, still) {
    context.clearRect(0, 0, width, height);
    var delta = lastTime ? Math.min(0.04, (time - lastTime) / 1000) : 0;
    var motionScale = reducedMotion.matches ? 0.28 : 1;
    lastTime = time;

    for (var index = 0; index < flakes.length; index += 1) {
      var flake = flakes[index];
      if (!still) {
        flake.phase += delta * 0.85;
        flake.x += (flake.drift + Math.sin(flake.phase) * 7) * delta * motionScale;
        flake.y += flake.speed * delta * motionScale;
        if (flake.y - flake.radius > height || flake.x < -24 || flake.x > width + 24) resetFlake(flake, true);
      }
      context.beginPath();
      context.fillStyle = "rgba(255,255,255," + flake.opacity + ")";
      context.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  function tick(time) {
    frame = 0;
    if (paused || document.hidden) return;
    draw(time, false);
    frame = requestAnimationFrame(tick);
  }

  function syncPlayback() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    if (paused || document.hidden) {
      draw(performance.now(), true);
      return;
    }
    frame = requestAnimationFrame(tick);
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window.parent || !event.data || event.data.type !== "neo-wallpaper-playback") return;
    paused = Boolean(event.data.paused);
    syncPlayback();
  });
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", syncPlayback);
  if (reducedMotion.addEventListener) reducedMotion.addEventListener("change", syncPlayback);

  resize();
  syncPlayback();
})();
