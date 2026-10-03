#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'config', 'architecture-ratchet.json');

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function countOccurrences(text, token) {
  return token ? text.split(token).length - 1 : 0;
}

function collectMetrics() {
  const catalog = readJson('data/games.json');
  const games = Array.isArray(catalog && catalog.games) ? catalog.games : [];

  const rootRuntimeJs = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(function (entry) {
      return entry.isFile() && /\.js$/i.test(entry.name);
    }).length;

  const catalogRootEntrypoints = games.filter(function (game) {
    const href = String((game && game.href) || '');
    return href && !href.startsWith('games/');
  }).length;

  const catalogManualVersionPins = games.filter(function (game) {
    return /[?&]v=\d+\b/.test(String((game && game.href) || ''));
  }).length;

  const bootstrapReplaceBetweenOccurrences = countOccurrences(
    readText('main-bootstrap.js'),
    'replaceBetween('
  );

  const injectScriptCount = fs.readdirSync(path.join(ROOT, 'scripts'), { withFileTypes: true })
    .filter(function (entry) {
      return entry.isFile() && /^inject-.*\.cjs$/i.test(entry.name);
    }).length;

  return {
    rootRuntimeJs,
    catalogRootEntrypoints,
    catalogManualVersionPins,
    bootstrapReplaceBetweenOccurrences,
    injectScriptCount
  };
}

function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const maximums = (config && config.maximums) || {};
  const metrics = collectMetrics();
  const failures = [];

  console.log('Kidscade architecture ratchet');
  console.log('-----------------------------------------------');

  Object.entries(maximums).forEach(function (pair) {
    const name = pair[0];
    const maximum = pair[1];
    const current = metrics[name];
    const ok = Number.isFinite(current) && current <= maximum;
    console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + ': ' + current + ' / max ' + maximum);
    if (!ok) failures.push(name + ': ' + current + ' > ' + maximum);
  });

  if (failures.length) {
    console.error('\nArchitecture debt increased:');
    failures.forEach(function (failure) {
      console.error('- ' + failure);
    });
    console.error('\nMove new code into the target architecture instead of expanding the legacy surface.');
    console.error('When migration lowers a metric, lower its maximum in config/architecture-ratchet.json in the same PR.');
    process.exitCode = 1;
    return;
  }

  console.log('\nArchitecture debt did not increase.');
}

if (require.main === module) main();

module.exports = { collectMetrics };
