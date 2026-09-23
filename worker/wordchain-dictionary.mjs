const CHO_KEYS = Object.freeze(['g','gg','n','d','dd','r','m','b','bb','s','ss','ng','j','jj','ch','k','t','p','h']);
const IOTIZED_OR_I = new Set([2,6,7,12,17,20]);
const assetCaches = new WeakMap();

export function normalizeKoreanWord(value) {
  return String(value || '').normalize('NFC').replace(/[\s·ㆍ・\-]/g, '').trim().slice(0, 24);
}

export function isHangulWord(value) {
  const chars = [...normalizeKoreanWord(value)];
  return chars.length >= 2 && chars.length <= 24 && chars.every(char => {
    const code = char.codePointAt(0);
    return code >= 0xac00 && code <= 0xd7a3;
  });
}

function replaceInitial(syllable, nextInitialIndex) {
  const code = syllable.codePointAt(0) - 0xac00;
  if (code < 0 || code > 11171) return syllable;
  const jung = Math.floor((code % 588) / 28);
  const jong = code % 28;
  return String.fromCodePoint(0xac00 + (nextInitialIndex * 21 + jung) * 28 + jong);
}

export function allowedWordchainInitials(lastSyllable, useDueum = true) {
  const syllable = String(lastSyllable || '').normalize('NFC').slice(0, 1);
  const codePoint = syllable.codePointAt(0);
  if (!codePoint || codePoint < 0xac00 || codePoint > 0xd7a3) return [];
  const out = [syllable];
  if (!useDueum) return out;
  const code = codePoint - 0xac00;
  const cho = Math.floor(code / 588);
  const jung = Math.floor((code % 588) / 28);
  if (cho === 5) out.push(replaceInitial(syllable, IOTIZED_OR_I.has(jung) ? 11 : 2));
  else if (cho === 2 && IOTIZED_OR_I.has(jung)) out.push(replaceInitial(syllable, 11));
  return [...new Set(out)];
}

function bucketKeyForSyllable(value) {
  const syllable = String(value || '').normalize('NFC').slice(0, 1);
  const code = syllable.codePointAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  return CHO_KEYS[Math.floor(code / 588)] || null;
}

function cacheFor(env) {
  if (!env?.ASSETS || typeof env.ASSETS.fetch !== 'function') throw new Error('wordchain-static-assets-not-configured');
  let cache = assetCaches.get(env.ASSETS);
  if (!cache) {
    cache = { manifest: null, manifestPromise: null, blocked: null, blockedPromise: null, groups: new Map() };
    assetCaches.set(env.ASSETS, cache);
  }
  return cache;
}

async function assetText(request, env, path) {
  const url = new URL(path, request.url);
  const response = await env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }));
  if (!response.ok) throw new Error(`wordchain-asset-${response.status}`);
  return response.text();
}

async function dictionaryManifest(request, env) {
  const cache = cacheFor(env);
  if (cache.manifest) return cache.manifest;
  if (!cache.manifestPromise) {
    cache.manifestPromise = assetText(request, env, '/data/wordchain/manifest.json')
      .then(text => JSON.parse(text))
      .then(manifest => {
        if (!manifest?.groups) throw new Error('invalid-wordchain-manifest');
        cache.manifest = manifest;
        return manifest;
      })
      .catch(error => {
        cache.manifestPromise = null;
        throw error;
      });
  }
  return cache.manifestPromise;
}

async function blockedWords(request, env) {
  const cache = cacheFor(env);
  if (cache.blocked) return cache.blocked;
  if (!cache.blockedPromise) {
    cache.blockedPromise = assetText(request, env, '/data/wordchain/blocked-words.txt')
      .then(text => new Set(text.split(/\r?\n/).map(normalizeKoreanWord).filter(Boolean)))
      .catch(() => new Set())
      .then(set => {
        cache.blocked = set;
        return set;
      });
  }
  return cache.blockedPromise;
}

async function dictionarySetForKey(request, env, key) {
  if (!key) return new Set();
  const cache = cacheFor(env);
  const manifest = await dictionaryManifest(request, env);
  let targetName = null;
  let targetInfo = null;
  for (const [name, info] of Object.entries(manifest.groups || {})) {
    if (Array.isArray(info?.keys) && info.keys.includes(key)) {
      targetName = name;
      targetInfo = info;
      break;
    }
  }
  if (!targetName || !targetInfo?.file) return new Set();
  if (!cache.groups.has(targetName)) {
    cache.groups.set(targetName, (async () => {
      const blocked = await blockedWords(request, env);
      const text = await assetText(request, env, `/data/wordchain/${targetInfo.file}`);
      const byKey = new Map();
      for (const groupKey of targetInfo.keys || []) byKey.set(groupKey, new Set());
      for (const raw of text.split(/\r?\n/)) {
        const word = normalizeKoreanWord(raw);
        if (!word || blocked.has(word)) continue;
        const wordKey = bucketKeyForSyllable([...word][0]);
        if (!byKey.has(wordKey)) byKey.set(wordKey, new Set());
        byKey.get(wordKey).add(word);
      }
      return byKey;
    })().catch(error => {
      cache.groups.delete(targetName);
      throw error;
    }));
  }
  const byKey = await cache.groups.get(targetName);
  return byKey.get(key) || new Set();
}

export async function dictionaryLookup(request, env, word) {
  const normalized = normalizeKoreanWord(word);
  const blocked = await blockedWords(request, env);
  if (blocked.has(normalized)) return { exists: false, blocked: true };
  const key = bucketKeyForSyllable([...normalized][0]);
  const set = await dictionarySetForKey(request, env, key);
  return { exists: set.has(normalized), blocked: false };
}

export async function hasContinuation(request, env, word, usedWords) {
  const last = [...word].at(-1);
  const initials = allowedWordchainInitials(last, true);
  for (const initial of initials) {
    const key = bucketKeyForSyllable(initial);
    const set = await dictionarySetForKey(request, env, key);
    for (const candidate of set) {
      if (usedWords.has(candidate)) continue;
      if (initials.includes([...candidate][0])) return true;
    }
  }
  return false;
}
