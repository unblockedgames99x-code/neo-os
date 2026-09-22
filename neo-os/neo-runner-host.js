(function () {
  "use strict";

  if (window.__NEO_RUNNER_HOST__) return;
  window.__NEO_RUNNER_HOST__ = true;

  function reply(target, id, payload) {
    try {
      target.postMessage({
        type: "neo:network:response",
        id: id,
        payload: payload
      }, "*");
    } catch (_error) {}
  }

  window.addEventListener("message", function (event) {
    var message = event.data;
    if (!message || message.type !== "neo:network:request" || !message.id || !event.source) return;

    var runner = window.google && window.google.script && window.google.script.run;
    if (!runner) {
      reply(event.source, message.id, { ok: false, error: "The Google network bridge is unavailable." });
      return;
    }

    runner
      .withSuccessHandler(function (result) {
        reply(event.source, message.id, { ok: true, result: result });
      })
      .withFailureHandler(function (error) {
        reply(event.source, message.id, {
          ok: false,
          error: String(error && error.message || error || "The Google network request failed.")
        });
      })
      .neoNetworkFetch(message.request || {});
  });
})();
