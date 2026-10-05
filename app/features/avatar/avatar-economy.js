((factory) => {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.KidscadeAvatarEconomy = Object.freeze(api);
})(() => {
  'use strict';

  const VERSION = 1;
  const PRICE_STEPS = Object.freeze([100, 200, 300, 500, 800, 1300]);
  const PRICE_CAP = 1300;

  function cleanCategory(value) {
    return String(value || '').trim();
  }

  function cleanId(value) {
    return String(value || '').trim();
  }

  function normalizeOwned(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const [category, values] of Object.entries(raw)) {
      const key = cleanCategory(category);
      if (!key || !Array.isArray(values)) continue;
      const unique = [...new Set(values.map(cleanId).filter(Boolean))];
      if (unique.length) out[key] = unique;
    }
    return out;
  }

  function priceForPurchaseCount(count) {
    const n = Math.max(0, Math.trunc(Number(count) || 0));
    return PRICE_STEPS[Math.min(n, PRICE_STEPS.length - 1)] || PRICE_CAP;
  }

  function ownedIds(raw, category) {
    const key = cleanCategory(category);
    return normalizeOwned(raw)[key] || [];
  }

  function isOwned(raw, category, id, defaultId = '') {
    const assetId = cleanId(id);
    if (!assetId) return false;
    if (assetId === cleanId(defaultId)) return true;
    return ownedIds(raw, category).includes(assetId);
  }

  function normalizePurchaseCount(value) {
    return Math.max(0, Math.trunc(Number(value) || 0));
  }

  function nextPrice(purchaseCount) {
    return priceForPurchaseCount(normalizePurchaseCount(purchaseCount));
  }

  function quote(raw, purchaseCount, category, id, defaultId = '') {
    const assetId = cleanId(id);
    const def = cleanId(defaultId);
    const free = Boolean(assetId) && assetId === def;
    const owned = free || isOwned(raw, category, assetId, def);
    return Object.freeze({
      category: cleanCategory(category),
      id: assetId,
      defaultId: def,
      free,
      owned,
      price: owned ? 0 : nextPrice(purchaseCount)
    });
  }

  function addOwned(raw, category, id, defaultId = '') {
    const next = normalizeOwned(raw);
    const key = cleanCategory(category);
    const assetId = cleanId(id);
    const def = cleanId(defaultId);
    if (!key || !assetId || assetId === def) return next;
    const list = next[key] || [];
    if (!list.includes(assetId)) next[key] = [...list, assetId];
    return next;
  }

  return Object.freeze({
    VERSION,
    PRICE_STEPS,
    PRICE_CAP,
    normalizeOwned,
    priceForPurchaseCount,
    ownedIds,
    isOwned,
    normalizePurchaseCount,
    nextPrice,
    quote,
    addOwned
  });
});
