#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const storageApi = require('../kidscade-storage.js');

const ROOT = path.resolve(__dirname, '..');
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

  const registered = new Set(Object.values(storageApi.keys));
  const unknownKidscadeKeys = [...kidscadeKeys.keys()].filter(key => !registered.has(key)).sort();
  const registeredInUse = [...registered].filter(key => kidscadeKeys.has(key)).sort();
  const registeredNotSeenLiterally = [...registered].filter(key => !kidscadeKeys.has(key)).sort();
  const nonKidscadeDirectKeys = [...directLocalStorageKeys.keys()].filter(key => !key.startsWith('kidscade_')).sort();

  return {
    kidscadeKeys,
    directLocalStorageKeys,
    registered,
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
console.log(`- registered shared keys: ${report.registered.size}`);
console.log(`- kidscade_* literals found: ${report.kidscadeKeys.size}`);
console.log(`- registered keys currently in use: ${report.registeredInUse.length}`);
console.log(`- unregistered kidscade_* literals: ${report.unknownKidscadeKeys.length}`);
console.log(`- non-kidscade direct localStorage keys: ${report.nonKidscadeDirectKeys.length}`);

printUsage('Unregistered kidscade_* keys (review for shared registry or game-specific ownership)', report.unknownKidscadeKeys, report.kidscadeKeys);
printUsage('Non-kidscade direct localStorage keys (normally game-specific)', report.nonKidscadeDirectKeys, report.directLocalStorageKeys);

if (!report.unknownKidscadeKeys.length) {
  console.log('\nAll literal kidscade_* keys are represented in the shared registry.');
}

module.exports = { collect };
