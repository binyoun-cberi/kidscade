const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist');
const SOURCE_CATALOG = path.join(ROOT, 'data', 'games.json');
const OVERRIDES = path.join(ROOT, 'data', 'game-classification-overrides.json');
const DIST_CATALOG = path.join(OUT, 'data', 'games.json');

const ALLOWED_AGES = new Set(['toddler', 'low', 'high', 'job']);
const ALLOWED_CATEGORIES = new Set(['math', 'korean', 'lang', 'trivia', 'music', 'job']);

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function normalizeAges(game, override) {
  if (!Array.isArray(override.ages)) return null;
  const ages = [...new Set(override.ages.map(value => String(value || '').trim()).filter(Boolean))];
  if (!ages.length) throw new Error(`Classification override has an empty ages list: ${game.id}`);
  for (const age of ages) {
    if (!ALLOWED_AGES.has(age)) throw new Error(`Unknown age in classification override: ${game.id} -> ${age}`);
  }
  const primary = String(game.age || '');
  if (primary && !ages.includes(primary)) ages.unshift(primary);
  return ages;
}

function apply(catalog, overrides) {
  const games = Array.isArray(catalog.games) ? catalog.games : [];
  const byId = new Map(games.map(game => [String(game.id || ''), game]));
  let applied = 0;

  for (const [gameId, override] of Object.entries(overrides || {})) {
    const game = byId.get(gameId);
    if (!game) throw new Error(`Classification override references unknown game id: ${gameId}`);
    if (override.category != null) {
      const category = String(override.category || '').trim();
      if (!ALLOWED_CATEGORIES.has(category)) throw new Error(`Unknown category in classification override: ${gameId} -> ${category}`);
      game.category = category;
    }
    const ages = normalizeAges(game, override);
    if (ages) game.ages = ages;
    applied += 1;
  }
  return applied;
}

if (!fs.existsSync(SOURCE_CATALOG)) throw new Error('Source game catalog is missing.');
if (!fs.existsSync(OVERRIDES)) throw new Error('Game classification override file is missing.');
if (!fs.existsSync(DIST_CATALOG)) throw new Error('Cloudflare build must run before classification overrides.');

const sourceCatalog = loadJson(SOURCE_CATALOG);
const overrides = loadJson(OVERRIDES);
const distCatalog = loadJson(DIST_CATALOG);

// Validate overrides against the source inventory, then apply to the deploy artifact.
apply(sourceCatalog, overrides);
const count = apply(distCatalog, overrides);
fs.writeFileSync(DIST_CATALOG, `${JSON.stringify(distCatalog, null, 2)}\n`, 'utf8');
console.log(`[game-classification] applied ${count} reviewed override(s).`);
