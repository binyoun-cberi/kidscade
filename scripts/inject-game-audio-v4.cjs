const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const HOOK_SRC = '/game-audio-hooks-v4.js?v=20260917-1';
const TARGET_TITLES = new Set([
  '수식의 첨탑',
  '빙글빙글 타코야키집',
  '네일 아티스트 타이쿤',
  '심해 다이버 시뮬레이터',
  '그릴 마스터 3D DX',
  '코드 브레이커'
]);

function stripHrefSuffix(href) {
  const value = String(href || '').trim();
  if (!value || /^(?:https?:|data:|javascript:|#)/i.test(value)) return '';
  const plain = value.split(/[?#]/, 1)[0].replace(/^\/+/, '');
  try { return decodeURIComponent(plain); } catch (_) { return plain; }
}

function injectDocumentEndScript(html, tag, relativeHtml) {
  if (/<\/body\s*>/i.test(html)) return html.replace(/<\/body\s*>/i, `${tag}\n</body>`);
  if (/<\/html\s*>/i.test(html)) return html.replace(/<\/html\s*>/i, `${tag}\n</html>`);
  if (html.trim()) return `${html}\n${tag}\n`;
  throw new Error(`Cannot inject fourth-pass audio hooks: ${relativeHtml} is empty.`);
}

const catalogPath = path.join(dist, 'data', 'games.json');
if (!fs.existsSync(catalogPath)) throw new Error('Missing built game catalog: data/games.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const found = new Set();
let injected = 0;

for (const game of Array.isArray(catalog.games) ? catalog.games : []) {
  if (!game || game.disabled) continue;
  const title = String(game.title || '').trim();
  if (!TARGET_TITLES.has(title)) continue;
  found.add(title);

  const relativeHtml = stripHrefSuffix(game.href);
  if (!relativeHtml || !/\.html?$/i.test(relativeHtml)) {
    throw new Error(`Fourth-pass audio target has invalid href: ${title} -> ${game.href}`);
  }

  const file = path.join(dist, relativeHtml);
  if (!fs.existsSync(file)) throw new Error(`Fourth-pass audio target is missing: ${title} -> ${relativeHtml}`);
  let html = fs.readFileSync(file, 'utf8');
  if (/game-audio-hooks-v4\.js(?:\?|\")/.test(html)) continue;

  html = injectDocumentEndScript(html, `<script src="${HOOK_SRC}"></script>`, relativeHtml);
  fs.writeFileSync(file, html, 'utf8');
  injected += 1;
}

const missing = [...TARGET_TITLES].filter(title => !found.has(title));
if (missing.length) throw new Error(`Fourth-pass audio targets missing from enabled catalog: ${missing.join(', ')}`);

console.log(`[game-audio-v4] checked ${found.size} target games; injected ${injected} fourth-pass hook runtime(s).`);
