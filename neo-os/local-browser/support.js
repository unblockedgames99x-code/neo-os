(() => {
  'use strict';

  const draftKey = 'neo_support_draft_v1';
  const form = document.getElementById('support-form');
  const app = document.getElementById('support-app');
  const description = document.getElementById('support-description');
  const status = document.getElementById('support-status');
  const diagnostics = document.getElementById('support-diagnostics');

  function systemDetails() {
    let shell = {};
    let preferences = {};
    try { shell = JSON.parse(localStorage.getItem('neo_os_settings_v1') || '{}'); } catch (_) {}
    try { preferences = JSON.parse(localStorage.getItem('neo_desktop_preferences_v1') || '{}'); } catch (_) {}
    return [
      'Time: ' + new Date().toISOString(),
      'Style: ' + (shell.interfaceStyle || 'modern'),
      'Theme: ' + (preferences.theme || 'graphite'),
      'Screen: ' + window.screen.width + '×' + window.screen.height,
      'Viewport: ' + window.innerWidth + '×' + window.innerHeight,
      'Browser: ' + navigator.userAgent
    ];
  }

  function reportText() {
    return [
      'NEO OS Support Report',
      'App: ' + app.value,
      '',
      description.value.trim() || '(No description entered)',
      '',
      'Diagnostics',
      ...systemDetails()
    ].join('\n');
  }

  function setStatus(message) { status.textContent = message; }
  function saveDraft() {
    localStorage.setItem(draftKey, JSON.stringify({ app: app.value, description: description.value }));
    setStatus('Draft saved on this device.');
  }

  try {
    const saved = JSON.parse(localStorage.getItem(draftKey) || '{}');
    if (saved.app) app.value = saved.app;
    if (saved.description) description.value = saved.description;
  } catch (_) {}

  diagnostics.textContent = systemDetails().slice(1, 5).join(' · ');
  form.addEventListener('submit', event => { event.preventDefault(); saveDraft(); });
  document.getElementById('support-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(reportText());
      setStatus('Report copied.');
    } catch (_) {
      setStatus('Copy was blocked. Download the report instead.');
    }
  });
  document.getElementById('support-download').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([reportText()], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'neo-support-report.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Report downloaded.');
  });
  document.getElementById('support-clear').addEventListener('click', () => {
    localStorage.removeItem(draftKey);
    description.value = '';
    app.value = 'NEO OS';
    setStatus('Draft cleared.');
    description.focus();
  });
})();
