/* Legacy garden entry retired.
   Cube Pets now live entirely inside Kidscade World v3.
   This bootstrap filename stays only for main-shell compatibility.
   Child modules inherit the deployment build id so a fresh lobby can never
   revive an older cached integration layer. */
(() => {
  'use strict';

  let version = 'dev';
  try {
    const src = document.currentScript?.src || '';
    version = new URL(src, document.baseURI).searchParams.get('v') || 'dev';
  } catch (_) {}

  const withVersion = path => path + '?v=' + encodeURIComponent(version);
  const writeScript = path => document.write('<script src="' + withVersion(path) + '"><\\/script>');

  writeScript('avatar-integration.js');
  writeScript('seed-world-meta.js');
  writeScript('avatar-preview-boot-fix.js');
  writeScript('life-world-integration.js');
})();
