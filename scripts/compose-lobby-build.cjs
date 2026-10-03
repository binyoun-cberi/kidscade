'use strict';

const vm = require('node:vm');

const BOOT_CALL = '\n  boot();\n})();';
const BUILD_BOOT_CALL = '\n  globalThis.__KIDSCADE_BUILD_BOOT_PROMISE__ = boot();\n})();';

function instrumentBootstrap(source) {
  const text = String(source || '');
  if (!text.includes(BOOT_CALL)) {
    throw new Error('main-bootstrap.js boot marker not found.');
  }
  return text.replace(BOOT_CALL, BUILD_BOOT_CALL);
}

function responseFor(url, baseHtml, catalog) {
  const value = String(url || '');
  if (/index_base\.html(?:\?|$)/.test(value)) {
    return {
      ok: true,
      status: 200,
      text: async () => baseHtml
    };
  }
  if (/data\/games\.json(?:\?|$)/.test(value)) {
    return {
      ok: true,
      status: 200,
      json: async () => catalog
    };
  }
  return {
    ok: false,
    status: 404,
    text: async () => '',
    json: async () => ({})
  };
}

async function composeLobby({
  bootstrapSource,
  baseHtml,
  catalog,
  buildId,
  origin = 'https://kidscade.build/'
}) {
  const version = String(buildId || '').trim();
  if (!version) throw new Error('Kidscade lobby composition requires a build id.');
  if (!baseHtml || typeof baseHtml !== 'string') throw new Error('Kidscade lobby composition requires index_base.html.');
  if (!catalog || !Array.isArray(catalog.games)) throw new Error('Kidscade lobby composition requires data/games.json.');

  let output = '';
  const baseUrl = new URL('/', origin).href;
  const scriptUrl = new URL(`main-bootstrap.js?v=${encodeURIComponent(version)}`, baseUrl).href;
  const document = {
    currentScript: { src: scriptUrl },
    baseURI: baseUrl,
    open() { output = ''; },
    write(html) { output += String(html || ''); },
    close() {},
    getElementById() { return null; }
  };
  const context = vm.createContext({
    URL,
    console,
    document,
    location: { href: baseUrl },
    fetch: async url => responseFor(url, baseHtml, catalog)
  });

  vm.runInContext(instrumentBootstrap(bootstrapSource), context, {
    filename: 'main-bootstrap.js'
  });
  const bootPromise = context.__KIDSCADE_BUILD_BOOT_PROMISE__;
  if (!bootPromise || typeof bootPromise.then !== 'function') {
    throw new Error('Kidscade lobby bootstrap did not expose a build promise.');
  }
  await bootPromise;

  if (!output.trim()) throw new Error('Kidscade lobby composition produced an empty document.');
  return output;
}

module.exports = Object.freeze({
  instrumentBootstrap,
  composeLobby
});
