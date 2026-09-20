#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const input = path.resolve(process.argv[2] || path.join(ROOT, 'data', 'wordchain', 'source-words.txt'));
const outDir = path.resolve(process.argv[3] || path.join(ROOT, 'data', 'wordchain'));

const CHO_KEYS = ['g','gg','n','d','dd','r','m','b','bb','s','ss','ng','j','jj','ch','k','t','p','h'];
const GROUPS = {
  a: ['g','gg','n','d','dd','r'],
  b: ['m','b','bb'],
  c: ['s','ss'],
  d: ['ng'],
  e: ['j','jj','ch'],
  f: ['k','t','p','h']
};

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
function keyFor(word) {
  const code = [...word][0].codePointAt(0) - 0xac00;
  return CHO_KEYS[Math.floor(code / 588)];
}
function wordsFromJson(value) {
  const rows = Array.isArray(value) ? value : (Array.isArray(value?.words) ? value.words : []);
  return rows.map(row => typeof row === 'string' ? row : row?.word ?? row?.vocabulary ?? row?.headword ?? row?.title ?? '');
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
  return raw.split(/\r?\n/);
}

const words = [...new Set(readWords(input).map(normalizeWord).filter(isPlayableWord))]
  .sort((a,b) => a.localeCompare(b,'ko'));
const keySets = Object.fromEntries(CHO_KEYS.map(key => [key, []]));
for (const word of words) keySets[keyFor(word)].push(word);

fs.mkdirSync(outDir, { recursive: true });
const manifest = {
  version: 3,
  format: 'grouped-newline-text',
  source: {
    name: '국립국어원 한국어기초사전',
    edition: '전체 내려받기 JSON 2026-09-19',
    url: 'https://krdict.korean.go.kr/',
    license: 'CC BY-SA 2.0 KR'
  },
  filter: 'lexicalUnit=단어; partOfSpeech=명사; 2~24글자 완성형 한글; 중복 표제어 병합',
  total: words.length,
  groups: {}
};

for (const [groupName, keys] of Object.entries(GROUPS)) {
  const rows = keys.flatMap(key => keySets[key]);
  const file = `krdict-${groupName}.txt`;
  fs.writeFileSync(path.join(outDir, file), rows.join('\n') + (rows.length ? '\n' : ''), 'utf8');
  manifest.groups[groupName] = { keys, count: rows.length, file };
}
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`wordchain grouped static DB: ${words.length} words -> ${outDir}`);
