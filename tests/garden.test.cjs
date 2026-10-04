const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('retired standalone garden runtime stays removed while Seed World preserves legacy save migration', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'garden-core.js')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'garden-life.js')), false);

  const loader = read('garden.js');
  assert.doesNotMatch(loader, /garden-core\.js|garden-life\.js/);

  const integration = read('life-world-integration.js');
  assert.match(integration, /WORLD_URL='world-v3\/kidscade-world\.html\?v=\d+'/);

  const world = read('world-v3/kidscade-world-v3.js');
  assert.match(world, /localStorage\.getItem\('kidscade_garden_v1'\)/);
});
