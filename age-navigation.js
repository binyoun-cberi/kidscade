/* Owns first-visit selection and age changes. No game launching belongs here. */
((factory) => {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.KidscadeAgeNavigation = api.create({ document, storage: localStorage, setTimeout, clearTimeout });
})(() => {
  'use strict';

  const AGE_NAMES = Object.freeze({
    toddler: '유아 3~6세',
    low: '초등 1~3학년',
    high: '초등 4~6학년'
  });
  const AGE_ICONS = Object.freeze({ toddler: '🐥', low: '🎒', high: '🚀' });
  const TRANSITION_MS = 320;
  const validAge = age => Object.hasOwn(AGE_NAMES, age);

  function create({ document, storage, setTimeout, clearTimeout }) {
    let phase = 'selecting';
    let age = '';
    let timer = null;
    let initialized = false;
    let callbacks = {};
    let showCurrentSelection = false;
    const element = id => document.getElementById(id);

    function buttons() {
      return Array.from(element('age-selection-screen')?.querySelectorAll?.('.age-btn-card') || []);
    }

    function renderSelectionState() {
      buttons().forEach(button => {
        const selected = showCurrentSelection && phase === 'selecting' && button.dataset?.targetAge === age;
        button.classList?.toggle?.('is-current', selected);
        button.setAttribute?.('aria-current', selected ? 'true' : 'false');
        button.setAttribute?.('aria-label', selected
          ? `${AGE_NAMES[button.dataset?.targetAge] || '연령'} (현재 선택)`
          : (AGE_NAMES[button.dataset?.targetAge] || '연령 선택'));
      });
    }

    function render() {
      const screen = element('age-selection-screen');
      const main = element('main-app');
      const ready = phase === 'ready';

      if (main) {
        main.inert = !ready;
        main.style.display = ready ? 'block' : 'none';
        main.setAttribute('aria-hidden', String(!ready));
      }

      if (screen) {
        screen.style.display = ready ? 'none' : 'flex';
        // The fading screen must keep intercepting taps until the transition finishes.
        screen.style.visibility = ready ? 'hidden' : 'visible';
        screen.style.opacity = phase === 'selecting' ? '1' : '0';
        screen.inert = ready;
        screen.setAttribute('aria-hidden', String(ready));
        screen.setAttribute('aria-busy', String(phase === 'entering'));
        buttons().forEach(button => { button.disabled = phase !== 'selecting'; });
      }

      document.body.dataset.kidscadeNavigation = phase;
      renderSelectionState();

      if (age) {
        document.body.dataset.kidscadeAge = age;
        if (element('current-age-icon')) element('current-age-icon').textContent = AGE_ICONS[age];
        if (element('current-age-label')) element('current-age-label').textContent = AGE_NAMES[age];
        if (element('kc-age-hero-label')) element('kc-age-hero-label').textContent = `${AGE_ICONS[age]} ${AGE_NAMES[age]} 오락실`;
      }
    }

    function showSelector(event) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      clearTimeout(timer);
      timer = null;
      phase = 'selecting';
      showCurrentSelection = Boolean(age);
      render();
      const allButtons = buttons();
      const focusTarget = allButtons.find(button => button.dataset?.targetAge === age) || allButtons[0];
      focusTarget?.focus?.({ preventScroll: true });
    }

    function select(nextAge, event) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (!validAge(nextAge) || phase !== 'selecting') return false;
      phase = 'entering';
      showCurrentSelection = false;
      age = nextAge;
      try { storage.setItem('kidscade_age', age); } catch (_) { /* Session selection still works. */ }
      render();
      try { callbacks.onAgeChange?.(age); }
      catch (error) { console.error?.('[KidscadeAgeNavigation] onAgeChange failed:', error); }
      timer = setTimeout(() => {
        timer = null;
        phase = 'ready';
        render();
        // Keep keyboard focus on navigation, never on a game underneath the old selector.
        element('btn-change-age')?.focus({ preventScroll: true });
        try { callbacks.onEntered?.(age); }
        catch (error) { console.error?.('[KidscadeAgeNavigation] onEntered failed:', error); }
      }, TRANSITION_MS);
      return true;
    }

    function canLaunch(event) {
      return phase === 'ready' && !event?.repeat && !(event?.detail > 1) &&
        !event?.target?.closest?.('#age-selection-screen, .age-btn-card, #btn-change-age');
    }

    function init(options = {}) {
      if (initialized) return;
      initialized = true;
      callbacks = options;
      let saved;
      try { saved = storage.getItem('kidscade_age'); } catch (_) {}
      if (validAge(saved)) {
        age = saved;
        phase = 'ready';
      } else {
        // "job" used to be an age-gate option. It is now a Home 2.0 discovery rail.
        try {
          if (saved === 'job') storage.removeItem?.('kidscade_age');
        } catch (_) {}
      }
      render();

      // Navigation controls must be bound before consumer callbacks run.
      // A failure in filtering/dashboard code must never strand the age selector or topbar.
      element('age-selection-screen')?.addEventListener('click', event => {
        const button = event.target.closest?.('.age-btn-card');
        // Consume this gesture before any document-level game handler can see it.
        event.stopImmediatePropagation();
        event.preventDefault();
        if (button && select(button.dataset.targetAge, event)) {
          try { callbacks.onSelect?.(); }
          catch (error) { console.error?.('[KidscadeAgeNavigation] onSelect failed:', error); }
        }
      }, true);

      const changeButton = element('btn-change-age');
      if (changeButton) {
        if (changeButton.dataset) changeButton.dataset.kcAgeNavBound = '1';
        changeButton.addEventListener('click', event => {
          showSelector(event);
          try { callbacks.onChangeRequested?.(); }
          catch (error) { console.error?.('[KidscadeAgeNavigation] onChangeRequested failed:', error); }
        });
      }

      if (age) {
        try { callbacks.onAgeChange?.(age); }
        catch (error) { console.error?.('[KidscadeAgeNavigation] initial onAgeChange failed:', error); }
      }
    }

    return Object.freeze({
      names: AGE_NAMES,
      icons: AGE_ICONS,
      init,
      select,
      showSelector,
      canLaunch,
      state: () => ({ phase, age })
    });
  }

  return Object.freeze({ create, AGE_NAMES, AGE_ICONS, TRANSITION_MS, validAge });
});
