const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const ROOT = path.resolve(__dirname,'..');
const SOURCE = fs.readFileSync(path.join(ROOT,'games/dialect_tour/game.js'),'utf8');
const HTML = fs.readFileSync(path.join(ROOT,'games/dialect_tour/index.html'),'utf8');
const DATA = require(path.join(ROOT,'games/dialect_tour/questions.js'));

class FakeNode {
  constructor(name='div') {
    this.name=name; this.listeners={};this.dataset={};this.children=[];this.hidden=false;
    this.textContent='';this.disabled=false;this.attributes={};this._sub={};
    this.style={setProperty(){},width:''};
    const values=new Set();
    this.classList={add(value){values.add(value)},remove(value){values.delete(value)},toggle(value,force){if(force===undefined ? !values.has(value) : force)values.add(value);else values.delete(value)},contains(value){return values.has(value)}};
  }
  addEventListener(name,handler){ (this.listeners[name]??=[]).push(handler); }
  click(){for(const handler of this.listeners.click||[])handler({preventDefault(){}});}
  append(...items){this.children.push(...items.flatMap(item=>item.name==='fragment'?item.children:[item]));}
  replaceChildren(...items){this.children=[];this.append(...items);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  querySelector(selector){return this._sub[selector]??=new FakeNode(selector);}
  focus(){}
}

function gameHarness() {
  const ids = [...HTML.matchAll(/\bid="([a-z-]+)"/g)].map(match=>match[1]);
  const elements = new Map(ids.map(id=>[id,new FakeNode(id)]));
  const get=id=>elements.get(id) ?? elements.set(id,new FakeNode(id)).get(id);
  const modes=['explore','picture','challenge'].map(mode=>Object.assign(new FakeNode('button'),{dataset:{mode}}));
  const events=[];const storage=new Map();const intervals=new Set();let intervalId=0;
  const document={
    hidden:false,
    getElementById:get,
    querySelectorAll(selector){return selector==='[data-mode]'?modes:selector==='.answer'?get('answers').children:[]},
    createDocumentFragment(){return new FakeNode('fragment')},
    createElement(type){return new FakeNode(type)},
    addEventListener(){}
  };
  const window={
    DialectTourData:DATA,
    localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},
    KidscadeGame:{start(detail){events.push(['start',detail])},result(detail){events.push(['result',detail])},registerCleanup(){}},
    scrollTo(){},setTimeout(){},speechSynthesis:{speak(){},cancel(){}},
  };
  vm.runInNewContext(SOURCE,{window,document,localStorage:window.localStorage,performance:{now:()=>100},setInterval(callback){const id=++intervalId;intervals.add(id);return id},clearInterval(id){intervals.delete(id)},SpeechSynthesisUtterance:class{}});
  return {get,document,window,events,modes,storage,intervals};
}

test('full playthrough: start, answer, feedback, finish, replay and exact lifecycle',() => {
  const game=gameHarness();
  game.get('start-button').click();
  assert.equal(game.events.filter(event=>event[0]==='start').length,1);
  assert.equal(game.get('play-screen').hidden,false);
  for(let i=0;i<10;i++){
    const entry=DATA.ENTRIES.find(item=>item.word===game.get('question-word').textContent);
    assert.ok(entry,'unrecognized displayed question');
    const isRegion=game.get('question-type').textContent.includes('지역');
    const correct=isRegion?DATA.REGIONS.find(region=>region.id===entry.region).name:entry.meaning;
    const button=game.get('answers').children.find(item=>item.dataset.answer===correct);
    assert.ok(button,`No correct button for ${entry.word}`);
    button.click();
    assert.equal(game.get('feedback').hidden,false);
    button.click(); // 두 번 누르더라도 점수가 중복되지 않아야 합니다.
    game.get('next-button').click();
  }
  assert.equal(game.get('result-screen').hidden,false);
  assert.equal(game.events.filter(event=>event[0]==='result').length,1);
  assert.equal(game.events.find(event=>event[0]==='result')[1].correct,10);
  assert.equal(game.events.find(event=>event[0]==='result')[1].scope,'run');
  game.get('again-button').click();
  assert.equal(game.events.filter(event=>event[0]==='start').length,2);
  assert.equal(game.get('play-screen').hidden,false);
});

test('leaving a run records abandonment once; challenge starts its timer',() => {
  const game=gameHarness();
  game.modes[2].click();
  game.get('start-button').click();
  assert.equal(game.get('timer-label').hidden,false);
  assert.equal(game.intervals.size,1);
  game.get('home-button').click();
  assert.equal(game.get('start-screen').hidden,false);
  assert.equal(game.intervals.size,0);
  assert.equal(game.events.filter(event=>event[0]==='result').length,1);
  assert.equal(game.events.find(event=>event[0]==='result')[1].status,'abandoned');
  game.get('home-button').click();
  assert.equal(game.events.filter(event=>event[0]==='result').length,1);
});
