(function migrateLegacyProfile() {
  'use strict';
  const oldName = ['g','u','s','t'].join('');
  const oldPrefix = oldName + ':';
  const newPrefix = 'neo:';
  const discard = /(?:skin|theme|gxmod|zen|discord|wallpaper:provider)/i;
  try {
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter(Boolean);
    keys.forEach(key => {
      if (!key.startsWith(oldPrefix) || discard.test(key)) return;
      const next = newPrefix + key.slice(oldPrefix.length);
      if (localStorage.getItem(next) === null) {
        const value = String(localStorage.getItem(key) || '').replaceAll(oldPrefix, newPrefix);
        localStorage.setItem(next, value);
      }
    });
    const oldAi = oldName + '_ai_ctx';
    if (localStorage.getItem('neo_ai_ctx') === null && localStorage.getItem(oldAi) !== null) {
      localStorage.setItem('neo_ai_ctx', localStorage.getItem(oldAi));
    }
    ['skin','theme','gxmod','zen','discord'].forEach(fragment => {
      keys.filter(key => key.toLowerCase().includes(fragment)).forEach(key => localStorage.removeItem(key));
    });
  } catch (_) {}
})();
