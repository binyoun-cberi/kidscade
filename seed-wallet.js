((factory) => {
  const root = typeof window !== 'undefined' ? window : null;
  const library = factory();

  if (typeof module !== 'undefined' && module.exports) module.exports = library;
  if (!root) return;

  const instance = library.create({
    storageApi: root.KidscadeStorage || null,
    localStorage: root.localStorage || null,
    document: root.document || null,
    window: root
  });

  root.KidscadeSeedWallet = Object.freeze(instance);

  root.addEventListener?.('storage', event => {
    if (event?.key === instance.key) instance.syncFromStorage(event.newValue);
  });

  // 생활월드 등 기존 코드가 같은 탭에서 직접 localStorage를 갱신하는 동안에도
  // 메인 로비의 지갑 상태가 즉시 따라가도록 호환 이벤트를 받습니다.
  root.addEventListener?.('kidscade-seeds-change', event => {
    instance.syncFromStorage(event?.detail?.balance);
  });

  root.document?.addEventListener?.('kidscade:storage-changed', event => {
    if (event?.detail?.key === instance.key) instance.syncFromStorage(event.detail.value);
  });
})(() => {
  'use strict';

  const DEFAULT_KEY = 'kidscade_coins';
  const CHANGE_EVENT = 'kidscade:seed-balance-changed';

  function normalizeBalance(value) {
    const number = Math.round(Number(value) || 0);
    return Math.max(0, number);
  }

  function normalizeDelta(value) {
    return Math.trunc(Number(value) || 0);
  }

  function create(options = {}) {
    const storageApi = options.storageApi || null;
    const local = options.localStorage || null;
    const doc = options.document || null;
    const win = options.window || null;
    const key = storageApi?.keys?.seeds || DEFAULT_KEY;
    const listeners = new Set();
    let writing = false;

    function readStoredBalance() {
      if (storageApi?.getInt) return normalizeBalance(storageApi.getInt('seeds', 0));
      const parsed = Number.parseInt(local?.getItem?.(key) ?? '0', 10);
      return normalizeBalance(Number.isFinite(parsed) ? parsed : 0);
    }

    let balance = readStoredBalance();

    function emit(detail = {}) {
      const payload = Object.freeze({
        balance,
        delta: normalizeDelta(detail.delta),
        reason: String(detail.reason || ''),
        source: String(detail.source || 'wallet')
      });

      listeners.forEach(listener => {
        try { listener(payload); } catch (error) { console.warn('[KidscadeSeedWallet] listener failed:', error); }
      });

      if (doc?.dispatchEvent && typeof CustomEvent !== 'undefined') {
        doc.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: payload }));
      }
      return payload;
    }

    function writeBalance(next) {
      const normalized = normalizeBalance(next);
      writing = true;
      try {
        if (storageApi?.setRaw) storageApi.setRaw('seeds', normalized);
        else local?.setItem?.(key, String(normalized));
      } finally {
        writing = false;
      }
      balance = normalized;
      return balance;
    }

    function get() {
      // 다른 iframe이 먼저 값을 썼더라도 다음 지갑 작업은 최신 저장값을 기준으로 합니다.
      const stored = readStoredBalance();
      if (stored !== balance) balance = stored;
      return balance;
    }

    function set(value, meta = {}) {
      const before = get();
      const next = normalizeBalance(value);
      writeBalance(next);
      const payload = emit({
        delta: next - before,
        reason: meta.reason,
        source: meta.source || 'set'
      });
      return { ok: true, ...payload };
    }

    function change(amount, meta = {}) {
      const delta = normalizeDelta(amount);
      const before = get();
      if (delta === 0) {
        return { ok: true, balance: before, delta: 0, reason: String(meta.reason || ''), source: String(meta.source || 'change') };
      }

      const next = before + delta;
      if (next < 0) {
        return {
          ok: false,
          balance: before,
          delta,
          reason: String(meta.reason || ''),
          source: String(meta.source || 'change'),
          error: 'insufficient-balance'
        };
      }

      writeBalance(next);
      const payload = emit({
        delta,
        reason: meta.reason,
        source: meta.source || 'change'
      });
      return { ok: true, ...payload };
    }

    function earn(amount, meta = {}) {
      return change(Math.abs(normalizeDelta(amount)), { ...meta, source: meta.source || 'earn' });
    }

    function spend(amount, meta = {}) {
      return change(-Math.abs(normalizeDelta(amount)), { ...meta, source: meta.source || 'spend' });
    }

    function syncFromStorage(explicitValue) {
      if (writing) return balance;
      const next = explicitValue === null || explicitValue === undefined
        ? readStoredBalance()
        : normalizeBalance(explicitValue);
      if (next === balance) return balance;
      const previous = balance;
      balance = next;
      emit({ delta: next - previous, source: 'storage-sync' });
      return balance;
    }

    function subscribe(listener, options = {}) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      if (options.immediate !== false) {
        listener(Object.freeze({ balance: get(), delta: 0, reason: '', source: 'subscribe' }));
      }
      return () => listeners.delete(listener);
    }

    return Object.freeze({
      key,
      eventName: CHANGE_EVENT,
      get,
      set,
      change,
      earn,
      spend,
      syncFromStorage,
      subscribe
    });
  }

  return Object.freeze({ create, normalizeBalance, normalizeDelta, DEFAULT_KEY, CHANGE_EVENT });
});
