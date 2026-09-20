#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const stdictDir = path.resolve(process.argv[2] || '');
const sourceFile = path.resolve(process.argv[3] || path.join(ROOT, 'data', 'wordchain', 'source-words.txt'));

if (!stdictDir || !fs.existsSync(stdictDir)) {
  console.error('Usage: node scripts/import-stdict.cjs <stdict-directory> [source-words.txt]');
  process.exit(2);
}

const HANGUL = /^[가-힣]{2,24}$/;
function decodeXmlText(value) {
  return String(value || '')
    .replace(/^<!\[CDATA\[/, '')
    .replace(/\]\]>$/, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
function normalizeWord(value) {
  return decodeXmlText(value)
    .normalize('NFC')
    .replace(/[\s·ㆍ・\-^]/g, '')
    .trim()
    .slice(0, 24);
}
function existingWords() {
  if (!fs.existsSync(sourceFile)) return new Set();
  return new Set(
    fs.readFileSync(sourceFile, 'utf8')
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map(normalizeWord)
      .filter(word => HANGUL.test(word))
  );
}

const words = existingWords();
const before = words.size;
let entries = 0;
let nounEntries = 0;
let acceptedFromStdict = 0;

const files = fs.readdirSync(stdictDir)
  .filter(name => /^\d+\.xml$/i.test(name))
  .sort((a, b) => a.localeCompare(b));

for (const file of files) {
  const xml = fs.readFileSync(path.join(stdictDir, file), 'utf8');
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch;
  while ((itemMatch = itemRe.exec(xml))) {
    entries += 1;
    const item = itemMatch[1];
    if (!/<word_unit>\s*단어\s*<\/word_unit>/.test(item)) continue;
    if (!/<pos>\s*명사\s*<\/pos>/.test(item)) continue;
    nounEntries += 1;

    const wordMatch = item.match(/<word>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/word>/);
    if (!wordMatch) continue;
    const word = normalizeWord(wordMatch[1]);
    if (!HANGUL.test(word)) continue;
    if (!words.has(word)) acceptedFromStdict += 1;
    words.add(word);
  }
}

const sorted = [...words].sort((a, b) => a.localeCompare(b, 'ko'));
fs.writeFileSync(sourceFile, sorted.join('\n') + '\n', 'utf8');

console.log(JSON.stringify({
  stdictFiles: files.length,
  stdictEntries: entries,
  stdictNounEntries: nounEntries,
  previousWords: before,
  addedFromStdict: acceptedFromStdict,
  totalWords: sorted.length
}, null, 2));
