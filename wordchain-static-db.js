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
      this.keyToGroup = new Map();
      this.groupPromises = new Map();
      this.bucketSets = new Map();
      this.blockedWords = new Set();
    }

    async init() {
      if (this.manifest) return this.manifest;
      if (!this.manifestPromise) {
        this.manifestPromise = (async () => {
          const response = await fetch(new URL('manifest.json', DATA_BASE), { cache: 'no-cache' });
          if (!response.ok) throw new Error(`wordchain manifest failed: ${response.status}`);
          const manifest = await response.json();
          if (!manifest || (!manifest.groups && !manifest.buckets)) {
            throw new Error('invalid wordchain manifest');
          }

          this.manifest = manifest;
          this.keyToGroup.clear();

          if (manifest.groups) {
            for (const [groupName, info] of Object.entries(manifest.groups)) {
              for (const key of Array.isArray(info?.keys) ? info.keys : []) {
                this.keyToGroup.set(key, { groupName, info });
              }
            }
          } else {
            for (const [key, info] of Object.entries(manifest.buckets || {})) {
              this.keyToGroup.set(key, { groupName: key, info: { ...info, keys: [key] } });
            }
          }

          try {
            const blocked = await fetch(new URL('blocked-words.txt', DATA_BASE), { cache: 'force-cache' });
            if (blocked.ok) {
              this.blockedWords = new Set(
                (await blocked.text()).split(/\r?\n/).map(normalizeWord).filter(Boolean)
              );
            }
          } catch (_) {
            this.blockedWords = new Set();
          }

          return manifest;
        })().catch(error => {
          this.manifestPromise = null;
          throw error;
        });
      }
      return this.manifestPromise;
    }

    async loadGroup(groupName, info) {
      if (this.groupPromises.has(groupName)) return this.groupPromises.get(groupName);

      const promise = (async () => {
        if (!info?.file) return;
        const response = await fetch(new URL(info.file, DATA_BASE), { cache: 'force-cache' });
        if (!response.ok) throw new Error(`wordchain group failed: ${groupName} ${response.status}`);
        const words = (await response.text()).split(/\r?\n/).map(normalizeWord).filter(Boolean);

        for (const word of words) {
          if (this.blockedWords.has(word)) continue;
          const key = bucketKeyForSyllable(word);
          if (!key) continue;
          if (!this.bucketSets.has(key)) this.bucketSets.set(key, new Set());
          this.bucketSets.get(key).add(word);
        }

        for (const key of Array.isArray(info.keys) ? info.keys : []) {
          if (!this.bucketSets.has(key)) this.bucketSets.set(key, new Set());
        }
      })().catch(error => {
        this.groupPromises.delete(groupName);
        throw error;
      });

      this.groupPromises.set(groupName, promise);
      return promise;
    }

    async loadBucketByKey(key) {
      if (!key) return new Set();
      await this.init();
      if (this.bucketSets.has(key)) return this.bucketSets.get(key);

      const group = this.keyToGroup.get(key);
      if (!group) {
        const empty = new Set();
        this.bucketSets.set(key, empty);
        return empty;
      }

      await this.loadGroup(group.groupName, group.info);
      return this.bucketSets.get(key) || new Set();
    }

    async loadForWord(word) {
      return this.loadBucketByKey(bucketKeyForSyllable(word));
    }

    async has(word) {
      const normalized = normalizeWord(word);
      if (!normalized || this.blockedWords.has(normalized)) return false;
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
          if (seen.has(word) || excluded.has(word) || this.blockedWords.has(word)) continue;
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

    async sample(options = {}, limit = 40) {
      await this.init();
      const minLength = Math.max(2, Number(options.minLength) || 2);
      const maxLength = Math.max(minLength, Math.min(24, Number(options.maxLength) || 24));
      const excluded = options.exclude instanceof Set
        ? options.exclude
        : new Set((options.exclude || []).map(normalizeWord));
      const predicate = typeof options.predicate === 'function' ? options.predicate : null;
      const target = Math.max(1, Math.min(300, Number(limit) || 40));
      const keys = [...this.keyToGroup.keys()];

      for (let i = keys.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [keys[i], keys[j]] = [keys[j], keys[i]];
      }

      const pool = [];
      const seen = new Set();
      for (const key of keys) {
        const set = await this.loadBucketByKey(key);
        const local = [];
        for (const word of set) {
          if (seen.has(word) || excluded.has(word) || this.blockedWords.has(word)) continue;
          const len = [...word].length;
          if (len < minLength || len > maxLength) continue;
          if (predicate && !predicate(word)) continue;
          seen.add(word);
          local.push(word);
        }
        for (let i = local.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [local[i], local[j]] = [local[j], local[i]];
        }
        pool.push(...local.slice(0, Math.max(18, target)));
        if (pool.length >= target * 4) break;
      }

      for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool.slice(0, target);
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
