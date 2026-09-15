const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist');

const EXCLUDED_TOP = new Set(['.github', 'docs', 'scripts', 'tests', 'node_modules', 'dist']);
const EXCLUDED_FILES = new Set([
  '.gitignore',
  'package.json',
  'package-lock.json',
  'wrangler.jsonc',
  'vercel.json',
  'netlify.toml'
]);

function trackedFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT });
  return output.toString('utf8').split('\0').filter(Boolean);
}

function shouldPublish(rel) {
  const normalized = rel.replaceAll('\\', '/');
  const parts = normalized.split('/');
  if (EXCLUDED_TOP.has(parts[0])) return false;
  if (EXCLUDED_FILES.has(normalized)) return false;
  if (/^(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?)$/i.test(path.posix.basename(normalized))) return false;
  if (/\.md$/i.test(normalized)) return false;
  return true;
}

function copyTrackedFile(rel) {
  const src = path.join(ROOT, rel);
  const dest = path.join(OUT, rel);
  const stat = fs.statSync(src);
  if (!stat.isFile()) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function assertExists(rel) {
  const target = path.join(OUT, rel);
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    throw new Error(`Cloudflare build missing required file: ${rel}`);
  }
}

function normalizeHref(href) {
  const clean = String(href || '').split('#')[0].split('?')[0].replace(/^\/+/, '');
  try { return decodeURIComponent(clean); } catch { return clean; }
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const sourceFiles = trackedFiles().filter(shouldPublish);
sourceFiles.forEach(copyTrackedFile);

assertExists('index.html');
assertExists('index_base.html');
assertExists('data/games.json');

const catalog = JSON.parse(fs.readFileSync(path.join(OUT, 'data/games.json'), 'utf8'));
const enabledGames = Array.isArray(catalog.games) ? catalog.games.filter(game => !game.disabled) : [];
for (const game of enabledGames) {
  const rel = normalizeHref(game.href);
  if (!rel) throw new Error(`Enabled game has no href: ${game.id || game.title || 'unknown'}`);
  assertExists(rel);
}

for (const forbidden of ['.github', 'docs', 'scripts', 'tests']) {
  if (fs.existsSync(path.join(OUT, forbidden))) {
    throw new Error(`Development directory leaked into dist: ${forbidden}`);
  }
}

const secretNames = trackedFiles().filter(rel => /(^|\/)(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?)$/i.test(rel));
if (secretNames.length) {
  throw new Error(`Secret environment files are tracked and must not be deployed: ${secretNames.join(', ')}`);
}

console.log('Kidscade Cloudflare build complete');
console.log(`- published tracked files: ${sourceFiles.length}`);
console.log(`- enabled game entry files verified: ${enabledGames.length}`);
console.log(`- output: ${path.relative(ROOT, OUT)}/`);
