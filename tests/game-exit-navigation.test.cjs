const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.html?$/i.test(entry.name)) out.push(full);
  }
  return out;
}

test('games do not navigate directly to Kidscade index from inside iframe', () => {
  const offenders = [];
  for (const file of walk(path.join(process.cwd(), 'games'))) {
    const html = fs.readFileSync(file, 'utf8');
    if (/href\s*=\s*["'][^"']*index\.html(?:[?#][^"']*)?["']/i.test(html)) {
      offenders.push(path.relative(process.cwd(), file));
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'Use kidscade:close-game postMessage instead of loading index.html inside the game iframe'
  );
});
