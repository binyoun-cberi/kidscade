const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('index_base delegates the large stylesheet to main-shell.css', () => {
  const html = read('index_base.html');
  const css = read('main-shell.css');

  assert.match(html, /<link\s+rel="stylesheet"\s+href="main-shell\.css">/);
  assert.doesNotMatch(html, /<style>[\s\S]{50000,}<\/style>/);
  assert.ok(css.length > 50000, 'main-shell.css should contain the extracted legacy shell stylesheet');
  assert.match(css, /#age-selection-screen/);
  assert.match(css, /#game-list/);
  assert.match(css, /#pet-widget/);
});

test('bootstrap cache-busts the extracted stylesheet with the runtime version', () => {
  const source = read('main-bootstrap.js');
  assert.match(source, /withVersion\('main-shell\.css'\)/);
});
