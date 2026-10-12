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

  // The final HTML is composed from index_base.html; validating only the
  // bootstrap index.html would silently miss absent favicon links.
  const pngMatch = html.match(/<link\\s+rel="icon"[^>]*href="\\/(favicon-[a-f0-9]{12}\\.png)"/i);
  const touchMatch = html.match(/<link\\s+rel="apple-touch-icon"[^>]*href="\\/(apple-touch-icon-[a-f0-9]{12}\\.png)"/i);
  if (!pngMatch || !touchMatch || pngMatch[1].slice(8, 20) !== touchMatch[1].slice(17, 29)) {
    throw new Error('Final lobby is missing consistent versioned favicon and Apple touch icon links.');
  }
  for (const file of [pngMatch[1], touchMatch[1], 'favicon.ico']) {
    const filepath = path.join(OUT, file);
    if (!fs.existsSync(filepath) || fs.statSync(filepath).size < 100) {
      throw new Error(`Final lobby favicon asset is missing or empty: ${file}`);
    }
  }

  fs.writeFileSync(path.join(OUT, 'index.html'), html, 'utf8');

  const legacyTemplatePath = path.join(OUT, 'index_base.html');
  fs.rmSync(legacyTemplatePath, { force: true });
  if (fs.existsSync(legacyTemplatePath)) {
    throw new Error('Final lobby must not publish index_base.html.');
  }

  console.log(`[lobby-finalize] precomposed ${catalog.games.length} catalog games into dist/index.html`);
  console.log('[lobby-finalize] omitted transitional index_base.html from public dist');
}

main().catch(error => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
