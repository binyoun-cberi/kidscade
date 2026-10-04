((factory) => {
  const root = typeof window !== 'undefined' ? window : null;
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.KidscadeTheme = Object.freeze(api);
})(root => {
  'use strict';

  const STORAGE_KEY = 'kidscade_darkmode';

  function read(storage = root?.localStorage) {
    try { return storage?.getItem?.(STORAGE_KEY) === 'true'; }
    catch (_) { return false; }
  }

  function write(enabled, storage = root?.localStorage) {
    try { storage?.setItem?.(STORAGE_KEY, String(Boolean(enabled))); }
    catch (_) {}
    return Boolean(enabled);
  }

  function apply(enabled, doc = root?.document) {
    doc?.body?.classList?.toggle?.('dark-mode', Boolean(enabled));
    const button = doc?.getElementById?.('theme-btn');
    if (button) {
      button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      const label = enabled ? '☀️ 밝은 모드' : '🌙 다크 모드';
      // The compact topbar rebinds after child-list mutations. Writing the same
      // text would retrigger that observer indefinitely and freeze the page.
      if (button.textContent !== label) button.textContent = label;
    }
    return Boolean(enabled);
  }

  function bind(options = {}) {
    const doc = options.document || root?.document;
    const storage = options.localStorage || root?.localStorage;
    const playSound = options.playSound || (() => {});
    const button = doc?.getElementById?.('theme-btn');
    let enabled = read(storage);
    apply(enabled, doc);
    if (!button || button.dataset.kcThemeBound === '1') return { enabled, bound:false };

    button.dataset.kcThemeBound = '1';
    button.addEventListener('click', () => {
      playSound('click');
      enabled = !enabled;
      write(enabled, storage);
      apply(enabled, doc);
    });
    return { enabled, bound:true };
  }

  return Object.freeze({ STORAGE_KEY, read, write, apply, bind });
});
