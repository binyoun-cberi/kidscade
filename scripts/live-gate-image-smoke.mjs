#!/usr/bin/env node

const SITE_URL = process.env.SITE_URL || 'https://kidscade.binyoun.workers.dev/';
const EXPECTED_BUILD = process.env.EXPECTED_BUILD || '';

function withVerify(url) {
  const next = new URL(url, SITE_URL);
  if (EXPECTED_BUILD) next.searchParams.set('verify', EXPECTED_BUILD);
  return next;
}

async function fetchOk(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'cache-control': 'no-cache',
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} — ${url}`);
  }
  return response;
}

async function main() {
  const catalogResponse = await fetchOk(withVerify('data/games.json'));
  const catalog = await catalogResponse.json();
  const games = Array.isArray(catalog?.games) ? catalog.games : [];
  const covers = [...new Set(games.map(game => game?.cover).filter(Boolean))];

  if (!covers.length) {
    throw new Error('Production catalog contains zero gate image paths.');
  }

  const failures = [];
  let checked = 0;
  const queue = covers.slice();

  async function worker() {
    while (queue.length) {
      const cover = queue.shift();
      const url = withVerify(cover);
      try {
        const response = await fetchOk(url);
        const type = String(response.headers.get('content-type') || '').toLowerCase();
        const bytes = new Uint8Array(await response.arrayBuffer()).byteLength;
        if (!type.startsWith('image/')) {
          failures.push({ cover, reason: 'unexpected content-type', type, bytes });
        } else if (bytes < 64) {
          failures.push({ cover, reason: 'image response too small', type, bytes });
        }
      } catch (error) {
        failures.push({ cover, reason: error?.message || String(error) });
      }
      checked += 1;
    }
  }

  await Promise.all(Array.from({ length: Math.min(12, covers.length) }, () => worker()));

  console.log('KIDSCADE_GATE_IMAGE_STATIC_SMOKE');
  console.log(JSON.stringify({
    site: SITE_URL,
    expectedBuild: EXPECTED_BUILD || null,
    catalogGames: games.length,
    uniqueGateImages: covers.length,
    checked,
    failed: failures.length,
    failures: failures.slice(0, 20)
  }, null, 2));

  if (failures.length) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error('KIDSCADE_GATE_IMAGE_STATIC_SMOKE FAIL');
  console.error(error?.stack || error);
  process.exitCode = 1;
});
