(function () {
  'use strict';
  function initialise() {
    document.querySelectorAll('button').forEach(button => {
      if (!button.type) button.type = 'button';
      if (!button.getAttribute('aria-label') && !button.textContent.trim()) button.setAttribute('aria-label', button.title || button.id);
    });
    document.querySelectorAll('.patch-check,.sidebar-master-check').forEach(control => {
      control.setAttribute('role','checkbox');
      control.tabIndex = 0;
      const sync = () => control.setAttribute('aria-checked', String(control.classList.contains('checked')));
      sync();
      control.addEventListener('keydown', event => {
        if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); control.click(); sync(); }
      });
      new MutationObserver(sync).observe(control,{attributes:true,attributeFilter:['class']});
    });
    document.querySelectorAll('.settings-nav-item').forEach(item => item.setAttribute('role','tab'));
    document.querySelectorAll('.settings-nav-item').forEach(item => new MutationObserver(() => item.setAttribute('aria-selected',String(item.classList.contains('active')))).observe(item,{attributes:true,attributeFilter:['class']}));
    document.getElementById('statusText')?.setAttribute('aria-live','polite');
    const tutorial = document.getElementById('patcherTutorialOverlay');
    if (tutorial) { tutorial.setAttribute('role','dialog'); tutorial.setAttribute('aria-modal','true'); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',initialise,{once:true}); else initialise();
})();
