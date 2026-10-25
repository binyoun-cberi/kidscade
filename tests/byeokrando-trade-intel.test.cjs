const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const base = 'games/high_byeokrando_voyage/';
const core = require('../games/high_byeokrando_voyage/byeokrando-trade-intel-core.js');

test('trade intelligence records real differences rather than attempted purchases', () => {
  assert.deepEqual(core.cargoChanges({a:2,b:1}, {a:2,b:3}), [{id:'b',before:1,after:3,delta:2}]);
  assert.deepEqual(core.cargoChanges({a:2}, {a:0}), [{id:'a',before:2,after:0,delta:-2}]);
  assert.deepEqual(core.cargoChanges({a:2}, {a:2}), []);
  assert.deepEqual(core.cargoChanges({}, {}), []);
});

test('journal remains backward safe, bounded, and treats user-controlled text as text', () => {
  const entry = {kind:'trade', port:'명주',name:'고려청자',qty:1,direction:'sell',at:300};
  let history = core.normalizeJournal(null);
  for (let i=0;i<100;i++) history = core.appendEntry(history, entry);
  assert.equal(history.entries.length,80);
  assert.deepEqual(core.normalizeJournal({entries:[{kind:'invalid'},entry]}).entries,[entryWithDefaults(entry)]);
  assert.equal(core.shortText(' a \n  b \t c  '), 'a b c');
  assert.equal(core.shortText('<img src=x onerror=alert(1)>'), '<img src=x onerror=alert(1)>');
});
function entryWithDefaults(e) { return {kind:e.kind,port:e.port,name:e.name,text:'',qty:e.qty,direction:e.direction,at:e.at}; }

test('rumor extraction uses real native entries only and ignores missing fields', () => {
  assert.equal(core.nativeRumor({}), '');
  assert.equal(core.nativeRumor({rumors:['짧음']}), '');
  assert.equal(core.nativeRumor({rumors:[{text:'명주에서 고려청자를 찾는 이가 많다고 한다.'}]}),'명주에서 고려청자를 찾는 이가 많다고 한다.');
  assert.equal(core.goodsName({pot:{name:'청자'}},'pot'),'청자');
  assert.equal(core.portName({mingzhou:{name:'명주'}},'mingzhou'),'명주');
});

test('journal and merchant conversation compile and do not replace economy formulas', () => {
  const source = read(base + 'byeokrando-trade-intel.js');
  assert.doesNotThrow(() => new Function(source));
  assert.match(source,/core\.cargoChanges/);
  assert.match(source,/setTimeout/);
  assert.match(source,/disabled/);
  assert.match(source,/drinkRumorBtn/);
  assert.match(source,/getGoods/);
  assert.match(source,/getState/);
  assert.doesNotMatch(source,/eval\(/);
});

test('original launcher injects trade module and retains prior assets and tutorial', () => {
  const launch = read(base + '벽란도 상행기-launch.html');
  assert.match(launch, /byeokrando-trade-intel-core\.js\?v=1/);
  assert.match(launch, /byeokrando-trade-intel\.js\?v=1/);
  assert.match(launch, /byeokrando-tutorial\.js\?v=2/);
  assert.match(launch, /byeokrando-assets\.js\?v=4/);
  assert.match(launch, /getGoods:\(\)=>GOODS/);
  assert.match(launch, /getState:\(\)=>State/);
});
