(function () {
  "use strict";

  function protectNeoSession(event) {
    event.preventDefault();
    event.returnValue = "";
    return "";
  }

  window.addEventListener("beforeunload", protectNeoSession);
})();
