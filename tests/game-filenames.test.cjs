const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/games.json')));
const aliases = JSON.parse(fs.readFileSync(path.join(root, 'data/game-path-aliases.json')));
const reserved = { ':': '：', '?': '？', '/': '／', '\\': '＼', '*': '＊', '"': '＂', '<': '＜', '>': '＞', '|': '｜' };
const reviewedEntryFilenames = new Map([
  ['high_byeokrando_voyage', '벽란도 상행기-launch.html'],
  ['high_history_timebattle_live', 'history_timebattle.html']
]);

test('renamed games live below games without increasing the root HTML baseline', () => {
  const rootHtml = fs.readdirSync(root).filter(file => /\.html?$/i.test(file));
  assert.ok(rootHtml.length <= 114);
  for (const target of Object.values(aliases)) assert.ok(target.startsWith('games/'), target);
});

test('moved game assets resolve under both a domain root and a repository subpath', () => {
  for (const target of new Set(Object.values(aliases))) {
    const html = fs.readFileSync(path.join(root, target), 'utf8');
    for (const match of html.matchAll(/["'`]((?:\.\.\/){2}(?:assets\/[^"'`\s]+|[^/"'`\s]+\.js(?:\?[^"'`\s]*)?))/g)) {
      if (match[1].includes('${')) continue;
      for (const prefix of ['/', '/kidscade/']) {
        const url = new URL(match[1], 'https://example.com' + prefix + target);
        assert.ok(url.pathname.startsWith(prefix));
        const local = decodeURIComponent(url.pathname.slice(prefix.length));
        assert.ok(fs.existsSync(path.join(root, local)), `${target}: ${match[1]}`);
      }
    }
  }
});

test('game entry filenames follow the folder standard or a preserved legacy filename', () => {
  const seen = new Set();
  for (const game of catalog.games) {
    const filename = decodeURIComponent(game.href.split(/[?#]/)[0]);
    const basename = path.basename(filename);
    const titleFilename = game.title.replace(/[:?\/\\*"<>|]/g, c => reserved[c]) + '.html';
    const reviewedLegacy = reviewedEntryFilenames.get(game.id);
    const foldered = filename.startsWith('games/');

    if (foldered) {
      assert.ok(
        basename === 'index.html' || basename === titleFilename || basename === reviewedLegacy,
        `${game.id}: foldered game entry should prefer index.html or preserve a reviewed legacy filename, got ${basename}`
      );
    } else {
      assert.equal(basename, reviewedLegacy || titleFilename, game.id);
    }

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
