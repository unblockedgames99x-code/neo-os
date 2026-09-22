const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

const html = read("neo-os/index.html");
const shell = read("neo-os/neo-os.js");
const transport = read("neo-os/neo-chat-transport.js");
const account = read("neo-os/neo-account-signin.js");
const chatCss = read("neo-os/neo-chat.css");
const standalone = read("neo-os/neo-chat/index.html");
const standaloneCss = read("neo-os/neo-chat/styles.css");
const standaloneApp = read("neo-os/neo-chat/app.js");
const standaloneBridge = read("neo-os/neo-chat/neo-os-bridge.js");
const integration = read("neo-os/neo-chat-integration.js");
const desktopCss = read("neo-os/neo-desktop.css");
const server = read("google-script-Code.gs");
const loader = read("google-script-loader.html");
const backup = read("neo-os/neo-backup.js");
const direct = read("google-script-direct.html");
const directBuilder = read("build-google-script-direct.mjs");

new vm.Script(shell, { filename: "neo-os.js" });
new vm.Script(transport, { filename: "neo-chat-transport.js" });
new vm.Script(integration, { filename: "neo-chat-integration.js" });
new vm.Script(server, { filename: "google-script-Code.gs" });
[...standalone.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].forEach((match, index) => {
  if (match[1].trim()) new vm.Script(match[1], { filename: `neo-chat-inline-${index + 1}.js` });
});

assert.match(html, /id="neo-login-gate"[^>]+role="dialog"[^>]+aria-modal="true"/);
assert.match(html, /data-neo-login-guest>Continue as guest/);
assert.match(html, /template id="messages-template"/);
assert.match(html, /data-chat-sign-out[^>]+hidden/);
assert.match(shell, /id:\s*"chat"[\s\S]*?title:\s*"NEO Chat"/);
assert.match(html, /neo-chat-transport\.js\?v=20260920-shared-message-actions-v1/);
assert.match(html, /neo-chat\.css\?v=20260908-imessage-logo-v2/);
assert.match(html, /name="password"[^>]+autocomplete="current-password"/);
assert.match(html, /data-neo-auth-action="login"/);
assert.match(html, /data-neo-auth-action="create"/);
assert.match(html, /data-neo-auth-action="create">Create profile/);
assert.match(html, /data-chat-attach[^>]+aria-label="Add photo, video, audio, or file"/);
assert.match(html, /data-chat-attachment-input[^>]+accept="image\/\*,video\/\*,audio\/\*/);
assert.match(html, /data-chat-auth-dialog[^>]+aria-label="Create or sign in to a NEO profile"/);
assert.match(html, /data-chat-auth-close[^>]+aria-label="Close profile setup"/);
assert.match(html, /data-chat-auth-mount/);
assert.doesNotMatch(html, /removeLegacyMessagesUi/);

assert.match(shell, /chat:\s*\{[\s\S]*?title:\s*"NEO Chat"[\s\S]*?route:\s*"\.\/neo-chat\/index\.html\?v=20260921-no-call-buttons-v1"/);
assert.match(shell, /initStartScreen\(initAccountGate\);[\s\S]*?performBoot\(\);/);
assert.match(shell, /sessionStorage\.setItem\(GUEST_SESSION_KEY, "1"\)/);
assert.doesNotMatch(shell, /localStorage\.setItem\(GUEST_SESSION_KEY, "1"\)/);
assert.match(shell, /window\.NEO_CHAT_TRANSPORT\.state/);
assert.match(shell, /window\.NEO_CHAT_TRANSPORT\.search/);
assert.match(shell, /window\.NEO_CHAT_TRANSPORT\.createRoom/);
assert.match(shell, /window\.NEO_CHAT_TRANSPORT\.send/);
assert.match(shell, /window\.NEO_CHAT_TRANSPORT\.upload/);
assert.match(shell, /function selectAttachment\(file\)/);
assert.match(shell, /native-message-attachment/);
assert.match(shell, /event\.isComposing/);
assert.match(shell, /sidebar\.inert\s*=\s*conversationOpen/);
assert.match(shell, /function isCompactChat\(\)[\s\S]*?getBoundingClientRect\(\)\.width[\s\S]*?width <= 760/);
assert.match(shell, /classList\.toggle\("is-compact-layout", compact\)/);
assert.match(shell, /new ResizeObserver\(handleMessagesResize\)/);
assert.match(shell, /messagesResizeObserver\.disconnect\(\)/);
assert.match(shell, /NEO_ACCOUNT_STORE\.clearActive/);
assert.match(shell, /neo-account-picker/);
assert.match(shell, /function openProfileMenu\(\)/);
assert.match(shell, /NEO_ACCOUNT_SIGNIN\.mountAccountSignIn/);
assert.match(shell, /action\.addEventListener\("click", openProfileMenu\)/);
assert.match(shell, /signInButton\.addEventListener\("click", openProfileMenu\)/);
assert.doesNotMatch(shell, /openBrowserPage\("sign-in", "Create profile"\)/);
assert.match(shell, /Your message is still ready to send/);
assert.doesNotMatch(shell, /\.netlify\/functions/);
assert.doesNotMatch(shell, /placeholder\s*=\s*"iMessage"/);
assert.doesNotMatch(standalone, /audioCallButton|videoCallButton|i-phone|i-video/);
assert.doesNotMatch(standaloneApp, /audioCallButton|videoCallButton|DM calling endpoint/);

assert.match(account, /instanceId\s*=\s*"neo-account-title-"/);
assert.match(account, /NEO_CHAT_TRANSPORT\.createProfile/);
assert.match(account, /NEO_CHAT_TRANSPORT\.login/);
assert.match(account, /pendingProfileRequest/);
assert.match(account, /NEO_ACCOUNT_STORE\.list/);
assert.match(account, /NEO_CHAT_TRANSPORT\.resume/);
assert.match(account, /NEO_CHAT_TRANSPORT\.signOut/);
assert.match(account, /payload\.token/);
assert.doesNotMatch(account, /static-firebase/);

assert.match(transport, /function isCloudAvailable\(\)/);
assert.match(transport, /window\.google\.script\.run/);
assert.match(transport, /LOCAL_STATE_KEY\s*=\s*"neo_chat_local_state_v2"/);
assert.match(transport, /modeLabel/);
assert.match(transport, /event\.source !== window\.parent/);
assert.match(transport, /window\.parent\.postMessage\(\{ type: "neo-chat:request"/);
assert.match(transport, /SAVED_ACCOUNTS_KEY\s*=\s*"neo_chat_saved_accounts_v1"/);
assert.match(transport, /function withoutLegacyWelcome\(payload\)/);
assert.doesNotMatch(transport, /Welcome to NEO Chat/);
assert.doesNotMatch(transport, /firebaseio|\.netlify\/functions/);

for (const method of [
  "neoChatCreateProfile",
  "neoChatLogin",
  "neoChatResume",
  "neoChatState",
  "neoChatSearchUsers",
  "neoChatCreateRoom",
  "neoChatUploadAttachment",
  "neoChatSendMessage",
  "neoChatEditMessage",
  "neoChatDeleteMessage",
  "neoChatSignOut"
]) assert.match(server, new RegExp(`function ${method}\\(`));
assert.match(server, /Utilities\.computeDigest\(Utilities\.DigestAlgorithm\.SHA_256/);
assert.match(server, /LockService\.getScriptLock\(\)/);
assert.match(server, /NEO_CHAT_STORE_CHUNK_BYTES_\s*=\s*7000/);
assert.match(server, /function neoChatUtf8Chunks_/);
assert.match(server, /function neoChatProfileToken_/);
assert.match(server, /function neoChatPasswordHash_/);
assert.match(server, /function neoChatConstantTimeEqual_/);
assert.match(server, /NEO_CHAT_MAX_LOGIN_ATTEMPTS_/);
assert.match(server, /function neoChatRemoveLegacyWelcome_\(\)/);
assert.doesNotMatch(server, /Welcome to NEO Chat/);
assert.doesNotMatch(server, /static-firebase/);

assert.match(chatCss, /--messages-blue:\s*#fff/);
assert.match(chatCss, /\.native-message\.is-own \.native-message-bubble\s*\{[^}]*background:\s*#fff/);
assert.match(chatCss, /\.messages-pinned-room\.is-global\.is-active[\s\S]*?background:\s*transparent/);
assert.match(chatCss, /\.messages-pinned-room\.is-global\.is-active \.messages-avatar\s*\{[\s\S]*?color:\s*#fff/);
assert.match(chatCss, /@media \(max-width:760px\), \(pointer:coarse\) and \(max-width:1366px\)/);
assert.match(chatCss, /\.neo-messages\.is-compact-layout\.is-conversation-open \.messages-conversation\s*\{[^}]*transform:\s*translateX\(0\)/);
assert.match(chatCss, /min-width:\s*44px/);
assert.match(chatCss, /\.messages-auth-dialog::backdrop/);
assert.match(chatCss, /\.messages-auth-dialog-mount \.neo-browser-sign-in-card/);
assert.match(html, /neo-desktop\.css\?v=20260907-equalizer-live-v2&amp;chat=utility-spacing-v1/);
assert.match(desktopCss, /\.chat-local-tools>button\{[^}]*width:auto!important;[^}]*min-width:max-content;[^}]*white-space:nowrap/);

assert.match(standalone, /<html lang="en" data-neo-app="chat">/);
assert.match(standalone, /neo-theme-system\.css\?v=20260919-neo-sync-v1/);
assert.match(standalone, /neo-app-theme\.js\?v=20260919-neo-sync-v1/);
assert.match(standalone, /neo-chat-transport\.js\?v=20260920-shared-message-actions-v1/);
assert.match(standalone, /neo-os-bridge\.js\?v=20260920-shared-message-actions-v1/);
assert.match(standalone, /class="app" id="app"/);
assert.match(standalone, /class="sidebar" aria-label="NEO Chat navigation"/);
assert.match(standalone, /class="connection-label" id="connectionLabel" role="status" aria-live="polite"/);
assert.match(standalone, /id="authOverlay"/);
assert.match(standalone, /id="profileOverlay"/);
assert.match(standalone, /id="memojiOptionGrid"/);
assert.match(standaloneCss, /html\[data-interface-style="modern"\] \.app/);
assert.match(standaloneCss, /html\[data-interface-style="retro"\] \.app/);
assert.match(standaloneCss, /--desktop-accent/);
assert.match(standaloneCss, /\.sidebar-title-actions \.connection-label\s*\{[^}]*position:\s*absolute;[^}]*clip:\s*rect\(0, 0, 0, 0\)/);
assert.match(standaloneCss, /\.header-actions #infoButton,[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none;/);
assert.match(standaloneCss, /\.sidebar > \.search-box\s*\{[^}]*grid-template-columns:\s*18px minmax\(0, 1fr\);[^}]*align-items:\s*center;[^}]*height:\s*36px;/);
assert.match(standaloneCss, /\.sidebar > \.search-box > input\[type="search"\]\s*\{[^}]*height:\s*34px;[^}]*background:\s*transparent !important;/);
assert.match(standaloneApp, /window\.NEO_CHAT_BRIDGE\.api\(path, options\)/);
assert.match(standaloneApp, /TAPBACK_AVATAR_COUNT = 58/);
assert.match(standaloneBridge, /parentWindow && parentWindow\.NEO_CHAT_TRANSPORT/);
assert.match(standaloneBridge, /NEO_ACCOUNT_STORE/);
assert.match(standaloneBridge, /neo-chat:account-sync/);
assert.match(standaloneBridge, /transport\.state\(active\.token/);
assert.match(standaloneBridge, /transport\.edit\(active\.token/);
assert.match(standaloneBridge, /transport\.remove\(active\.token/);
assert.doesNotMatch(standaloneBridge, /Editing and deleting shared NEO messages is not available yet/);

assert.match(loader, /event\.source !== frame\.contentWindow \|\| event\.origin !== hostedOrigin/);
assert.match(loader, /chatMethods = new Set/);
assert.match(loader, /runner\[method\]\(payload\)/);
assert.match(loader, /"neoChatEditMessage"/);
assert.match(loader, /"neoChatDeleteMessage"/);
assert.match(loader, /postMessage\(message, hostedOrigin\)/);
assert.doesNotMatch(loader, /postMessage\(message, "\*"\)/);
assert.match(backup, /"neo_chat_local_state_v2"/);
assert.match(backup, /"neo_chat_pending_profile_v1"/);
assert.match(backup, /"neo_chat_saved_accounts_v1"/);
const directRevision = directBuilder.match(/const revision = "([0-9a-f]{40})"/)?.[1];
assert.ok(directRevision, "direct launcher must pin a complete source revision");
assert.match(direct, new RegExp("@" + directRevision + "/neo-os/neo-chat-transport\\.js\\?v=20260901-production-auth-v1"));
assert.match(direct, /template id="messages-template"/);
assert.doesNotMatch(direct, /removeLegacyMessagesUi/);
assert.doesNotMatch(directBuilder, /const revision = "main"/);

console.log("NEO Chat startup, transport, account safety, monochrome UI, and mobile contracts passed.");
