/* Owns first-visit selection and age changes. No game launching belongs here. */
((factory) => {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.KidscadeAgeNavigation = api.create({ document, storage: localStorage, setTimeout, clearTimeout });
})(() => {
  'use strict';
  const AGE_NAMES = Object.freeze({ toddler: '🐥 유아', low: '🎒 초등 저학년', high: '🚀 초등 고학년', job: '🧑‍🔬 직업체험' });
  const TRANSITION_MS = 650;
  const validAge = age => Object.hasOwn(AGE_NAMES, age);

  function create({ document, storage, setTimeout, clearTimeout }) {
    let phase = 'selecting';
    let age = '';
    let timer = null;
    let initialized = false;
    let callbacks = {};
    const element = id => document.getElementById(id);

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
        screen.querySelectorAll('.age-btn-card').forEach(button => { button.disabled = phase !== 'selecting'; });
      }
      document.body.dataset.kidscadeNavigation = phase;
      if (age) {
        document.body.dataset.kidscadeAge = age;
        if (element('current-age-label')) element('current-age-label').textContent = AGE_NAMES[age];
        if (element('kc-age-hero-label')) element('kc-age-hero-label').textContent = `${AGE_NAMES[age]} 오락실`;
      }
    }

    function showSelector(event) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      clearTimeout(timer);
      timer = null;
      phase = 'selecting';
      render();
      element('age-selection-screen')?.querySelector('.age-btn-card')?.focus();
    }

    function select(nextAge, event) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (!validAge(nextAge) || phase !== 'selecting') return false;
      phase = 'entering';
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
      if (validAge(saved)) { age = saved; phase = 'ready'; }
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

    return Object.freeze({ names: AGE_NAMES, init, select, showSelector, canLaunch, state: () => ({ phase, age }) });
  }
  return Object.freeze({ create, AGE_NAMES, TRANSITION_MS, validAge });
});
