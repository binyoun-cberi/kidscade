/* Trade intelligence helpers for Byeokrando; independent implementation (not GPL-derived). */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ByeokrandoTradeIntelCore = api;
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';

  const MAX_EVENTS = 80;

  function quantity(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  function cargoChanges(previous, current) {
    const left = previous && typeof previous === 'object' ? previous : {};
    const right = current && typeof current === 'object' ? current : {};
    const ids = new Set([...Object.keys(left), ...Object.keys(right)]);
    return [...ids].map(id => ({
      id,
      before: quantity(left[id]),
      after: quantity(right[id]),
      delta: quantity(right[id]) - quantity(left[id])
    })).filter(change => change.delta !== 0);
  }

  function goodsName(goods, id) {
    const value = goods && goods[id];
    const name = typeof value === 'string' ? value : value && value.name;
    return typeof name === 'string' && name.trim() ? name.trim() : String(id);
  }

  function portName(ports, id) {
    const value = ports && ports[id];
    const name = typeof value === 'string' ? value : value && (value.name || value.label);
    return typeof name === 'string' && name.trim() ? name.trim() : String(id || '항구');
  }

  function shortText(input, limit = 220) {
    const text = typeof input === 'string' ? input.replace(/\s+/g, ' ').trim() : '';
    if (!text) return '';
    return text.length > limit ? text.slice(0, limit - 1) + '…' : text;
  }

  function nativeRumor(state) {
    if (!state || typeof state !== 'object') return '';
    for (const field of ['heardRumors', 'rumorLog', 'knownRumors', 'rumors']) {
      const entry = state[field];
      if (!Array.isArray(entry) || !entry.length) continue;
      const last = entry[entry.length - 1];
      const value = typeof last === 'string' ? last : last && (last.text || last.message || last.description);
      const text = shortText(value);
      if (text.length >= 8) return text;
    }
    return '';
  }

  function normalizeJournal(raw) {
    const value = raw && typeof raw === 'object' ? raw : {};
    const entries = Array.isArray(value.entries) ? value.entries : [];
    return {
      version: 1,
      entries: entries.filter(entry => entry && typeof entry === 'object'
        && ['trade', 'rumor', 'visit', 'arrival', 'departure'].includes(entry.kind))
        .slice(-MAX_EVENTS).map(entry => ({
          kind: entry.kind,
          port: shortText(entry.port, 64),
          name: shortText(entry.name, 90),
          text: shortText(entry.text),
          qty: quantity(entry.qty),
          direction: entry.direction === 'sell' ? 'sell' : 'buy',
          at: Number.isFinite(Number(entry.at)) ? Number(entry.at) : 0
        }))
    };
  }

  function appendEntry(journal, entry) {
    const previous = normalizeJournal(journal);
    return normalizeJournal({ entries: [...previous.entries, entry] });
  }

  return Object.freeze({
    cargoChanges, goodsName, portName, shortText, nativeRumor,
    normalizeJournal, appendEntry
  });
});
