const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'neo-os', 'neo-games', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'neo-os', 'neo-games', 'app.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'neo-os', 'neo-games', 'app.js'), 'utf8');
const config = fs.readFileSync(path.join(root, 'neo-os', 'neo-games', 'config.js'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'neo-os', 'neo-os.js'), 'utf8');

assert.match(html, /class="client-menu"/, 'Games is missing the desktop-client menu bar');
assert.match(html, /<title>Steam<\/title>/, 'The client is not branded as Steam');
assert.match(html, /assets\/steam\.svg/, 'The client is missing the Steam logo');
assert.match(html, /class="library-sidebar"/, 'Games is missing the Steam-style library rail');
assert.match(html, /data-search[^>]+placeholder="Search games"/, 'Games is missing library search');
assert.match(html, /data-game-list/, 'Games is missing its catalog list');
assert.match(html, /class="game-hero"/, 'Games is missing the selected-game hero');
assert.match(html, /class="play-button"[\s\S]*PLAY/, 'Games is missing its prominent Play control');
assert.match(html, /data-detail-pin[^>]*>Add to taskbar<\/button>/, 'The game detail pin control is not clearly labeled');
assert.match(html, /data-last-played[\s\S]*data-play-time/, 'Games is missing local activity stats');
assert.match(html, /data-player-refresh[\s\S]*data-player-fullscreen[\s\S]*data-player-pin/, 'The direct player is missing its controls');
assert.match(html, /neo-ad-shield\.js/, 'Games must load the sitewide ad shield before remote content');
assert.doesNotMatch(html, /Friends|Community|Workshop|Friends & Chat|Store Page|Discussion/i, 'Social or community filler remains in the focused library');
assert.match(html, /neo-proxy-client\.js/, 'Aether games cannot use the shared OS proxy');
assert.doesNotMatch(html, /neo-link-proxy\.js/, 'Games still boots the legacy catch-all link proxy');

assert.match(config, /provider:\s*"fern-lumin"/, 'Games is not configured for the Fern provider');
assert.match(config, /luminsdk\/script@e1107337f26529e032d7873cbbb310d485d5d403\/fonts\.min\.js/, 'The Fern SDK is not pinned');
assert.match(config, /pageSize:\s*48/, 'The provider page size no longer matches Fern');
assert.doesNotMatch(config, /Aether|GN Math|StaticQuasar|gn-local|freebuisness|neo-os-games-catalog-cdn/, 'Retired URL-only game catalogs are still configured');

assert.match(app, /window\.Lumin\.init\(\{ headless: true/, 'Fern is not initialized in headless mode');
assert.match(app, /window\.Lumin\.getGames\(options\)/, 'Games does not read the Fern catalog');
assert.match(app, /window\.Lumin\.getImageUrl\(game\.imageToken\)/, 'Games does not resolve Fern artwork');
assert.match(app, /window\.Lumin\.getGameUrl\(game\.id\)/, 'Games does not resolve direct Fern launch URLs');
assert.match(app, /frame\.setAttribute\("src", launchUrl\)/, 'Fern launch URLs are not rendered directly');
assert.doesNotMatch(html, /FERN \+ AETHER|GN MATH|STATICQUASAR/, 'The library still advertises retired URL-only catalogs');
assert.match(app, /window\.Lumin\.endGame/, 'The player does not end Fern sessions when closed');
assert.match(app, /image\.loading = "lazy"/, 'Library artwork is not lazy loaded');
assert.match(app, /type:\s*"neo-shell:add-game-shortcut"/, 'Games no longer requests direct taskbar shortcuts');
assert.doesNotMatch(app, /proxyResource|requestProxiedEmbed|neoProxy|SCRAPE_GAMES|greatestgreatest-revive/, 'The retired catalog or proxy remains in Games');

for (const token of ['--steam-top', '--steam-sidebar', '--steam-blue', '--steam-green']) {
  assert.ok(css.includes(token), `Games is missing ${token}`);
}
assert.match(css, /\.library-workspace\s*\{[\s\S]*grid-template-columns/, 'The desktop library layout is missing');
assert.match(css, /\.play-button\s*\{[\s\S]*#75b022/, 'The Play button is missing its library-green treatment');
assert.match(css, /\.game-list-item\.is-selected/, 'Selected games have no highlighted state');
assert.match(css, /\[data-detail-pin\]\s*\{[\s\S]*min-width:\s*118px/, 'The labeled taskbar button is not sized for its text');
assert.match(css, /html\.is-playing,[\s\S]*overflow:\s*hidden/, 'The direct player can leak document scrollbars');
assert.match(css, /@media \(max-width: 620px\)/, 'The desktop library has no compact window fallback');

assert.match(shell, /function addCustomAppToTaskbarAndHomeScreen\(input\)/, 'The shell does not install a selected game on both surfaces');
assert.match(shell, /data\.type === "neo-shell:add-game-shortcut"/, 'The shell does not receive game shortcut requests');
assert.match(shell, /mode === "direct-game" \? url : customAppRoute/, 'Pinned games do not reopen directly');
assert.match(shell, /forceFetch:\s*directGame \|\| !browserBacked/, 'Fern games are not fetched as HTML documents before rendering');
assert.match(shell, /typeof engine\.fetchDocument !== "function"[\s\S]*?engine\.fetchDocument\(gameUrl\)/, 'Fern games have no protected HTML-document fallback');

console.log('NEO Games uses the focused Steam-style shell, the pinned Fern provider, direct launches, and no social filler.');
