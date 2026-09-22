// Explicit release command: publishes existing NEO OS GitHub CDN repositories.
// Run only after the production artifact and regression suite have been verified.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { optimizeNeoShell } = require('./optimize-neo-shell.cjs');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '.codex-tmp', 'github-cdn-shards');
const work = path.join(root, '.codex-tmp', 'cdn-publish-work');
const refs = JSON.parse(process.env.NEO_CDN_REFS_JSON || '{}');
// Retired Music shards must not be carried into a new release manifest.
delete refs['neo-os-music-one-cdn'];
delete refs['neo-os-music-three-cdn'];
if (process.argv[2] !== '--publish') throw new Error('Explicit --publish required.');
for (const [name, ref] of Object.entries(refs)) {
  if (!/^neo-os-[a-z0-9-]+-cdn$/.test(name) || !/^[a-f0-9]{40}$/.test(ref)) throw new Error('Invalid pinned CDN reference');
}
function command(args, cwd = root) {
  const result = spawnSync(args[0], args.slice(1), { cwd, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${args[0]} failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}
function rewritePins(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { rewritePins(file); continue; }
    if (/^neo-(?:boot|shell)\.[a-f0-9]{16}\.min\./.test(entry.name)) continue;
    if (!/\.(html|svg|js|css|json)$/.test(entry.name)) continue;
    const before = fs.readFileSync(file, 'utf8');
    const after = before.replace(/(\/gh\/unblockedgames99x-code\/)(neo-os-[a-z0-9-]+-cdn)@(?:main|[a-f0-9]{40})(\/)/g,
      (match, prefix, name, suffix) => refs[name] ? `${prefix}${name}@${refs[name]}${suffix}` : match);
    if (before !== after) fs.writeFileSync(file, after);
  }
}
function publish(name) {
  if (!/^neo-os-[a-z0-9-]+-cdn$/.test(name)) throw new Error('Invalid repository name');
  const destination = path.resolve(work, name);
  if (!destination.startsWith(work + path.sep)) throw new Error('Repository must remain in the release workspace');
  const remote = `https://github.com/unblockedgames99x-code/${name}.git`;
  if (!fs.existsSync(path.join(destination, '.git'))) command(['git', 'clone', '--depth', '1', remote, destination]);
  const configured = command(['git', 'remote', 'get-url', 'origin'], destination).replace(/\.git$/, '');
  if (configured !== remote.replace(/\.git$/, '')) throw new Error('Unexpected repository remote');
  if (command(['git', 'status', '--porcelain'], destination)) throw new Error('Preserve existing changes in ' + name);
  // Keep old published assets available. No recursive deletion or forced Git push.
  fs.cpSync(path.join(output, name), destination, { recursive: true, force: true });
  if (command(['git', 'status', '--porcelain'], destination)) {
    command(['git', 'add', '--all'], destination);
    const authorName = command(['git', 'config', 'user.name']);
    const authorEmail = command(['git', 'config', 'user.email']);
    command(['git', '-c', `user.name=${authorName}`, '-c', `user.email=${authorEmail}`,
      'commit', '-m', 'Optimize desktop responsiveness and restore complete assets'], destination);
  }
  // Also retry an earlier committed-but-unpushed release safely.
  command(['git', 'push', 'origin', 'HEAD:main'], destination);
  const ref = command(['git', 'rev-parse', '--verify', 'HEAD'], destination);
  if (!/^[a-f0-9]{40}$/.test(ref)) throw new Error('Invalid published revision');
  if (command(['git', 'ls-remote', 'origin', 'refs/heads/main'], destination).split(/\s+/)[0] !== ref) throw new Error('Remote revision verification failed');
  refs[name] = ref;
  console.log(JSON.stringify({ published: name, ref }));
}
command([process.execPath, path.join(__dirname, 'build-github-cdn-shards.cjs')]);
for (const name of ['neo-os-chat-tv-cdn', 'neo-os-music-two-cdn', 'neo-os-wallpaper-web-three-cdn']) publish(name);
rewritePins(path.join(output, 'neo-os-browser-cdn'));
publish('neo-os-browser-cdn');
rewritePins(path.join(output, 'neo-os-core-cdn'));
optimizeNeoShell(path.join(output, 'neo-os-core-cdn'));
publish('neo-os-core-cdn');
rewritePins(path.join(output, 'neo-os-launch-cdn'));
publish('neo-os-launch-cdn');
const release = { refs, url: `https://fastly.jsdelivr.net/gh/unblockedgames99x-code/neo-os-launch-cdn@${refs['neo-os-launch-cdn']}/launch.svg` };
fs.writeFileSync(path.join(root, '.codex-tmp', 'performance-cdn-release.json'), JSON.stringify(release, null, 2));
console.log(JSON.stringify(release));
