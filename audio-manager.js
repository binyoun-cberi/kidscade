((factory) => {
  const root = typeof window !== 'undefined' ? window : null;
  const localApi = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = localApi;
  if (!root) return;

  let shared = localApi;
  try {
    if (root.parent && root.parent !== root && root.parent.KidscadeAudio) shared = root.parent.KidscadeAudio;
  } catch (_) {}
  root.KidscadeAudio = shared;

  const unlock = () => shared.unlock?.();
  ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(type => {
    root.addEventListener?.(type, unlock, { capture: true, passive: type !== 'keydown' });
  });
  shared.ready?.().catch?.(() => {});
})(root => {
  'use strict';

  const SETTINGS_KEY = 'kidscade_audio_settings_v1';
  const ALIASES = Object.freeze({
    jump: 'movement.jump',
    hurt: 'combat.hurt_grunt',
    impact: 'combat.impact_heavy',
    missile: 'combat.missile_launch',
    whoosh: 'combat.projectile_whoosh',
    pickup: 'collect.coin_pickup',
    drop: 'collect.coin_drop',
    correct: 'success.cheer_yay',
    cheer: 'success.cheer_woohoo',
    victory: 'success.victory_fanfare',
    wrong: 'failure.fail_sting',
    disappointed: 'failure.disappointed_voice',
    purchase: 'shop.purchase',
    register: 'shop.register_open'
  });

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));
  const listeners = new Set();
  const active = new Set();
  const buffers = new Map();
  const lastPlayed = new Map();
  let catalog = null;
  let catalogPromise = null;
  let audioContext = null;
  let masterGain = null;

  function storage() {
    try { return root?.localStorage || null; } catch (_) { return null; }
  }

  function sharedStorage() {
    return root?.KidscadeStorage || null;
  }

  function loadSettings() {
    try {
      const shared = sharedStorage();
      const parsed = shared?.getJson
        ? shared.getJson('audioSettings', {})
        : JSON.parse(storage()?.getItem(SETTINGS_KEY) || '{}');
      return { muted: Boolean(parsed?.muted), volume: clamp(parsed?.volume ?? 0.82) };
    } catch (_) {
      return { muted: false, volume: 0.82 };
    }
  }

  let settings = loadSettings();

  function saveSettings() {
    try {
      const shared = sharedStorage();
      if (shared?.setJson) shared.setJson('audioSettings', settings);
      else storage()?.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (_) {}
  }

  function scriptBaseUrl() {
    if (!root?.document) return 'file:///';
    const own = root.document.currentScript?.src ||
      Array.from(root.document.scripts || []).find(script => /(?:^|\/)audio-manager\.js(?:\?|$)/.test(script.src || ''))?.src ||
      root.location?.href || 'file:///';
    try { return new URL('.', own).href; } catch (_) { return root.location?.href || 'file:///'; }
  }

  function catalogUrl() {
    return new URL('assets/audio/audio-catalog.json', scriptBaseUrl()).href;
  }

  function normalizeCatalog(input) {
    const sounds = {};
    Object.entries(input?.sounds || {}).forEach(([key, variants]) => {
      const list = Array.isArray(variants) ? variants : [variants];
      sounds[String(key)] = list.map(value => String(value || '').trim()).filter(Boolean);
    });
    return {
      version: Number(input?.version || 1),
      basePath: String(input?.basePath || 'assets/audio/'),
      sounds
    };
  }

  async function ready() {
    if (catalog) return catalog;
    if (catalogPromise) return catalogPromise;
    catalogPromise = (async () => {
      if (!root?.fetch) return normalizeCatalog({});
      const response = await root.fetch(catalogUrl(), { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Kidscade audio catalog ${response.status}`);
      catalog = normalizeCatalog(await response.json());
      emit('catalog-ready', { version: catalog.version });
      return catalog;
    })().catch(error => {
      console.warn?.('[KidscadeAudio] catalog load failed', error);
      catalog = normalizeCatalog({});
      return catalog;
    });
    return catalogPromise;
  }

  function resolveKey(key) {
    const normalized = String(key || '').trim();
    return ALIASES[normalized] || normalized;
  }

  async function resolveVariants(key) {
    const data = await ready();
    const resolved = resolveKey(key);
    return { key: resolved, variants: data.sounds[resolved] || [] };
  }

  function resolveAssetUrl(relativePath) {
    const base = catalog?.basePath || 'assets/audio/';
    return new URL(`${base}${String(relativePath || '').replace(/^\/+/, '')}`, scriptBaseUrl()).href;
  }

  function ensureContext() {
    if (audioContext) return audioContext;
    const AudioCtor = root?.AudioContext || root?.webkitAudioContext;
    if (!AudioCtor) return null;
    try {
      audioContext = new AudioCtor();
      masterGain = audioContext.createGain();
      masterGain.gain.value = settings.muted ? 0 : settings.volume;
      masterGain.connect(audioContext.destination);
      return audioContext;
    } catch (error) {
      console.warn?.('[KidscadeAudio] AudioContext unavailable', error);
      return null;
    }
  }

  async function unlock() {
    const ctx = ensureContext();
    if (!ctx) return false;
    try {
      if (ctx.state === 'suspended') await ctx.resume();
      return ctx.state === 'running';
    } catch (_) {
      return false;
    }
  }

  async function loadBuffer(url) {
    if (buffers.has(url)) return buffers.get(url);
    const promise = (async () => {
      const ctx = ensureContext();
      if (!ctx || !root?.fetch) return null;
      const response = await root.fetch(url, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Audio asset ${response.status}: ${url}`);
      const bytes = await response.arrayBuffer();
      return ctx.decodeAudioData(bytes.slice(0));
    })().catch(error => {
      console.warn?.('[KidscadeAudio] asset load failed', error);
      buffers.delete(url);
      return null;
    });
    buffers.set(url, promise);
    return promise;
  }

  function choose(list, random = Math.random) {
    if (!Array.isArray(list) || !list.length) return '';
    return list[Math.floor(clamp(random(), 0, 0.999999) * list.length)] || list[0];
  }

  async function play(key, options = {}) {
    if (settings.muted) return { ok: false, reason: 'muted' };
    const resolved = await resolveVariants(key);
    if (!resolved.variants.length) return { ok: false, reason: 'missing-key', key: resolved.key };

    const now = root?.performance?.now?.() ?? Date.now();
    const cooldownMs = Math.max(0, Number(options.cooldownMs || 0));
    const previous = lastPlayed.get(resolved.key) || -Infinity;
    if (cooldownMs && now - previous < cooldownMs) return { ok: false, reason: 'cooldown', key: resolved.key };
    lastPlayed.set(resolved.key, now);

    const relativePath = options.variant || choose(resolved.variants, options.random || Math.random);
    const url = resolveAssetUrl(relativePath);
    const ctx = ensureContext();
    if (!ctx) return playHtmlAudio(resolved.key, url, options);
    await unlock();
    const buffer = await loadBuffer(url);
    if (!buffer) return playHtmlAudio(resolved.key, url, options);

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const jitter = Math.max(0, Number(options.rateJitter || 0));
    const baseRate = Math.max(0.25, Number(options.rate || 1));
    source.buffer = buffer;
    source.loop = Boolean(options.loop);
    source.playbackRate.value = baseRate * (jitter ? 1 + (Math.random() * 2 - 1) * jitter : 1);
    gain.gain.value = clamp(options.volume ?? 1, 0, 2);
    source.connect(gain).connect(masterGain);
    const record = { key: resolved.key, source, gain, url, stop: () => { try { source.stop(); } catch (_) {} } };
    active.add(record);
    source.onended = () => active.delete(record);
    source.start(0);
    emit('play', { key: resolved.key, url });
    return { ok: true, key: resolved.key, url, stop: record.stop };
  }

  function playHtmlAudio(key, url, options = {}) {
    if (!root?.Audio) return { ok: false, reason: 'no-audio-backend', key };
    const element = new root.Audio(url);
    element.volume = clamp(settings.volume * (options.volume ?? 1));
    element.loop = Boolean(options.loop);
    element.playbackRate = Math.max(0.25, Number(options.rate || 1));
    const record = { key, element, url, stop: () => { try { element.pause(); element.currentTime = 0; } catch (_) {} } };
    active.add(record);
    element.addEventListener?.('ended', () => active.delete(record), { once: true });
    const started = element.play?.();
    started?.catch?.(() => active.delete(record));
    emit('play', { key, url, backend: 'html-audio' });
    return { ok: true, key, url, stop: record.stop };
  }

  async function playAny(keys, options = {}) {
    const list = (Array.isArray(keys) ? keys : [keys]).filter(Boolean);
    if (!list.length) return { ok: false, reason: 'empty-list' };
    return play(choose(list, options.random || Math.random), options);
  }

  async function preload(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    await ready();
    const urls = [];
    for (const key of list.filter(Boolean)) {
      const resolved = await resolveVariants(key);
      resolved.variants.forEach(path => urls.push(resolveAssetUrl(path)));
    }
    await Promise.allSettled([...new Set(urls)].map(loadBuffer));
    return urls.length;
  }

  function stop(key) {
    const resolved = key ? resolveKey(key) : '';
    for (const record of [...active]) {
      if (!resolved || record.key === resolved) {
        record.stop?.();
        active.delete(record);
      }
    }
  }

  function setMuted(value) {
    settings = { ...settings, muted: Boolean(value) };
    if (masterGain && audioContext) masterGain.gain.setTargetAtTime(settings.muted ? 0 : settings.volume, audioContext.currentTime, 0.015);
    saveSettings();
    emit('settings', settings);
    return settings.muted;
  }

  function setVolume(value) {
    settings = { ...settings, volume: clamp(value) };
    if (masterGain && audioContext && !settings.muted) masterGain.gain.setTargetAtTime(settings.volume, audioContext.currentTime, 0.015);
    saveSettings();
    emit('settings', settings);
    return settings.volume;
  }

  function getSettings() { return { ...settings }; }
  function has(key) { return Boolean(catalog?.sounds?.[resolveKey(key)]?.length); }

  function emit(type, detail = {}) {
    const payload = { type, ...detail };
    listeners.forEach(listener => { try { listener(payload); } catch (_) {} });
    try { root?.document?.dispatchEvent(new CustomEvent('kidscade:audio', { detail: payload })); } catch (_) {}
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return Object.freeze({
    aliases: ALIASES,
    normalizeCatalog,
    resolveKey,
    choose,
    ready,
    unlock,
    has,
    play,
    playAny,
    preload,
    stop,
    stopAll: () => stop(),
    setMuted,
    setVolume,
    getSettings,
    subscribe
  });
});
