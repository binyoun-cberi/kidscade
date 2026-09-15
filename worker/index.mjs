const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin'
});

let catalogCache = { expiresAt: 0, ids: null };

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}

export function getKstWeekKey(input = new Date()) {
  const kst = new Date(input.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(Date.UTC(
    kst.getUTCFullYear(),
    kst.getUTCMonth(),
    kst.getUTCDate() - daysSinceMonday
  ));
  return [
    monday.getUTCFullYear(),
    String(monday.getUTCMonth() + 1).padStart(2, '0'),
    String(monday.getUTCDate()).padStart(2, '0')
  ].join('-');
}

export function isValidClientId(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

export function isValidGameId(value) {
  return /^[a-z0-9_-]{1,80}$/i.test(String(value || ''));
}

export async function hashClientId(clientId) {
  const bytes = new TextEncoder().encode(String(clientId));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function parseJson(request) {
  const type = request.headers.get('content-type') || '';
  if (!type.toLowerCase().includes('application/json')) throw new Error('json-required');
  return request.json();
}

async function getCatalogIds(env, request) {
  const now = Date.now();
  if (catalogCache.ids && catalogCache.expiresAt > now) return catalogCache.ids;
  if (!env.ASSETS?.fetch) return null;

  const catalogUrl = new URL('/data/games.json', request.url);
  const response = await env.ASSETS.fetch(new Request(catalogUrl.toString()));
  if (!response.ok) return null;
  const catalog = await response.json();
  const ids = new Set(
    (Array.isArray(catalog?.games) ? catalog.games : [])
      .filter(game => game?.id && !game.disabled)
      .map(game => String(game.id))
  );
  catalogCache = { ids, expiresAt: now + 5 * 60 * 1000 };
  return ids;
}

function requireDatabase(env) {
  if (!env.DB) {
    return json({
      ok: false,
      error: 'stats_database_not_configured',
      message: 'Kidscade statistics database is not configured yet.'
    }, 503, { 'cache-control': 'no-store' });
  }
  return null;
}

async function getStats(request, env) {
  const missing = requireDatabase(env);
  if (missing) return missing;

  const weekKey = getKstWeekKey();
  const [site, games] = await Promise.all([
    env.DB.prepare(`
      SELECT total_visitors, current_week_key, current_week_visitors
      FROM site_counters
      WHERE id = 1
    `).first(),
    env.DB.prepare(`
      SELECT game_id, total_plays, current_week_key, current_week_plays
      FROM game_counters
      ORDER BY total_plays DESC
    `).all()
  ]);

  const gameMap = {};
  for (const row of games?.results || []) {
    gameMap[row.game_id] = {
      weeklyPlays: row.current_week_key === weekKey ? Number(row.current_week_plays || 0) : 0,
      totalPlays: Number(row.total_plays || 0)
    };
  }

  const popular = Object.entries(gameMap)
    .filter(([, value]) => value.weeklyPlays > 0)
    .sort((a, b) => b[1].weeklyPlays - a[1].weeklyPlays || b[1].totalPlays - a[1].totalPlays)
    .slice(0, 10)
    .map(([gameId, value], index) => ({ rank: index + 1, gameId, ...value }));

  return json({
    ok: true,
    weekKey,
    generatedAt: new Date().toISOString(),
    site: {
      weeklyVisitors: site?.current_week_key === weekKey ? Number(site?.current_week_visitors || 0) : 0,
      totalVisitors: Number(site?.total_visitors || 0)
    },
    games: gameMap,
    popular
  }, 200, {
    'cache-control': 'public, max-age=60, stale-while-revalidate=300'
  });
}

async function recordVisit(request, env) {
  const missing = requireDatabase(env);
  if (missing) return missing;

  let body;
  try {
    body = await parseJson(request);
  } catch (_) {
    return json({ ok: false, error: 'invalid_json' }, 400, { 'cache-control': 'no-store' });
  }

  if (!isValidClientId(body?.clientId)) {
    return json({ ok: false, error: 'invalid_client_id' }, 400, { 'cache-control': 'no-store' });
  }

  const visitorHash = await hashClientId(body.clientId);
  const weekKey = getKstWeekKey();
  const now = new Date().toISOString();
  const existing = await env.DB.prepare(`
    SELECT last_week_key
    FROM visitor_registry
    WHERE visitor_hash = ?
  `).bind(visitorHash).first();

  let isNewVisitor = false;
  let isNewThisWeek = false;

  if (!existing) {
    const inserted = await env.DB.prepare(`
      INSERT OR IGNORE INTO visitor_registry (visitor_hash, first_seen_at, last_week_key)
      VALUES (?, ?, ?)
    `).bind(visitorHash, now, weekKey).run();
    if (Number(inserted?.meta?.changes || 0) > 0) {
      isNewVisitor = true;
      isNewThisWeek = true;
    }
  } else if (existing.last_week_key !== weekKey) {
    const updated = await env.DB.prepare(`
      UPDATE visitor_registry
      SET last_week_key = ?
      WHERE visitor_hash = ? AND last_week_key <> ?
    `).bind(weekKey, visitorHash, weekKey).run();
    isNewThisWeek = Number(updated?.meta?.changes || 0) > 0;
  }

  if (isNewVisitor || isNewThisWeek) {
    await env.DB.prepare(`
      UPDATE site_counters
      SET
        total_visitors = total_visitors + ?,
        current_week_visitors = CASE
          WHEN current_week_key = ? THEN current_week_visitors + ?
          ELSE ?
        END,
        current_week_key = ?,
        updated_at = ?
      WHERE id = 1
    `).bind(
      isNewVisitor ? 1 : 0,
      weekKey,
      isNewThisWeek ? 1 : 0,
      isNewThisWeek ? 1 : 0,
      weekKey,
      now
    ).run();
  }

  const counters = await env.DB.prepare(`
    SELECT total_visitors, current_week_key, current_week_visitors
    FROM site_counters
    WHERE id = 1
  `).first();

  return json({
    ok: true,
    weekKey,
    counted: isNewVisitor || isNewThisWeek,
    site: {
      weeklyVisitors: counters?.current_week_key === weekKey ? Number(counters?.current_week_visitors || 0) : 0,
      totalVisitors: Number(counters?.total_visitors || 0)
    }
  }, 200, { 'cache-control': 'no-store' });
}

async function recordPlay(request, env) {
  const missing = requireDatabase(env);
  if (missing) return missing;

  let body;
  try {
    body = await parseJson(request);
  } catch (_) {
    return json({ ok: false, error: 'invalid_json' }, 400, { 'cache-control': 'no-store' });
  }

  const gameId = String(body?.gameId || '');
  const seconds = Math.floor(Number(body?.seconds || 0));
  if (!isValidGameId(gameId)) {
    return json({ ok: false, error: 'invalid_game_id' }, 400, { 'cache-control': 'no-store' });
  }
  if (!Number.isFinite(seconds) || seconds < 30 || seconds > 8 * 60 * 60) {
    return json({ ok: false, error: 'invalid_play_duration' }, 400, { 'cache-control': 'no-store' });
  }

  const catalogIds = await getCatalogIds(env, request);
  if (catalogIds && !catalogIds.has(gameId)) {
    return json({ ok: false, error: 'unknown_game' }, 404, { 'cache-control': 'no-store' });
  }

  const weekKey = getKstWeekKey();
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO game_counters (
      game_id, total_plays, current_week_key, current_week_plays, updated_at
    ) VALUES (?, 1, ?, 1, ?)
    ON CONFLICT(game_id) DO UPDATE SET
      total_plays = game_counters.total_plays + 1,
      current_week_plays = CASE
        WHEN game_counters.current_week_key = excluded.current_week_key
          THEN game_counters.current_week_plays + 1
        ELSE 1
      END,
      current_week_key = excluded.current_week_key,
      updated_at = excluded.updated_at
  `).bind(gameId, weekKey, now).run();

  const row = await env.DB.prepare(`
    SELECT total_plays, current_week_key, current_week_plays
    FROM game_counters
    WHERE game_id = ?
  `).bind(gameId).first();

  return json({
    ok: true,
    weekKey,
    gameId,
    game: {
      weeklyPlays: row?.current_week_key === weekKey ? Number(row?.current_week_plays || 0) : 0,
      totalPlays: Number(row?.total_plays || 0)
    }
  }, 200, { 'cache-control': 'no-store' });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS?.fetch ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
    }

    if (url.pathname === '/api/stats' && request.method === 'GET') return getStats(request, env);
    if (url.pathname === '/api/stats/visit' && request.method === 'POST') return recordVisit(request, env);
    if (url.pathname === '/api/stats/play' && request.method === 'POST') return recordPlay(request, env);

    if (['/api/stats', '/api/stats/visit', '/api/stats/play'].includes(url.pathname)) {
      return json({ ok: false, error: 'method_not_allowed' }, 405, {
        allow: url.pathname === '/api/stats' ? 'GET' : 'POST',
        'cache-control': 'no-store'
      });
    }
    return json({ ok: false, error: 'not_found' }, 404, { 'cache-control': 'no-store' });
  }
};
