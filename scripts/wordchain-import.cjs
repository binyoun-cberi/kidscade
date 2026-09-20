#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const [, , inputArg, outputArg] = process.argv;
if (!inputArg) {
  console.error('Usage: node scripts/wordchain-import.cjs <words.json|jsonl|tsv> [output.sql]');
  process.exit(1);
}

const input = path.resolve(inputArg);
const output = path.resolve(outputArg || path.join('data', 'wordchain-import.sql'));

function normalizeWord(value) {
  return String(value || '').normalize('NFC').replace(/[\s·ㆍ・\-]/g, '').trim().slice(0, 24);
}
function isHangulWord(word) {
  const chars = [...word];
  return chars.length >= 2 && chars.every(ch => {
    const code = ch.codePointAt(0);
    return code >= 0xac00 && code <= 0xd7a3;
  });
}
function bool(v, fallback = 0) {
  if (v === undefined || v === null || v === '') return fallback;
  return ['1','true','yes','y'].includes(String(v).toLowerCase()) ? 1 : 0;
}
function esc(v) {
  if (v === undefined || v === null || v === '') return 'NULL';
  return "'" + String(v).replaceAll("'", "''") + "'";
}
function rowsFromFile(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const ext = path.extname(file).toLowerCase();
  if (ext === '.json') {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : parsed.words || [];
  }
  if (ext === '.jsonl' || ext === '.ndjson') {
    return raw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  }
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines.shift().split('\t').map(v => v.trim());
  return lines.map(line => {
    const cells = line.split('\t');
    return Object.fromEntries(headers.map((key, i) => [key, cells[i] ?? '']));
  });
}

const seen = new Set();
const rows = [];
for (const sourceRow of rowsFromFile(input)) {
  const source = typeof sourceRow === 'string' ? { word: sourceRow } : sourceRow || {};
  const word = normalizeWord(source.word || source.title || source.headword);
  if (!isHangulWord(word) || seen.has(word)) continue;
  seen.add(word);
  const chars = [...word];
  rows.push({
    word,
    first: chars[0],
    last: chars.at(-1),
    pos: String(source.pos || '명사').trim() || '명사',
    definition: String(source.definition || source.meaning || '').trim().slice(0, 800),
    source: String(source.source || 'import').trim().slice(0, 50) || 'import',
    sourceId: String(source.source_id || source.sourceId || '').trim().slice(0, 100),
    category: String(source.category || '').trim().slice(0, 50),
    difficulty: Math.max(1, Math.min(5, Number.parseInt(source.difficulty || '2', 10) || 2)),
    safe: bool(source.is_safe ?? source.safe, 1),
    active: bool(source.is_active ?? source.active, 1),
    proper: bool(source.is_proper ?? source.proper, 0),
    dialect: bool(source.is_dialect ?? source.dialect, 0),
    archaic: bool(source.is_archaic ?? source.archaic, 0),
    technical: bool(source.is_technical ?? source.technical, 0)
  });
}

const chunks = [];
for (let i = 0; i < rows.length; i += 400) {
  const values = rows.slice(i, i + 400).map(r =>
    `(${esc(r.word)},${esc(r.first)},${esc(r.last)},${esc(r.pos)},${esc(r.definition)},${esc(r.source)},${esc(r.sourceId)},${esc(r.category)},${r.difficulty},${r.safe},${r.active},${r.proper},${r.dialect},${r.archaic},${r.technical})`
  ).join(',\n');

  chunks.push(`INSERT INTO wordchain_words
(word, first_syllable, last_syllable, pos, definition, source, source_id, category, difficulty,
 is_safe, is_active, is_proper, is_dialect, is_archaic, is_technical)
VALUES
${values}
ON CONFLICT(word) DO UPDATE SET
  first_syllable=excluded.first_syllable,
  last_syllable=excluded.last_syllable,
  pos=excluded.pos,
  definition=excluded.definition,
  source=excluded.source,
  source_id=excluded.source_id,
  category=excluded.category,
  difficulty=excluded.difficulty,
  is_safe=excluded.is_safe,
  is_active=excluded.is_active,
  is_proper=excluded.is_proper,
  is_dialect=excluded.is_dialect,
  is_archaic=excluded.is_archaic,
  is_technical=excluded.is_technical,
  updated_at=CURRENT_TIMESTAMP;`);
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, chunks.join('\n\n') + '\n', 'utf8');
console.log(`wordchain import: ${rows.length} unique playable words -> ${output}`);
