#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const storageApi = require('../kidscade-storage.js');

const ROOT = path.resolve(__dirname, '..');
const STRICT = process.argv.includes('--strict');
const LEGACY_DIRECT_KEY_BASELINE = 54;
const RUNTIME_EXTENSIONS = new Set(['.html', '.htm', '.js', '.mjs']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'docs', 'tests', 'scripts', '.github']);
const KIDSCade_LITERAL_RE = /["'](kidscade_[A-Za-z0-9_.:-]+)["']/g;
const LOCAL_STORAGE_LITERAL_RE = /localStorage\.(?:getItem|setItem|removeItem)\(\s*["']([^"']+)["']/g;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (RUNTIME_EXTENSIONS.has(path.extname(full).toLowerCase())) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function addUsage(map, key, file) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(rel(file));
}

function collect() {
  const kidscadeKeys = new Map();
  const directLocalStorageKeys = new Map();

  for (const file of walk(ROOT)) {
    const source = fs.readFileSync(file, 'utf8');
    let match;

    KIDSCade_LITERAL_RE.lastIndex = 0;
    while ((match = KIDSCade_LITERAL_RE.exec(source))) addUsage(kidscadeKeys, match[1], file);

    LOCAL_STORAGE_LITERAL_RE.lastIndex = 0;
    while ((match = LOCAL_STORAGE_LITERAL_RE.exec(source))) addUsage(directLocalStorageKeys, match[1], file);
  }

  const registeredExact = new Set([
    ...Object.values(storageApi.keys || {}),
    ...Object.values(storageApi.gameKeys || {})
  ]);
  const registeredPrefixes = new Set(Object.values(storageApi.prefixes || {}));
  const unknownKidscadeKeys = [...kidscadeKeys.keys()]
    .filter(key => !storageApi.isRegisteredPhysicalKey(key))
    .sort();
  const registeredInUse = [...kidscadeKeys.keys()]
    .filter(key => storageApi.isRegisteredPhysicalKey(key))
    .sort();
  const registeredNotSeenLiterally = [...registeredExact]
    .filter(key => !kidscadeKeys.has(key))
    .sort();
  const nonKidscadeDirectKeys = [...directLocalStorageKeys.keys()]
    .filter(key => !key.startsWith('kidscade_'))
    .sort();

  return {
    kidscadeKeys,
    directLocalStorageKeys,
    registeredExact,
    registeredPrefixes,
    unknownKidscadeKeys,
    registeredInUse,
    registeredNotSeenLiterally,
    nonKidscadeDirectKeys
  };
}

function printUsage(title, keys, usage) {
  if (!keys.length) return;
  console.log(`\n${title}:`);
  for (const key of keys) {
    const files = [...(usage.get(key) || [])];
    console.log(`- ${key}${files.length ? `  [${files.slice(0, 4).join(', ')}${files.length > 4 ? ', ...' : ''}]` : ''}`);
  }
}

const report = collect();
console.log('Kidscade storage audit');
console.log(`- registered exact keys: ${report.registeredExact.size}`);
console.log(`- registered dynamic prefixes: ${report.registeredPrefixes.size}`);
console.log(`- kidscade_* literals found: ${report.kidscadeKeys.size}`);
console.log(`- classified kidscade_* literals: ${report.registeredInUse.length}`);
console.log(`- unclassified kidscade_* literals: ${report.unknownKidscadeKeys.length}`);
console.log(`- legacy non-kidscade direct localStorage keys: ${report.nonKidscadeDirectKeys.length}/${LEGACY_DIRECT_KEY_BASELINE} baseline`);

printUsage('Unclassified kidscade_* keys (must be registered before merge)', report.unknownKidscadeKeys, report.kidscadeKeys);
printUsage('Legacy direct localStorage keys (preserved for compatibility; migrate gradually)', report.nonKidscadeDirectKeys, report.directLocalStorageKeys);

const failures = [];
if (report.unknownKidscadeKeys.length) {
  failures.push(`${report.unknownKidscadeKeys.length}개의 kidscade_* 키가 저장 레지스트리에 분류되지 않았습니다.`);
}
if (report.nonKidscadeDirectKeys.length > LEGACY_DIRECT_KEY_BASELINE) {
  failures.push(`비표준 localStorage 키가 기준선 ${LEGACY_DIRECT_KEY_BASELINE}개에서 ${report.nonKidscadeDirectKeys.length}개로 증가했습니다. 새 저장값은 KidscadeStorage 또는 kidscade_ 네임스페이스를 사용하세요.`);
}

if (!report.unknownKidscadeKeys.length) {
  console.log('\nAll literal kidscade_* keys are classified in the shared storage registry.');
}
if (report.nonKidscadeDirectKeys.length <= LEGACY_DIRECT_KEY_BASELINE) {
  console.log('Legacy direct-key count is at or below the migration baseline; no new key sprawl detected.');
}

if (failures.length) {
  console.error('\nStorage policy issues:');
  failures.forEach(item => console.error(`  ERROR ${item}`));
  if (STRICT) process.exitCode = 1;
  else console.error('Report-only mode: use --strict to enforce the policy.');
}

module.exports = { collect, LEGACY_DIRECT_KEY_BASELINE };
