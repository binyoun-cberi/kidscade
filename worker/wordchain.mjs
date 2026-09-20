const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff'
});

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

async function parseJson(request) {
  const type = request.headers.get('content-type') || '';
  if (!type.toLowerCase().includes('application/json')) throw new Error('json-required');
  return request.json();
}

export function normalizeKoreanWord(value) {
  return String(value || '')
    .normalize('NFC')
    .replace(/[\s·ㆍ・\-]/g, '')
    .trim()
    .slice(0, 24);
}

function isHangulSyllable(char) {
  if (!char || [...char].length !== 1) return false;
  const code = char.codePointAt(0);
  return code >= 0xac00 && code <= 0xd7a3;
}

export function isPlayableWord(word) {
  const chars = [...normalizeKoreanWord(word)];
  return chars.length >= 2 && chars.length <= 24 && chars.every(isHangulSyllable);
}

function replaceInitial(syllable, nextInitialIndex) {
  const code = syllable.codePointAt(0) - 0xac00;
  if (code < 0 || code > 11171) return syllable;
  const jung = Math.floor((code % 588) / 28);
  const jong = code % 28;
  return String.fromCodePoint(0xac00 + (nextInitialIndex * 21 + jung) * 28 + jong);
}

// 초성 index: ㄱ0 ㄲ1 ㄴ2 ㄷ3 ㄸ4 ㄹ5 ㅁ6 ㅂ7 ㅃ8 ㅅ9 ㅆ10 ㅇ11 ...
const IOTIZED_OR_I = new Set([2, 6, 7, 12, 17, 20]); // ㅑ ㅕ ㅖ ㅛ ㅠ ㅣ

export function allowedInitials(lastSyllable, useDueum = true) {
  const syllable = String(lastSyllable || '').normalize('NFC').slice(0, 1);
  if (!isHangulSyllable(syllable)) return [];
  const out = [syllable];
  if (!useDueum) return out;

  const code = syllable.codePointAt(0) - 0xac00;
  const cho = Math.floor(code / 588);
  const jung = Math.floor((code % 588) / 28);

  if (cho === 5) { // ㄹ
    const target = IOTIZED_OR_I.has(jung) ? 11 : 2; // 량→양, 락→낙
    out.push(replaceInitial(syllable, target));
  } else if (cho === 2 && IOTIZED_OR_I.has(jung)) { // ㄴ + ㅑ/ㅕ/ㅖ/ㅛ/ㅠ/ㅣ
    out.push(replaceInitial(syllable, 11)); // 녀→여
  }
  return [...new Set(out)];
}

function toBool(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return value === true || value === 1 || value === '1' || value === 'true';
}

function sanitizeExclude(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(normalizeKoreanWord).filter(isPlayableWord))].slice(0, 200);
}

async function findWord(env, word) {
  return env.DB.prepare(`
    SELECT word, first_syllable, last_syllable, pos, definition, source, source_id,
           category, difficulty, is_safe, is_proper, is_dialect, is_archaic, is_technical
    FROM wordchain_words
    WHERE word = ? AND is_active = 1
    LIMIT 1
  `).bind(word).first();
}

function modeAllows(row, mode) {
  if (!row) return false;
  if (!Number(row.is_safe)) return false;
  if (mode === 'kids') {
    return row.pos === '명사'
      && !Number(row.is_proper)
      && !Number(row.is_dialect)
      && !Number(row.is_archaic)
      && !Number(row.is_technical)
      && Number(row.difficulty || 1) <= 3;
  }
  if (mode === 'standard') {
    return row.pos === '명사' && !Number(row.is_proper) && !Number(row.is_dialect) && !Number(row.is_archaic);
  }
  return true;
}

export function validateChainInput({ word, previousWord = '', usedWords = [], useDueum = true } = {}) {
  const normalized = normalizeKoreanWord(word);
  if (!isPlayableWord(normalized)) return { ok: false, error: 'invalid_hangul_word', word: normalized };

  const prev = normalizeKoreanWord(previousWord);
  if (prev) {
    const last = [...prev].at(-1);
    const allowed = allowedInitials(last, useDueum);
    if (!allowed.includes([...normalized][0])) {
      return { ok: false, error: 'wrong_initial', word: normalized, required: allowed };
    }
  }
  const used = new Set(sanitizeExclude(usedWords));
  if (used.has(normalized)) return { ok: false, error: 'already_used', word: normalized };
  return { ok: true, word: normalized };
}

async function validateWord(request, env) {
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }

  const pre = validateChainInput({
    word: body?.word,
    previousWord: body?.previousWord,
    usedWords: body?.usedWords,
    useDueum: toBool(body?.useDueum, true)
  });
  if (!pre.ok) return json(pre, 400);

  const row = await findWord(env, pre.word);
  if (!row) return json({ ok: false, error: 'word_not_found', word: pre.word }, 404);

  const mode = ['kids','standard','open'].includes(String(body?.mode || '')) ? String(body.mode) : 'kids';
  if (!modeAllows(row, mode)) {
    return json({ ok: false, error: 'word_not_allowed_in_mode', word: pre.word, mode }, 422);
  }

  const chars = [...row.word];
  const next = allowedInitials(chars.at(-1), toBool(body?.useDueum, true));
  return json({
    ok: true,
    accepted: true,
    word: row.word,
    next,
    entry: {
      pos: row.pos,
      definition: row.definition || '',
      source: row.source || 'kidscade',
      sourceId: row.source_id || null,
      category: row.category || null,
      difficulty: Number(row.difficulty || 1)
    }
  });
}

async function candidates(request, env) {
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }

  const initials = Array.isArray(body?.initials)
    ? [...new Set(body.initials.map(v => String(v || '').normalize('NFC').slice(0, 1)).filter(isHangulSyllable))].slice(0, 4)
    : [];
  if (!initials.length) return json({ ok: false, error: 'initial_required' }, 400);

  const mode = ['kids','standard','open'].includes(String(body?.mode || '')) ? String(body.mode) : 'kids';
  const exclude = sanitizeExclude(body?.exclude);
  const limit = Math.max(1, Math.min(30, Math.floor(Number(body?.limit) || 8)));

  const clauses = [`is_active = 1`, `is_safe = 1`, `first_syllable IN (${initials.map(() => '?').join(',')})`];
  const binds = [...initials];

  if (mode === 'kids') {
    clauses.push(`pos = '명사'`, `is_proper = 0`, `is_dialect = 0`, `is_archaic = 0`, `is_technical = 0`, `difficulty <= 3`);
  } else if (mode === 'standard') {
    clauses.push(`pos = '명사'`, `is_proper = 0`, `is_dialect = 0`, `is_archaic = 0`);
  }
  if (exclude.length) {
    clauses.push(`word NOT IN (${exclude.map(() => '?').join(',')})`);
    binds.push(...exclude);
  }
  binds.push(limit);

  const result = await env.DB.prepare(`
    SELECT word, definition, difficulty
    FROM wordchain_words
    WHERE ${clauses.join(' AND ')}
    ORDER BY difficulty ASC, RANDOM()
    LIMIT ?
  `).bind(...binds).all();

  return json({ ok: true, words: result?.results || [] });
}

async function health(env) {
  const row = await env.DB.prepare(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN is_safe = 1 AND is_active = 1 THEN 1 ELSE 0 END) AS safe
    FROM wordchain_words
  `).first();
  return json({ ok: true, database: 'ready', total: Number(row?.total || 0), safe: Number(row?.safe || 0) });
}

export async function handleWordchainRequest(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/wordchain/')) return null;
  if (!env?.DB) return json({ ok: false, error: 'wordchain_database_not_configured' }, 503);

  try {
    if (request.method === 'GET' && url.pathname === '/api/wordchain/health') return health(env);
    if (request.method === 'POST' && url.pathname === '/api/wordchain/validate') return validateWord(request, env);
    if (request.method === 'POST' && url.pathname === '/api/wordchain/candidates') return candidates(request, env);
    return json({ ok: false, error: 'not_found' }, 404);
  } catch (error) {
    const message = String(error?.message || error || '');
    if (/no such table|wordchain_words/i.test(message)) {
      return json({ ok: false, error: 'wordchain_database_not_ready' }, 503);
    }
    console.error('wordchain request failed', error);
    return json({ ok: false, error: 'wordchain_internal_error' }, 500);
  }
}
