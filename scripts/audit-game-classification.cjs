const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'games.json'), 'utf8'));
const games = Array.isArray(catalog.games) ? catalog.games : [];

const normalizeHref = value => String(value || '').split('#')[0].split('?')[0].trim();
const normalizeTitle = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

function groupBy(keyFn) {
  const map = new Map();
  for (const game of games) {
    const key = keyFn(game);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(game);
  }
  return [...map.entries()].filter(([, list]) => list.length > 1);
}

const counts = games.reduce((acc, game) => {
  const age = game.age || '(missing)';
  acc[age] = (acc[age] || 0) + 1;
  return acc;
}, {});

console.log('=== AGE COUNTS ===');
console.log(JSON.stringify(counts, null, 2));

console.log('\n=== DUPLICATE HREFS ===');
const hrefDupes = groupBy(game => normalizeHref(game.href));
if (!hrefDupes.length) console.log('none');
for (const [href, list] of hrefDupes) {
  console.log(href);
  for (const game of list) console.log(`  - ${game.id} | ${game.age} | ${game.title}`);
}

console.log('\n=== DUPLICATE TITLES ===');
const titleDupes = groupBy(game => normalizeTitle(game.title));
if (!titleDupes.length) console.log('none');
for (const [title, list] of titleDupes) {
  console.log(title);
  for (const game of list) console.log(`  - ${game.id} | ${game.age} | ${game.href}`);
}

console.log('\n=== LEGACY ID PREFIX DIFFERENCES (INFORMATIONAL) ===');
let differenceCount = 0;
for (const game of games) {
  const prefix = String(game.id || '').split('_')[0];
  if (['low', 'high', 'job', 'tod'].includes(prefix)) {
    const legacyAge = prefix === 'tod' ? 'toddler' : prefix;
    if (game.age !== legacyAge) {
      differenceCount++;
      console.log(`${game.id} | current age=${game.age} | legacy prefix=${legacyAge} | ${game.title}`);
    }
  }
}
if (!differenceCount) console.log('none');
console.log('ID prefixes are permanent compatibility keys; data/games.json age is authoritative.');

console.log('\n=== ALL GAMES (AGE | ID | TITLE) ===');
for (const game of games) console.log(`${game.age}\t${game.id}\t${game.title}`);
