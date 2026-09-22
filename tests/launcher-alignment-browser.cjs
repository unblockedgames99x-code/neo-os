const assert = require('node:assert/strict');
const path = require('node:path');

function playwrightRuntime() {
  try { return require('playwright'); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(
    process.env.USERPROFILE || '',
    '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'
  ));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_LAUNCHER_ALIGNMENT_URL || 'http://127.0.0.1:3092/neo-os/?test=launcher-alignment-v3';

async function measure(position, viewport) {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport });
  try {
    await page.addInitScript(({ position }) => {
      sessionStorage.setItem('neo_os_guest_session_v1', '1');
      localStorage.setItem('neo_os_settings_v1', JSON.stringify({
        designVersion: 29,
        interfaceStyle: 'modern',
        taskbarPosition: position,
        taskbarStyle: 'current',
      }));
    }, { position });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === 'complete', null, { timeout: 30000 });
    const start = page.locator('#neo-start-screen');
    if (await start.isVisible()) {
      await start.locator('[data-start-mode="laptop"]').click();
      await start.waitFor({ state: 'hidden' });
    }
    const guest = page.locator('[data-neo-login-guest]');
    if (await guest.isVisible()) await guest.click();
    await page.locator('.taskbar-start-button[data-open-launcher]').click();
    await page.locator('#app-launcher.is-open').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(360);
    if (process.env.NEO_LAUNCHER_ALIGNMENT_SCREENSHOT && position === 'bottom') {
      await page.locator('#app-launcher').screenshot({ path: process.env.NEO_LAUNCHER_ALIGNMENT_SCREENSHOT });
    }
    return await page.locator('#app-launcher').evaluate((launcher) => {
      const rect = launcher.getBoundingClientRect();
      const tiles = [...launcher.querySelectorAll('.pinned-app-grid .launcher-app')]
        .map((tile) => {
          const box = tile.getBoundingClientRect();
          const labelBox = tile.lastElementChild?.getBoundingClientRect();
          return { left: box.left, top: box.top, width: box.width, labelTop: labelBox?.top || 0 };
        })
        .filter((tile) => tile.width > 0);
      const firstTop = Math.min(...tiles.map((tile) => tile.top));
      const firstRow = tiles.filter((tile) => Math.abs(tile.top - firstTop) <= 1).slice(0, 7);
      const iconBoxes = [...launcher.querySelectorAll('.pinned-app-grid .launcher-app-icon')]
        .map((icon) => icon.getBoundingClientRect())
        .filter((box) => box.width > 0)
        .map((box) => ({ width: box.width, height: box.height }));
      const mediaIcon = launcher.querySelector('.pinned-app-grid .launcher-app[data-app="media"] .launcher-app-icon.app-icon-media-player');
      const mediaIconStyle = mediaIcon && getComputedStyle(mediaIcon);
      const mediaImageBox = mediaIcon && mediaIcon.querySelector('.app-image-icon')?.getBoundingClientRect();
      const recent = [...launcher.querySelectorAll('.recent-app-grid .recent-app')]
        .map((item) => item.getBoundingClientRect())
        .filter((box) => box.width > 0)
        .map((box) => ({ left: box.left, top: box.top, width: box.width, height: box.height }));
      const categories = [...launcher.querySelectorAll('.category-grid .category-group')]
        .map((group) => {
          const box = group.getBoundingClientRect();
          const nameNode = group.querySelector(':scope > span');
          const name = nameNode.getBoundingClientRect();
          const browse = group.querySelector('.launcher-category-browse').getBoundingClientRect();
          const icon = group.querySelector('.launcher-category-icon').getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(nameNode);
          const nameText = range.getBoundingClientRect();
          return {
            width: box.width,
            height: box.height,
            containsName: name.left >= box.left && name.right <= box.right && name.top >= box.top && name.bottom <= box.bottom,
            containsBrowse: browse.left >= box.left && browse.right <= box.right && browse.top >= box.top && browse.bottom <= box.bottom,
            nameIconLeftOffset: Math.abs(nameText.left - icon.left),
          };
        })
        .filter((box) => box.width > 0);
      const search = launcher.querySelector('.launcher-search');
      const searchIcon = search.querySelector(':scope > .icon:first-child');
      const searchInput = search.querySelector('input');
      const searchBox = search.getBoundingClientRect();
      const iconBox = searchIcon.getBoundingClientRect();
      const inputBox = searchInput.getBoundingClientRect();
      const searchPaddingLeft = parseFloat(getComputedStyle(search).paddingLeft) || 0;
      const firstCellLeft = searchBox.left + searchPaddingLeft;
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        position: getComputedStyle(launcher).position,
        computedTop: getComputedStyle(launcher).top,
        computedTransform: getComputedStyle(launcher).transform,
        offsetParent: launcher.offsetParent && launcher.offsetParent.id,
        desktopRect: (() => {
          const desktop = document.getElementById('neo-desktop').getBoundingClientRect();
          return { top: desktop.top, bottom: desktop.bottom, height: desktop.height };
        })(),
        firstRow,
        iconBoxes,
        mediaIcon: mediaIcon ? {
          backgroundColor: mediaIconStyle.backgroundColor,
          backgroundImage: mediaIconStyle.backgroundImage,
          imageWidth: mediaImageBox?.width || 0,
          imageHeight: mediaImageBox?.height || 0,
        } : null,
        recent,
        categories,
        searchIconCenterOffset: Math.abs((iconBox.left + iconBox.width / 2) - (firstCellLeft + (inputBox.left - firstCellLeft) / 2)),
        horizontalOverflow: launcher.scrollWidth > launcher.clientWidth + 1,
      };
    });
  } finally {
    await browser.close();
  }
}

(async () => {
  for (const position of ['top', 'right', 'bottom', 'left']) {
    const viewport = position === 'bottom' ? { width: 878, height: 740 } : { width: 2048, height: 900 };
    const result = await measure(position, viewport);
    assert.ok(Math.abs(result.centerX - result.viewportWidth / 2) <= 1, `${position} launcher horizontal center is wrong: ${JSON.stringify(result)}`);
    assert.ok(Math.abs(result.centerY - result.viewportHeight / 2) <= 1, `${position} launcher vertical center is wrong: ${JSON.stringify(result)}`);
    assert.ok(result.left >= 0 && result.right <= result.viewportWidth, `${position} launcher exceeds horizontal bounds: ${JSON.stringify(result)}`);
    assert.ok(result.top >= 0 && result.bottom <= result.viewportHeight, `${position} launcher exceeds vertical bounds: ${JSON.stringify(result)}`);
    assert.ok(result.width <= 761, `${position} launcher stretched across the screen: ${JSON.stringify(result)}`);
    assert.ok(result.height <= 621, `${position} launcher is too tall: ${JSON.stringify(result)}`);
    assert.ok(result.firstRow.length >= 1 && result.firstRow.length <= 7, `${position} launcher did not form a bounded first row`);
    assert.ok(Math.max(...result.firstRow.map((tile) => tile.width)) - Math.min(...result.firstRow.map((tile) => tile.width)) <= 1, `${position} tile widths differ`);
    assert.ok(Math.max(...result.firstRow.map((tile) => tile.labelTop)) - Math.min(...result.firstRow.map((tile) => tile.labelTop)) <= 1, `${position} labels are not aligned`);
    assert.ok(result.iconBoxes.length >= result.firstRow.length, `${position} pinned icons are missing`);
    assert.ok(result.iconBoxes.every((box) => Math.abs(box.width - 38) <= 1 && Math.abs(box.height - 38) <= 1), `${position} pinned icons use inconsistent sizes: ${JSON.stringify(result.iconBoxes)}`);
    assert.ok(result.mediaIcon, `${position} Media Player icon is missing`);
    assert.equal(result.mediaIcon.backgroundColor, 'rgba(0, 0, 0, 0)', `${position} Media Player has an unwanted color tile`);
    assert.equal(result.mediaIcon.backgroundImage, 'none', `${position} Media Player has an unwanted background image`);
    assert.ok(result.mediaIcon.imageWidth > 0 && result.mediaIcon.imageWidth <= 38 && result.mediaIcon.imageHeight > 0 && result.mediaIcon.imageHeight <= 38, `${position} Media Player artwork escaped its icon box: ${JSON.stringify(result.mediaIcon)}`);
    assert.ok(result.recent.every((box) => Math.abs(box.height - 50) <= 1), `${position} recent rows use inconsistent heights: ${JSON.stringify(result.recent)}`);
    assert.ok(result.categories.every((box) => box.height <= 92 && box.containsName && box.containsBrowse), `${position} category labels escaped their cards: ${JSON.stringify(result.categories)}`);
    assert.ok(result.categories.every((box) => box.nameIconLeftOffset <= 1), `${position} category labels and icons are horizontally misaligned: ${JSON.stringify(result.categories)}`);
    assert.ok(result.searchIconCenterOffset <= 1, `${position} search icon is not centered: ${JSON.stringify(result)}`);
    assert.equal(result.horizontalOverflow, false, `${position} launcher has horizontal overflow`);
  }
  console.log('Launcher stays compact, screen-centered, and evenly aligned across every taskbar edge.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
