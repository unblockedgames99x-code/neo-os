(() => {
  'use strict';

  const menuButton = document.getElementById('neoBrowserMoreButton');
  const menu = document.getElementById('neoBrowserMenu');
  const audioButton = document.getElementById('neoAudioButton');
  const transportStatus = document.getElementById('neoTransportStatus');
  const tabStrip = document.getElementById('tabStrip');

  function setMenu(open) {
    if (!menu || !menuButton) return;
    menu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
  }

  function activeTab() {
    return tabStrip?.querySelector('.tab.active') || null;
  }

  function syncAudioButton() {
    if (!audioButton) return;
    const muted = activeTab()?.classList.contains('muted') || false;
    audioButton.setAttribute('aria-pressed', String(muted));
    audioButton.title = muted ? 'Unmute this tab' : 'Mute this tab';
    const icon = audioButton.querySelector('i');
    const label = audioButton.querySelector('span');
    if (icon) icon.className = `fas ${muted ? 'fa-volume-xmark' : 'fa-volume-high'}`;
    if (label) label.textContent = muted ? 'Muted' : 'Audio';
  }

  menuButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    setMenu(menu.hidden);
  });

  menu?.addEventListener('click', (event) => {
    const action = event.target.closest('[data-neo-target]');
    if (!action) return;
    const target = document.getElementById(action.dataset.neoTarget);
    setMenu(false);
    target?.click();
  });

  audioButton?.addEventListener('click', () => {
    const muteControl = activeTab()?.querySelector('.tab-mute-icon');
    if (muteControl) {
      muteControl.click();
      queueMicrotask(syncAudioButton);
      return;
    }
    try {
      document.getElementById('frame')?.contentWindow?.postMessage({ type: 'neo:setMuted', muted: true }, '*');
    } catch (_) {}
  });

  document.addEventListener('pointerdown', (event) => {
    if (!menu || menu.hidden || menu.contains(event.target) || menuButton?.contains(event.target)) return;
    setMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
  });

  if (tabStrip) {
    new MutationObserver(syncAudioButton).observe(tabStrip, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  window.addEventListener('neo:scramjet:transportready', (event) => {
    if (!transportStatus) return;
    const host = (() => {
      try { return new URL(event.detail?.relay || '').host; } catch (_) { return ''; }
    })();
    transportStatus.textContent = host ? `Fast path · ${host}` : 'Fast path ready';
    transportStatus.className = 'neo-transport-status is-ready';
  });

  window.addEventListener('neo:scramjet:error', () => {
    if (!transportStatus) return;
    transportStatus.textContent = 'Retrying connection';
    transportStatus.className = 'neo-transport-status is-error';
  });

  syncAudioButton();
})();
