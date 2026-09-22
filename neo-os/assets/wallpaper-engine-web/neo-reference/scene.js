(function () {
  "use strict";

  var canvas = document.getElementById("scene");
  var context = canvas && canvas.getContext("2d", { alpha: false, desynchronized: true });
  if (!canvas || !context) return;

  var SCENES = {
    "neon-city": { base: [4, 8, 24], glowA: [65, 68, 190], glowB: [14, 213, 208], accent: [197, 99, 255], speed: 0.82, seed: 17 },
    twilight: { base: [8, 14, 25], glowA: [63, 91, 132], glowB: [157, 111, 180], accent: [183, 206, 255], speed: 0.46, seed: 29 },
    "pink-drive": { base: [17, 6, 20], glowA: [221, 41, 135], glowB: [78, 31, 113], accent: [255, 150, 203], speed: 1.08, seed: 43 },
    "gothic-dusk": { base: [4, 5, 11], glowA: [58, 28, 83], glowB: [25, 49, 78], accent: [163, 128, 193], speed: 0.34, seed: 61 },
    "violet-storm": { base: [6, 8, 24], glowA: [92, 44, 191], glowB: [34, 109, 189], accent: [188, 130, 255], speed: 1.25, seed: 79 }
  };

  var query = new URLSearchParams(window.location.search);
  var sceneName = query.get("scene") || "neon-city";
  var palette = SCENES[sceneName] || SCENES["neon-city"];
  var particles = [];
  var width = 1;
  var height = 1;
  var pixelRatio = 1;
  var frame = 0;
  var paused = false;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.dataset.scene = sceneName;

  function random(index, salt) {
    var value = Math.sin((index + 1) * 12.9898 + (palette.seed + salt) * 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function rgba(color, alpha) {
    return "rgba(" + color[0] + "," + color[1] + "," + color[2] + "," + alpha + ")";
  }

  function rebuildParticles() {
    var count = Math.max(22, Math.min(64, Math.round((width * height) / 33000)));
    particles = Array.from({ length: count }, function (_, index) {
      return {
        x: random(index, 1),
        y: random(index, 2),
        radius: 0.7 + random(index, 3) * 3.4,
        drift: 0.08 + random(index, 4) * 0.32,
        phase: random(index, 5) * Math.PI * 2,
        color: random(index, 6) > 0.48 ? palette.accent : palette.glowB
      };
    });
  }

  function resize() {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    rebuildParticles();
    draw(performance.now(), true);
  }

  function paintGlow(x, y, radius, color, alpha) {
    var gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, rgba(color, alpha));
    gradient.addColorStop(0.45, rgba(color, alpha * 0.42));
    gradient.addColorStop(1, rgba(color, 0));
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function draw(now, singleFrame) {
    var seconds = reduceMotion ? 0 : now / 1000 * palette.speed;
    context.fillStyle = "rgb(" + palette.base.join(",") + ")";
    context.fillRect(0, 0, width, height);

    var xA = width * (0.22 + Math.sin(seconds * 0.31) * 0.08);
    var yA = height * (0.72 + Math.cos(seconds * 0.22) * 0.12);
    var xB = width * (0.76 + Math.cos(seconds * 0.27) * 0.1);
    var yB = height * (0.28 + Math.sin(seconds * 0.19) * 0.1);
    paintGlow(xA, yA, Math.max(width, height) * 0.72, palette.glowA, 0.62);
    paintGlow(xB, yB, Math.max(width, height) * 0.58, palette.glowB, 0.46);

    context.save();
    context.globalCompositeOperation = "screen";
    context.lineCap = "round";
    for (var band = 0; band < 5; band += 1) {
      var bandY = height * (0.18 + band * 0.15) + Math.sin(seconds * (0.28 + band * 0.025) + band) * height * 0.055;
      var bandGradient = context.createLinearGradient(0, bandY, width, bandY);
      bandGradient.addColorStop(0, rgba(palette.glowA, 0));
      bandGradient.addColorStop(0.3, rgba(band % 2 ? palette.glowB : palette.glowA, 0.09));
      bandGradient.addColorStop(0.7, rgba(band % 2 ? palette.glowA : palette.accent, 0.12));
      bandGradient.addColorStop(1, rgba(palette.accent, 0));
      context.strokeStyle = bandGradient;
      context.lineWidth = Math.max(26, height * 0.065);
      context.beginPath();
      context.moveTo(-width * 0.1, bandY);
      context.bezierCurveTo(width * 0.25, bandY - height * 0.16, width * 0.72, bandY + height * 0.16, width * 1.1, bandY - height * 0.04);
      context.stroke();
    }

    particles.forEach(function (particle) {
      var y = ((particle.y - seconds * particle.drift * 0.025) % 1 + 1) % 1 * height;
      var x = particle.x * width + Math.sin(seconds * 0.45 + particle.phase) * width * 0.018;
      var pulse = 0.45 + Math.sin(seconds * 1.2 + particle.phase) * 0.22;
      context.shadowColor = rgba(particle.color, 0.8);
      context.shadowBlur = particle.radius * 5;
      context.fillStyle = rgba(particle.color, Math.max(0.15, pulse));
      context.beginPath();
      context.arc(x, y, particle.radius, 0, Math.PI * 2);
      context.fill();
    });
    context.restore();

    if (!singleFrame && !paused && !document.hidden && !reduceMotion) frame = requestAnimationFrame(draw);
  }

  function report(activity) {
    try { window.parent.postMessage({ type: "neo-wallpaper-health", activity: activity, scene: sceneName }, "*"); } catch (_error) {}
  }

  function setPaused(value) {
    paused = Boolean(value);
    if (paused && frame) cancelAnimationFrame(frame);
    frame = 0;
    if (!paused && !document.hidden && !reduceMotion) frame = requestAnimationFrame(draw);
    report(true);
  }

  window.addEventListener("message", function (event) {
    if (event.data && event.data.type === "neo-wallpaper-playback") setPaused(event.data.paused);
  });
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", function () {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (!document.hidden && !paused && !reduceMotion) frame = requestAnimationFrame(draw);
    report(!document.hidden && !paused);
  });

  resize();
  report(true);
  window.setInterval(function () { report(!paused && !document.hidden); }, 1000);
  if (!reduceMotion) frame = requestAnimationFrame(draw);
}());
