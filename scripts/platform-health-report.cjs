const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const STRICT = process.argv.includes('--strict');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist']);
const ALLOWED_AGES = new Set(['toddler', 'low', 'high', 'job']);
const ALLOWED_CATEGORIES = new Set(['math', 'korean', 'lang', 'trivia', 'music', 'job']);
const ALLOWED_SUBJECTS = new Set(['math', 'korean', 'language', 'social', 'science', 'arts', 'career', 'thinking']);
const ALLOWED_GENRES = new Set(['action', 'puzzle', 'strategy', 'simulation', 'management', 'quiz', 'rhythm', 'sports', 'sandbox']);
const ALLOWED_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const ALLOWED_PLAYERS = new Set(['solo', 'local2', 'localMulti', 'online', 'classroom']);
const ALLOWED_INPUTS = new Set(['touch', 'keyboard']);
const ALLOWED_QUALITY = new Set(['featured', 'standard', 'rework']);

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function normalizeHref(href) {
  const value = String(href || '').trim();
  if (!value || /^(?:https?:|data:|javascript:|#)/i.test(value)) return '';
  const clean = value.split(/[?#]/, 1)[0].replace(/^\/+/, '');
  try { return decodeURIComponent(clean); } catch (_) { return clean; }
}

function walk(dir = ROOT, rel = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const childRel = rel ? path.posix.join(rel, entry.name) : entry.name;
    const child = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(child, childRel));
    else if (entry.isFile()) out.push({ path: childRel, size: fs.statSync(child).size });
  }
  return out;
}

function countBy(items, key) {
  const counts = {};
  for (const item of items) {
    const value = String(item?.[key] || 'unknown');
    counts[value] = (counts[value] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]));
}

const catalog = readJson('data/games.json');
const classification = fs.existsSync(path.join(ROOT, 'data/game-classification-overrides.json'))
  ? readJson('data/game-classification-overrides.json')
  : {};
const covers = fs.existsSync(path.join(ROOT, 'data/game-cover-overrides.json'))
  ? readJson('data/game-cover-overrides.json')
  : {};
const games = Array.isArray(catalog.games) ? catalog.games : [];
const effective = games.map(game => {
  const copy = { ...game };
  const override = classification[game.id] || {};
  if (override.category) copy.category = override.category;
  if (Array.isArray(override.ages) && override.ages.length) copy.ages = [...new Set(override.ages)];
  if (!copy.cover && covers[game.id]) copy.cover = covers[game.id];
  return copy;
});

const errors = [];
const warnings = [];
const seenIds = new Set();
const seenHrefs = new Map();

for (const game of effective) {
  const id = String(game.id || '');
  if (!id) errors.push('catalog game without id');
  else if (seenIds.has(id)) errors.push(`duplicate game id: ${id}`);
  else seenIds.add(id);

  const href = normalizeHref(game.href);
  if (!href) {
    if (!game.disabled) errors.push(`enabled game has no local href: ${id || game.title || 'unknown'}`);
  } else {
    if (!game.disabled && !fs.existsSync(path.join(ROOT, href))) errors.push(`missing enabled game entry: ${id} -> ${href}`);
    if (seenHrefs.has(href)) warnings.push(`shared game href: ${seenHrefs.get(href)} + ${id} -> ${href}`);
    else seenHrefs.set(href, id);
  }

  if (!ALLOWED_AGES.has(String(game.age || ''))) errors.push(`unknown age: ${id} -> ${game.age}`);
  if (!ALLOWED_CATEGORIES.has(String(game.category || ''))) errors.push(`unknown category: ${id} -> ${game.category}`);
  if (!ALLOWED_SUBJECTS.has(String(game.subject || ''))) errors.push(`unknown subject: ${id} -> ${game.subject}`);
  if (!ALLOWED_GENRES.has(String(game.genre || ''))) errors.push(`unknown genre: ${id} -> ${game.genre}`);
  if (!ALLOWED_DIFFICULTIES.has(String(game.difficulty || ''))) errors.push(`unknown difficulty: ${id} -> ${game.difficulty}`);
  if (!Number.isFinite(Number(game.sessionMinutes)) || Number(game.sessionMinutes) < 1) errors.push(`invalid sessionMinutes: ${id} -> ${game.sessionMinutes}`);
  if (!Array.isArray(game.players) || !game.players.length || game.players.some(value => !ALLOWED_PLAYERS.has(value))) errors.push(`invalid players: ${id} -> ${JSON.stringify(game.players)}`);
  if (!Array.isArray(game.input) || !game.input.length || game.input.some(value => !ALLOWED_INPUTS.has(value))) errors.push(`invalid input: ${id} -> ${JSON.stringify(game.input)}`);
  if (!ALLOWED_QUALITY.has(String(game.qualityStatus || ''))) errors.push(`invalid qualityStatus: ${id} -> ${game.qualityStatus}`);
}

const files = walk();
const rootHtml = files.filter(file => !file.path.includes('/') && /\.html?$/i.test(file.path));
const rootJs = files.filter(file => !file.path.includes('/') && /\.js$/i.test(file.path));
const legacyEntries = effective.filter(game => {
  const href = normalizeHref(game.href);
  return href && !href.startsWith('games/');
});
const missingCovers = effective.filter(game => !game.cover && !game.disabled);
const buildOnlyClassification = games.filter(game => {
  const override = classification[game.id];
  if (!override) return false;
  if (override.category && override.category !== game.category) return true;
  if (Array.isArray(override.ages)) {
    const source = Array.isArray(game.ages) ? game.ages : [];
    return JSON.stringify(source) !== JSON.stringify(override.ages);
  }
  return false;
});
const technicalDescriptions = effective.filter(game =>
  /\bv\d+\b|\bD1\b|Cloudflare|저부하|런타임|빌드 구조/i.test(String(game.description || ''))
);
const sdkAdopters = effective.filter(game => {
  const href = normalizeHref(game.href);
  if (!href || !/\.html?$/i.test(href)) return false;
  const file = path.join(ROOT, href);
  if (!fs.existsSync(file)) return false;
  try { return /kidscade-game-sdk\.js/.test(fs.readFileSync(file, 'utf8')); } catch (_) { return false; }
});
const largeFiles = files
  .filter(file => file.size >= 3 * 1024 * 1024)
  .sort((a, b) => b.size - a.size)
  .slice(0, 12);

if (rootHtml.length > 100) warnings.push(`root HTML count is still high: ${rootHtml.length}`);
if (legacyEntries.length) warnings.push(`catalog entries outside games/: ${legacyEntries.length}`);
if (missingCovers.length) warnings.push(`enabled games without an effective cover: ${missingCovers.length}`);
if (buildOnlyClassification.length) warnings.push(`classification values only corrected at build time: ${buildOnlyClassification.length}`);
if (technicalDescriptions.length) warnings.push(`player-facing descriptions with implementation/version wording: ${technicalDescriptions.length}`);

console.log('Kidscade platform health');
console.log(`- catalog games: ${games.length} (enabled ${effective.filter(game => !game.disabled).length})`);
console.log(`- age distribution: ${JSON.stringify(countBy(effective, 'age'))}`);
console.log(`- category distribution (legacy): ${JSON.stringify(countBy(effective, 'category'))}`);
console.log(`- subject distribution: ${JSON.stringify(countBy(effective, 'subject'))}`);
console.log(`- genre distribution: ${JSON.stringify(countBy(effective, 'genre'))}`);
console.log(`- quality distribution: ${JSON.stringify(countBy(effective, 'qualityStatus'))}`);
console.log(`- root HTML: ${rootHtml.length}`);
console.log(`- root JS: ${rootJs.length}`);
console.log(`- legacy catalog entry paths: ${legacyEntries.length}`);
console.log(`- effective covers missing: ${missingCovers.length}`);
console.log(`- build-only classification drift: ${buildOnlyClassification.length}`);
console.log(`- technical player descriptions: ${technicalDescriptions.length}`);
console.log(`- Game SDK adopters: ${sdkAdopters.length}/${effective.filter(game => !game.disabled).length}`);
console.log(`- files >= 3 MiB: ${largeFiles.length}`);

if (buildOnlyClassification.length) {
  console.log('\nBuild-only classification drift');
  for (const game of buildOnlyClassification) {
    const o = classification[game.id] || {};
    console.log(`- ${game.id}: source(category=${game.category}, ages=${JSON.stringify(game.ages || [])}) -> override(category=${o.category || '-'}, ages=${JSON.stringify(o.ages || [])})`);
  }
}

if (technicalDescriptions.length) {
  console.log('\nDescriptions to clean');
  for (const game of technicalDescriptions) console.log(`- ${game.id}: ${game.title}`);
}

if (largeFiles.length) {
  console.log('\nLargest files');
  for (const file of largeFiles) console.log(`- ${(file.size / 1024 / 1024).toFixed(2)} MiB  ${file.path}`);
}

if (warnings.length) {
  console.log('\nCleanup warnings');
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (errors.length) {
  console.error('\nHealth errors');
  for (const error of errors) console.error(`- ${error}`);
  if (STRICT) process.exitCode = 1;
}
