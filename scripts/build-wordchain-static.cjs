#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const input = path.resolve(process.argv[2] || path.join(ROOT, 'data', 'wordchain', 'source-words.txt'));
const outDir = path.resolve(process.argv[3] || path.join(ROOT, 'data', 'wordchain'));

const KEYS = ['g','gg','n','d','dd','r','m','b','bb','s','ss','ng','j','jj','ch','k','t','p','h'];
const LABELS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

function normalizeWord(value) {
  return String(value || '').normalize('NFC').replace(/[\s·ㆍ・\-]/g, '').trim().slice(0, 24);
}

function isPlayableWord(word) {
  const chars = [...word];
  return chars.length >= 2 && chars.length <= 24 && chars.every(ch => {
    const code = ch.codePointAt(0);
    return code >= 0xac00 && code <= 0xd7a3;
  });
}

function bucketKey(word) {
  const first = [...word][0];
  const code = first.codePointAt(0) - 0xac00;
  return KEYS[Math.floor(code / 588)];
}

function wordsFromJson(value) {
  const rows = Array.isArray(value) ? value : (Array.isArray(value?.words) ? value.words : []);
  return rows.map(row => {
    if (typeof row === 'string') return row;
    return row?.word ?? row?.vocabulary ?? row?.headword ?? row?.title ?? '';
  });
}

function readWords(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const ext = path.extname(file).toLowerCase();

  if (ext === '.json') return wordsFromJson(JSON.parse(raw));
  if (ext === '.jsonl' || ext === '.ndjson') {
    return raw.split(/\r?\n/).filter(Boolean).map(line => {
      const row = JSON.parse(line);
      return typeof row === 'string' ? row : row?.word ?? row?.vocabulary ?? row?.headword ?? row?.title ?? '';
    });
  }
  if (ext === '.tsv') {
    const lines = raw.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const headers = lines.shift().split('\t').map(v => v.trim().toLowerCase());
    const wordIndex = ['word','vocabulary','headword','title','어휘','표제어'].map(k => headers.indexOf(k)).find(i => i >= 0);
    if (wordIndex === undefined) throw new Error('TSV must contain a word/어휘/표제어 column.');
    return lines.map(line => line.split('\t')[wordIndex] || '');
  }
  return raw.split(/\r?\n/);
}

const normalized = [...new Set(
  readWords(input).map(normalizeWord).filter(isPlayableWord)
)].sort((a, b) => a.localeCompare(b, 'ko'));

const buckets = Object.fromEntries(KEYS.map(key => [key, []]));
for (const word of normalized) buckets[bucketKey(word)].push(word);

fs.mkdirSync(outDir, { recursive: true });
const manifest = {
  version: 1,
  format: 'newline-text',
  generatedAt: new Date().toISOString(),
  total: normalized.length,
  buckets: {}
};

for (let i = 0; i < KEYS.length; i += 1) {
  const key = KEYS[i];
  const file = `bucket-${key}.txt`;
  fs.writeFileSync(path.join(outDir, file), buckets[key].join('\n') + (buckets[key].length ? '\n' : ''), 'utf8');
  manifest.buckets[key] = { label: LABELS[i], count: buckets[key].length, file };
}

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`wordchain static DB: ${normalized.length} words -> ${outDir}`);
