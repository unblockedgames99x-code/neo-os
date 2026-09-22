const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const projectRoot = path.resolve(__dirname, "..");
const sourceRoot = path.join(projectRoot, "neo-os", "nextnode-browser");
const sharedShield = path.join(projectRoot, "neo-os", "neo-ad-shield.js");
const exportsRoot = path.join(projectRoot, "exports");
const outputRoot = path.join(exportsRoot, "neo-web-proxy-clean");

function assertInside(parent, child) {
  const relative = path.relative(parent, child);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Unsafe export target: ${child}`);
  }
}

function listFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

assertInside(exportsRoot, outputRoot);
if (!fs.existsSync(sourceRoot)) throw new Error(`Missing browser source: ${sourceRoot}`);
if (!fs.existsSync(sharedShield)) throw new Error(`Missing shared ad shield: ${sharedShield}`);

fs.mkdirSync(exportsRoot, { recursive: true });
fs.rmSync(outputRoot, { recursive: true, force: true });
fs.cpSync(sourceRoot, outputRoot, { recursive: true });
fs.copyFileSync(sharedShield, path.join(outputRoot, "neo-ad-shield.js"));

const indexFile = path.join(outputRoot, "index.html");
const indexSource = fs.readFileSync(indexFile, "utf8");
if (!indexSource.includes('../neo-ad-shield.js')) {
  throw new Error("Expected shared ad-shield reference was not found in index.html");
}
fs.writeFileSync(indexFile, indexSource.replaceAll('../neo-ad-shield.js', './neo-ad-shield.js'));

const erudaFile = path.join(outputRoot, "browser-vendor", "eruda.min.js");
let erudaSource = fs.readFileSync(erudaFile, "utf8");
erudaSource = erudaSource.replace(
  /\/\*\*[\s\S]*?using-sri-with-dynamic-files\s*\*\//,
  "/* Bundled locally for NEO Browser. */"
);
const remotePluginLoader = /function so\(e\)\{var t="eruda"\+Ve\(\)\(e\);if\(!window\[t\]\)\{var n=location\.protocol;Xe\(\)\(n,"http"\)\|\|\(n="http:"\),oo\(\)\(""\.concat\(n,"\/\/cdn\.jsdelivr\.net\/npm\/eruda-"\)\.concat\(e,"@"\)\.concat\(co\[e\]\),\(function\(n\)\{if\(!n\|\|!window\[t\]\)return Ye\.error\("Fail to load plugin "\+e\);h\.emit\(h\.ADD,window\[t\]\),h\.emit\(h\.SHOW,e\)\}\)\)\}\}/;
if (!remotePluginLoader.test(erudaSource)) {
  throw new Error("Expected eruda remote plugin loader was not found");
}
erudaSource = erudaSource.replace(
  remotePluginLoader,
  'function so(e){return Ye.error("Optional plugin unavailable in this local build")}'
);
fs.writeFileSync(erudaFile, erudaSource);

const readme = `# NEO Web Proxy — clean standalone files

This folder is the standalone NEO Browser proxy package.

## Start

Serve this directory from an HTTPS website and open \`launch.svg\` (NEO app launcher) or \`index.html\` (browser directly). Service workers do not run from a normal \`file://\` URL.

Keep the directory structure intact. The proxy engine, WebAssembly file, local icons, browser UI, automatic WISP switching, and ad shield are included.

## Privacy cleanup

- No public package-CDN URL or hostname is present.
- No project GitHub owner string is present.
- No project CDN repository name is present.
- The optional developer-tool plugin downloader was disabled instead of contacting a public CDN.

The WISP entries in \`wisp-settings.js\` are the external relay servers the web proxy needs to reach sites. You can replace them with your own WISP server if desired.
`;
fs.writeFileSync(path.join(outputRoot, "README.md"), readme);

const forbidden = [
  { label: "jsDelivr", expression: /jsdelivr/i },
  { label: "project GitHub owner", expression: /unblockedgames99x-code/i },
  { label: "NEO CDN repository", expression: /neo-os-[a-z0-9-]*-cdn/i },
  { label: "fastly jsDelivr host", expression: /fastly\.jsdelivr\.net/i },
  { label: "cdn jsDelivr host", expression: /cdn\.jsdelivr\.net/i },
];

const files = listFiles(outputRoot);
const failures = [];
for (const file of files) {
  const text = fs.readFileSync(file).toString("utf8");
  for (const rule of forbidden) {
    if (rule.expression.test(text)) {
      failures.push(`${path.relative(outputRoot, file)}: ${rule.label}`);
    }
  }
}
if (failures.length) {
  throw new Error(`Privacy scan failed:\n${failures.join("\n")}`);
}

const manifestLines = files
  .filter((file) => path.basename(file) !== "AUDIT.txt")
  .sort()
  .map((file) => `${sha256(file)}  ${path.relative(outputRoot, file).replaceAll(path.sep, "/")}`);

const audit = [
  "NEO WEB PROXY EXPORT AUDIT",
  "",
  "PASS: no prohibited public package-CDN text or hostname found",
  "PASS: no project GitHub owner string found",
  "PASS: no project CDN repository name found",
  `FILES: ${manifestLines.length}`,
  "",
  "SHA-256 MANIFEST",
  ...manifestLines,
  "",
].join("\n");
fs.writeFileSync(path.join(outputRoot, "AUDIT.txt"), audit);

console.log(`Created ${outputRoot}`);
console.log(`Verified ${manifestLines.length} files`);
