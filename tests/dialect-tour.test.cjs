const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const gameDir = path.join(root, 'games/dialect_tour');
const data = require(path.join(gameDir, 'questions.js'));
const catalog = JSON.parse(fs.readFileSync(path.join(root,'data/games.json'),'utf8')).games;

test('말맛 전국일주 is playable and visible across age groups', () => {
  const entries = catalog.filter(game => game.id === 'dialect_tour');
  assert.equal(entries.length, 1);
  const game = entries[0];
  assert.equal(game.title,'말맛 전국일주');
  assert.equal(game.genre,'quiz');
  assert.equal(game.subject,'korean');
  assert.deepEqual(game.ages,['toddler','low','high']);
  assert.equal(game.scoreKey,'dialectTourBestScore');
  for (const asset of [game.href,game.cover]) assert.ok(fs.existsSync(path.join(root,asset)),`${asset} missing`);
  const html = fs.readFileSync(path.join(root,game.href),'utf8');
  assert.match(html,/data-game-id="dialect_tour"/);
  assert.match(html,/id="start-button"/);
  assert.match(html,/id="next-button"/);
});

test('regional words have stable unique IDs, meanings, sources, and unambiguous choices', () => {
  assert.ok(data.ENTRIES.length >= 30);
  assert.equal(new Set(data.ENTRIES.map(item=>item.id)).size,data.ENTRIES.length);
  assert.deepEqual(new Set(data.REGIONS.map(item=>item.id)),new Set(['gangwon','chungcheong','jeolla','gyeongsang','jeju']));
  for (const item of data.ENTRIES) {
    assert.ok(data.REGIONS.some(region=>region.id === item.region), item.id+' region missing');
    assert.ok(item.word && item.meaning && item.context, item.id+' content missing');
    assert.match(item.source,/^https:\/\//, item.id+' source missing');
    assert.equal(item.wrong.length,3,item.id+' needs three distractors');
    assert.equal(new Set([item.meaning,...item.wrong]).size,4,item.id+' has duplicate answers');
    if (item.shared) assert.equal(item.regionQuiz,false,item.id+' shared words must not be regional trivia');
    for (const size of [3,4]) {
      const choices = data.makeOptions(item,size,()=>.41);
      assert.equal(choices.length,size);
      assert.equal(choices.filter(answer=>answer===item.meaning).length,1);
    }
  }
});

test('regional deck has no repeats and nationwide deck covers all five regions', () => {
  for (const region of data.REGIONS) {
    const deck = data.makeDeck(region.id,10,()=>.37);
    assert.ok(deck.length>=5,region.id+' has too few playable questions');
    assert.equal(new Set(deck.map(item=>item.id)).size,deck.length);
    assert.ok(deck.every(item=>item.region===region.id));
  }
  for (const seed of [.1,.4,.8]) {
    const deck = data.makeDeck('all',10,()=>seed);
    assert.equal(deck.length,10);
    assert.equal(new Set(deck.map(item=>item.id)).size,10);
    assert.equal(new Set(deck.map(item=>item.region)).size,5);
  }
});

test('the game emits proper start and result lifecycle events', () => {
  const gameJs = fs.readFileSync(path.join(gameDir,'game.js'),'utf8');
  assert.match(gameJs,/KidscadeGame\?\.start\?/);
  assert.match(gameJs,/scope:'run', status:'completed'/);
  assert.match(gameJs,/scope:'run', status:'abandoned'/);
  assert.match(gameJs,/function answerQuestion\(choice\)/);
  assert.match(gameJs,/if \(!state\.running \|\| state\.answered\) return false/);
  assert.match(gameJs,/visibilitychange/);
});
