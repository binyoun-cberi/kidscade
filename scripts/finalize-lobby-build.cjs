'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { composeLobby } = require('./compose-lobby-build.cjs');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist');

function read(rel) {
  const file = path.join(OUT, rel);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error(`Final lobby build missing required file: ${rel}`);
  }
  return fs.readFileSync(file, 'utf8');
}

async function main() {
  const version = JSON.parse(read('kidscade-version.json'));
  const buildId = String(version?.build || '').trim();
  if (!buildId) throw new Error('Final lobby build id is missing.');

  const catalog = JSON.parse(read('data/games.json'));
  const html = await composeLobby({
    bootstrapSource: read('main-bootstrap.js'),
    baseHtml: read('index_base.html'),
    catalog,
    buildId
  });

  if (html.includes('__KIDSCADE_BUILD__')) {
    throw new Error('Final lobby still contains the unresolved build marker.');
  }
  if (/<script\b[^>]*src=["'][^"']*main-bootstrap\.js/i.test(html)) {
    throw new Error('Final lobby must not reload main-bootstrap.js in the browser.');
  }
  if (!/window\.KidscadeCatalog=/.test(html)) {
    throw new Error('Final lobby is missing the boot catalog payload.');
  }

  fs.writeFileSync(path.join(OUT, 'index.html'), html, 'utf8');
  console.log(`[lobby-finalize] precomposed ${catalog.games.length} catalog games into dist/index.html`);
}

main().catch(error => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
