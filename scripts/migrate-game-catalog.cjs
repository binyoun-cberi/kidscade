const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const BASE_PATH = path.join(ROOT, 'index_base.html');
const CATALOG_PATH = path.join(ROOT, 'data', 'games.json');

function decodeEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function cleanText(value) {
  return decodeEntities(String(value || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function readAttr(openingTag, name) {
  const match = openingTag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'));
  return match ? decodeEntities(match[2]).trim() : '';
}

function readClassBody(body, className) {
  const pattern = new RegExp(`<div\\b[^>]*class\\s*=\\s*(["'])[^"']*\\b${className}\\b[^"']*\\1[^>]*>([\\s\\S]*?)<\\/div>`, 'i');
  return body.match(pattern)?.[2] || '';
}

function extractSvgIcon(value) {
  const icon = String(value || '').trim();
  if (!/^<svg\b/i.test(icon) || !/<\/svg>\s*$/i.test(icon)) return '';
  if (/<script\b|<iframe\b|<object\b|<embed\b|\bon\w+\s*=|javascript:/i.test(icon)) return '';
  return icon;
}

function extractLegacyGames(html) {
  const source = String(html || '');
  const marker = '<div class="game-container" id="game-list">';
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error('index_base.html에서 game-list를 찾지 못했습니다.');

  // 게임 목록 이후의 첫 인라인 스크립트 전까지만 검색해 대시보드 clone 코드 등을 제외한다.
  const scriptIndex = source.indexOf('<script', markerIndex);
  const scope = source.slice(markerIndex, scriptIndex > markerIndex ? scriptIndex : source.length);
  const cardPattern = /<a\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bgame-card\b[^"']*["'])(?=[^>]*\bdata-id\s*=\s*["'][^"']+["'])[^>]*>[\s\S]*?<\/a>/gi;
  const games = [];
  const seen = new Set();

  for (const match of scope.matchAll(cardPattern)) {
    const block = match[0];
    const openingTag = block.slice(0, block.indexOf('>') + 1);
    const body = block.slice(openingTag.length, -4);
    const id = readAttr(openingTag, 'data-id');
    if (!id) continue;
    if (seen.has(id)) throw new Error(`index_base.html에 중복 게임 ID가 있습니다: ${id}`);
    seen.add(id);

    const className = readAttr(openingTag, 'class');
    const iconBody = readClassBody(body, 'game-icon');
    const title = cleanText(readClassBody(body, 'game-title'));
    const description = cleanText(readClassBody(body, 'game-desc'));
    const iconText = cleanText(iconBody);
    const iconHtml = extractSvgIcon(iconBody);

    const game = {
      id,
      title: title || id,
      href: readAttr(openingTag, 'href') || '#',
      category: readAttr(openingTag, 'data-category') || 'all',
      age: readAttr(openingTag, 'data-age') || 'all',
      icon: iconText || '🎮',
      description
    };
    if (iconHtml) game.iconHtml = iconHtml;

    const scoreKey = readAttr(openingTag, 'data-scorekey');
    const rankKey = readAttr(openingTag, 'data-rankkey');
    const scoreUnit = readAttr(openingTag, 'data-scoreunit');
    const isTime = readAttr(openingTag, 'data-istime') === 'true';
    if (scoreKey) game.scoreKey = scoreKey;
    if (rankKey) game.rankKey = rankKey;
    if (scoreUnit) game.scoreUnit = scoreUnit;
    if (isTime) game.isTime = true;
    if (/\bdisabled\b/.test(className)) game.disabled = true;

    games.push(game);
  }

  if (!games.length) throw new Error('레거시 게임 카드를 하나도 추출하지 못했습니다.');
  return games;
}

function mergeCatalog(catalog, legacyGames) {
  const current = Array.isArray(catalog?.games) ? catalog.games : [];
  const currentById = new Map(current.map(game => [game.id, game]));
  const legacyIds = new Set(legacyGames.map(game => game.id));

  // 현재 화면 순서를 보존한다. JSON 전용 신규 게임은 기존처럼 목록 앞에 유지한다.
  const catalogOnly = current.filter(game => game?.id && !legacyIds.has(game.id));
  const migratedLegacy = legacyGames.map(legacy => {
    const curated = currentById.get(legacy.id);
    return curated ? { ...legacy, ...curated } : legacy;
  });

  return {
    ...catalog,
    schemaVersion: 7,
    games: [...catalogOnly, ...migratedLegacy]
  };
}

function migrate({ write = false } = {}) {
  const html = fs.readFileSync(BASE_PATH, 'utf8');
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const legacyGames = extractLegacyGames(html);
  const merged = mergeCatalog(catalog, legacyGames);
  const text = `${JSON.stringify(merged, null, 2)}\n`;

  if (write) fs.writeFileSync(CATALOG_PATH, text, 'utf8');
  return {
    text,
    legacyCount: legacyGames.length,
    previousCount: Array.isArray(catalog.games) ? catalog.games.length : 0,
    mergedCount: merged.games.length
  };
}

if (require.main === module) {
  const write = process.argv.includes('--write');
  const print = process.argv.includes('--print');
  const result = migrate({ write });
  console.log(`[catalog-migration] legacy=${result.legacyCount} previous=${result.previousCount} merged=${result.mergedCount}`);
  if (write) console.log(`[catalog-migration] wrote ${path.relative(ROOT, CATALOG_PATH)}`);
  if (print) console.log(result.text);
}

module.exports = { cleanText, extractSvgIcon, extractLegacyGames, mergeCatalog, migrate };
