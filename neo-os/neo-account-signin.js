var authInstance = 0;
var PENDING_PROFILE_KEY = "neo_chat_pending_profile_v1";

function operationId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return "create_" + window.crypto.randomUUID().replace(/-/g, "");
  }
  return "create_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 18);
}

function pendingProfileRequest(username) {
  var pending = null;
  try { pending = JSON.parse(localStorage.getItem(PENDING_PROFILE_KEY) || "null"); } catch (error) {}
  if (pending && pending.username === username && /^create_[a-z0-9]{12,80}$/i.test(String(pending.id || "")) && Date.now() - Number(pending.time || 0) < 86400000) {
    return pending.id;
  }
  var id = operationId();
  try { localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify({ id: id, username: username, time: Date.now() })); } catch (error) {}
  return id;
}

function clearPendingProfile(id) {
  try {
    var pending = JSON.parse(localStorage.getItem(PENDING_PROFILE_KEY) || "null");
    if (!pending || pending.id === id) localStorage.removeItem(PENDING_PROFILE_KEY);
  } catch (error) {}
}

function mountAccountSignIn(container, show, onSuccess, options) {
  var copyOptions = options || {};
  var template = document.getElementById("neo-account-sign-in-template");
  if (!template) throw new Error("missing_account_template");
  if (!window.NEO_CHAT_TRANSPORT) throw new Error("missing_chat_transport");

  var destroyed = false;
  var controller = null;
  var timeout = 0;
  var instanceId = "neo-account-title-" + (++authInstance);
  container.replaceChildren(template.content.cloneNode(true));
  show();

  var panel = container.querySelector("[data-neo-sign-in-panel]");
  var form = container.querySelector("[data-neo-sign-in-form]");
  var title = container.querySelector("[data-neo-auth-title]");
  var copy = container.querySelector("[data-neo-auth-copy]");
  var mode = container.querySelector("[data-neo-auth-mode]");
  var savedSection = container.querySelector("[data-neo-saved-accounts]");
  var savedList = container.querySelector("[data-neo-saved-account-list]");
  var usernameInput = form.querySelector('input[name="username"]');
  var passwordInput = form.querySelector('input[name="password"]');
  var passwordToggle = form.querySelector("[data-neo-password-toggle]");
  var authTabs = Array.from(container.querySelectorAll("[data-neo-auth-action]"));
  var submitButton = form.querySelector("[data-neo-sign-in-submit]");
  var feedback = form.querySelector("[data-neo-sign-in-feedback]");
  var authMode = "login";
  var deviceOnly = window.NEO_CHAT_TRANSPORT.mode() === 'local';

  title.id = instanceId;
  if (panel) panel.setAttribute("aria-labelledby", instanceId);
  title.textContent = "Sign in to NEO";
  copy.textContent = deviceOnly ? 'Device-local profiles only. No cross-device chat or public account security. Do not reuse an important password.' : 'Use your NEO username and password to open shared Chat.';
  if (mode) {
    var cloud = window.NEO_CHAT_TRANSPORT.mode() === "cloud";
    mode.textContent = cloud ? window.NEO_CHAT_TRANSPORT.modeLabel() : "Saved on this device as a fallback";
    mode.dataset.transport = cloud ? "cloud" : "local";
  }

  function stopRequest() {
    window.clearTimeout(timeout);
    timeout = 0;
    if (controller) controller.abort();
    controller = null;
  }

  function setBusy(busy, label) {
    submitButton.disabled = busy;
    submitButton.textContent = busy ? (label || "Working...") : (authMode === "create" ? "Create profile" : "Sign in");
    authTabs.forEach(function (button) { button.disabled = busy; });
    if (savedList) savedList.querySelectorAll("button").forEach(function (button) { button.disabled = busy; });
  }

  function setAuthMode(nextMode) {
    if (controller) return;
    authMode = nextMode === "create" ? "create" : "login";
    authTabs.forEach(function (button) {
      var selected = button.dataset.neoAuthAction === authMode;
      button.setAttribute("aria-selected", selected ? "true" : "false");
      button.tabIndex = selected ? 0 : -1;
    });
    title.textContent = authMode === "create" ? (deviceOnly ? 'Create a device profile' : "Create your NEO profile") : "Sign in to NEO";
    copy.textContent = deviceOnly ? 'Device-local profiles only. No cross-device chat or public account security. Do not reuse an important password.' : authMode === "create"
      ? "Choose a unique username and a password you can use on any device."
      : "Use your NEO username and password to open shared Chat.";
    passwordInput.autocomplete = authMode === "create" ? "new-password" : "current-password";
    submitButton.textContent = authMode === "create" ? "Create profile" : "Sign in";
    feedback.textContent = "";
    feedback.classList.remove("is-error", "is-success");
  }

  function finishProfile(token, payload) {
    if (!payload || !payload.user || !payload.user.id || !token) throw new Error("The profile service returned an incomplete response.");
    var session = Object.assign({}, payload.user, { transport: payload.transport || window.NEO_CHAT_TRANSPORT.mode() });
    var stored = null;
    if (window.NEO_ACCOUNT_STORE) stored = window.NEO_ACCOUNT_STORE.save(token, session, session.transport);
    else {
      localStorage.setItem("ugp_token", token);
      localStorage.setItem("ugp_session", JSON.stringify(session));
    }
    feedback.textContent = stored && stored.persisted === false
      ? "Profile ready for this session. Device storage is full, so it may not survive a refresh."
      : (copyOptions.success || "Profile ready. Opening NEO Chat...");
    feedback.classList.remove("is-error");
    feedback.classList.add("is-success");
    submitButton.textContent = "Ready";
    onSuccess({ token: token, user: session, transport: session.transport, persisted: !stored || stored.persisted !== false });
  }

  function resumeSaved(entry) {
    if (!entry || !entry.token || controller) return;
    feedback.classList.remove("is-error", "is-success");
    feedback.textContent = "Opening " + entry.user.username + "...";
    controller = new AbortController();
    var activeController = controller;
    timeout = window.setTimeout(function () { activeController.abort(); }, 12000);
    setBusy(true, "Opening...");
    window.NEO_CHAT_TRANSPORT.resume(entry.token, activeController.signal).then(function (payload) {
      if (destroyed) return;
      finishProfile(entry.token, payload);
    }).catch(function (error) {
      if (destroyed) return;
      if (error && (error.status === 401 || error.status === 403) && window.NEO_ACCOUNT_STORE) {
        window.NEO_ACCOUNT_STORE.forget(entry.token);
        renderSavedAccounts();
      }
      feedback.textContent = error && error.name === "AbortError"
        ? "The relay took too long. Your saved profile is still here—try again."
        : (error && error.message ? error.message : "That profile could not be opened.");
      feedback.classList.add("is-error");
    }).finally(function () {
      if (controller === activeController) {
        stopRequest();
        setBusy(false);
      }
    });
  }

  function renderSavedAccounts() {
    if (!savedSection || !savedList || !window.NEO_ACCOUNT_STORE) return;
    var entries = window.NEO_ACCOUNT_STORE.list();
    savedSection.hidden = !entries.length;
    savedList.replaceChildren();
    entries.forEach(function (entry) {
      var row = document.createElement("div");
      var select = document.createElement("button");
      var avatar = document.createElement("span");
      var name = document.createElement("strong");
      var remove = document.createElement("button");
      row.className = "neo-saved-account";
      row.setAttribute("role", "listitem");
      select.type = "button";
      select.className = "neo-saved-account-select";
      select.setAttribute("aria-label", "Continue as " + entry.user.username);
      avatar.textContent = String(entry.user.username || "N").charAt(0).toUpperCase();
      name.textContent = entry.user.username;
      select.append(avatar, name);
      select.addEventListener("click", function () { resumeSaved(entry); });
      remove.type = "button";
      remove.className = "neo-saved-account-remove";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Forget " + entry.user.username + " on this device");
      remove.addEventListener("click", function () {
        if (controller) return;
        if (!window.confirm("Remove " + entry.user.username + " from this device? You can sign in again with its password.")) return;
        remove.disabled = true;
        Promise.resolve(window.NEO_CHAT_TRANSPORT.signOut(entry.token)).catch(function () {}).finally(function () {
          if (window.NEO_ACCOUNT_STORE) window.NEO_ACCOUNT_STORE.forget(entry.token);
          renderSavedAccounts();
          feedback.textContent = entry.user.username + " was removed from this device.";
        });
      });
      row.append(select, remove);
      savedList.appendChild(row);
    });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var username = usernameInput.value.trim();
    var password = passwordInput.value;
    feedback.classList.remove("is-error", "is-success");
    if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) {
      feedback.textContent = "Use 3-24 letters, numbers, or underscores.";
      feedback.classList.add("is-error");
      usernameInput.focus();
      return;
    }
    if (password.length < 8 || password.length > 72) {
      feedback.textContent = "Use a password between 8 and 72 characters.";
      feedback.classList.add("is-error");
      passwordInput.focus();
      return;
    }

    stopRequest();
    var requestId = authMode === "create" ? pendingProfileRequest(username) : "";
    controller = new AbortController();
    var activeController = controller;
    timeout = window.setTimeout(function () { activeController.abort(); }, 15000);
    setBusy(true, authMode === "create" ? "Creating..." : "Signing in...");
    feedback.textContent = authMode === "create" ? "Creating your secure NEO profile..." : "Checking your account...";

    var request = authMode === "create"
      ? window.NEO_CHAT_TRANSPORT.createProfile(username, password, activeController.signal, requestId)
      : window.NEO_CHAT_TRANSPORT.login(username, password, activeController.signal);
    request.then(function (payload) {
      if (destroyed) return;
      if (!payload || !payload.token) throw new Error("The profile service returned an incomplete response.");
      if (requestId) clearPendingProfile(requestId);
      passwordInput.value = "";
      finishProfile(payload.token, payload);
    }).catch(function (error) {
      if (destroyed) return;
      feedback.textContent = error && error.name === "AbortError"
        ? (authMode === "create" ? "Account setup took too long. Retry—the same request will continue safely." : "Sign-in took too long. Please try again.")
        : (error && error.message ? error.message : (authMode === "create" ? "Your profile could not be created." : "You could not be signed in."));
      feedback.classList.add("is-error");
      if (error && error.code === "username_taken") setAuthMode("login");
      else passwordInput.select();
    }).finally(function () {
      if (controller === activeController) {
        stopRequest();
        setBusy(false);
      }
    });
  });

  authTabs.forEach(function (button) {
    button.addEventListener("click", function () { setAuthMode(button.dataset.neoAuthAction); });
  });
  if (passwordToggle) {
    passwordToggle.addEventListener("click", function () {
      var visible = passwordInput.type === "text";
      passwordInput.type = visible ? "password" : "text";
      passwordToggle.textContent = visible ? "Show" : "Hide";
      passwordToggle.setAttribute("aria-label", visible ? "Show password" : "Hide password");
      passwordInput.focus({ preventScroll: true });
    });
  }

  renderSavedAccounts();
  setAuthMode("login");
  requestAnimationFrame(function () {
    if (!destroyed && !(window.matchMedia && window.matchMedia("(max-width: 760px), (pointer: coarse)").matches)) {
      var savedButton = savedList && savedList.querySelector(".neo-saved-account-select");
      (savedButton || usernameInput).focus({ preventScroll: true });
    }
  });
  return function () {
    destroyed = true;
    stopRequest();
  };
}

window.NEO_ACCOUNT_SIGNIN = Object.freeze({
  mountAccountSignIn: mountAccountSignIn
});
