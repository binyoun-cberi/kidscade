const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/games.json')));
const aliases = JSON.parse(fs.readFileSync(path.join(root, 'data/game-path-aliases.json')));
const reserved = { ':': '：', '?': '？', '/': '／', '\\': '＼', '*': '＊', '"': '＂', '<': '＜', '>': '＞', '|': '｜' };

test('all game entry filenames match card titles and remain unique', () => {
  const seen = new Set();
  for (const game of catalog.games) {
    const filename = decodeURIComponent(game.href.split(/[?#]/)[0]);
    assert.equal(path.basename(filename), game.title.replace(/[:?\/\\*"<>|]/g, c => reserved[c]) + '.html', game.id);
    assert.ok(!seen.has(filename), `duplicate entry: ${filename}`);
    seen.add(filename);
    const html = fs.readFileSync(path.join(root, filename), 'utf8');
    assert.ok(html.length > 1000, `canonical entry is only a redirect: ${filename}`);
  }
});

test('old entry URLs reach canonical games and preserve query strings and fragments', () => {
  for (const [oldPath, target] of Object.entries(aliases)) {
    const html = fs.readFileSync(path.join(root, oldPath), 'utf8');
    assert.ok(html.length < 2000, `old path still duplicates the game: ${oldPath}`);
    let redirected;
    vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], {
      location: { search: '?room=ABC123&mode=duel', hash: '#resume', replace: value => { redirected = value; } }
    });
    const url = new URL(redirected, 'https://example.com/kidscade/' + oldPath);
    assert.equal(decodeURIComponent(url.pathname), '/kidscade/' + target);
    assert.equal(url.search, '?room=ABC123&mode=duel');
    assert.equal(url.hash, '#resume');
    assert.ok(!aliases[target], `redirect chain: ${target}`);
    assert.ok(fs.existsSync(path.join(root, target)));
  }
});
