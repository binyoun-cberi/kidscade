(() => {
  'use strict';

  const SCRIPT_URL = document.currentScript?.src || location.href;
  const DATA_BASE = new URL('data/wordchain/', SCRIPT_URL);
  const CHO_KEYS = Object.freeze(['g','gg','n','d','dd','r','m','b','bb','s','ss','ng','j','jj','ch','k','t','p','h']);

  function normalizeWord(value) {
    return String(value || '')
      .normalize('NFC')
      .replace(/[\s·ㆍ・\-]/g, '')
      .trim()
      .slice(0, 24);
  }

  function firstSyllable(value) {
    return [...normalizeWord(value)][0] || '';
  }

  function bucketKeyForSyllable(syllable) {
    const ch = firstSyllable(syllable);
    if (!ch) return null;
    const code = ch.codePointAt(0) - 0xac00;
    if (code < 0 || code > 11171) return null;
    return CHO_KEYS[Math.floor(code / 588)] || null;
  }

  class StaticWordchainDB {
    constructor() {
      this.manifest = null;
      this.manifestPromise = null;
      this.bucketPromises = new Map();
      this.bucketSets = new Map();
    }

    async init() {
      if (this.manifest) return this.manifest;
      if (!this.manifestPromise) {
        this.manifestPromise = fetch(new URL('manifest.json', DATA_BASE), { cache: 'no-cache' })
          .then(async response => {
            if (!response.ok) throw new Error(`wordchain manifest failed: ${response.status}`);
            const manifest = await response.json();
            if (!manifest || !manifest.buckets) throw new Error('invalid wordchain manifest');
            this.manifest = manifest;
            return manifest;
          })
          .catch(error => {
            this.manifestPromise = null;
            throw error;
          });
      }
      return this.manifestPromise;
    }

    async loadBucketByKey(key) {
      if (!key) return new Set();
      if (this.bucketSets.has(key)) return this.bucketSets.get(key);
      if (this.bucketPromises.has(key)) return this.bucketPromises.get(key);

      const promise = (async () => {
        const manifest = await this.init();
        const info = manifest.buckets?.[key];
        if (!info?.file) return new Set();
        const response = await fetch(new URL(info.file, DATA_BASE), { cache: 'force-cache' });
        if (!response.ok) throw new Error(`wordchain bucket failed: ${key} ${response.status}`);
        const text = await response.text();
        const set = new Set(
          text.split(/\r?\n/)
            .map(normalizeWord)
            .filter(Boolean)
        );
        this.bucketSets.set(key, set);
        return set;
      })().catch(error => {
        this.bucketPromises.delete(key);
        throw error;
      });

      this.bucketPromises.set(key, promise);
      return promise;
    }

    async loadForWord(word) {
      return this.loadBucketByKey(bucketKeyForSyllable(word));
    }

    async has(word) {
      const normalized = normalizeWord(word);
      if (!normalized) return false;
      const set = await this.loadForWord(normalized);
      return set.has(normalized);
    }

    async candidates(initials, exclude = [], limit = 12) {
      const required = [...new Set((Array.isArray(initials) ? initials : [initials])
        .map(firstSyllable)
        .filter(Boolean))];
      const excluded = exclude instanceof Set ? exclude : new Set(exclude.map(normalizeWord));
      const keys = [...new Set(required.map(bucketKeyForSyllable).filter(Boolean))];
      const sets = await Promise.all(keys.map(key => this.loadBucketByKey(key)));
      const pool = [];
      const seen = new Set();

      for (const set of sets) {
        for (const word of set) {
          if (seen.has(word) || excluded.has(word)) continue;
          if (!required.includes(firstSyllable(word))) continue;
          seen.add(word);
          pool.push(word);
        }
      }

      for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool.slice(0, Math.max(1, Math.min(30, Number(limit) || 12)));
    }

    get loadedBucketCount() {
      return this.bucketSets.size;
    }

    get total() {
      return Number(this.manifest?.total || 0);
    }
  }

  window.KidscadeWordDB = new StaticWordchainDB();
  window.KidscadeWordDBUtils = Object.freeze({
    normalizeWord,
    bucketKeyForSyllable
  });
})();
