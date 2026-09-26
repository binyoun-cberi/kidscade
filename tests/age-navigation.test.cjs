const test = require('node:test');
const assert = require('node:assert/strict');
const navigation = require('../age-navigation.js');
const launcher = require('../game-launcher.js');

function fixture(saved, blockedStorage = false) {
  const timers = new Map(); let nextTimer = 0; const changes = []; let entered = 0;
  const buttons = ['toddler', 'low', 'high', 'job'].map(age => ({ dataset: { targetAge: age }, focus() {} }));
  const elements = Object.fromEntries(['age-selection-screen', 'main-app', 'current-age-label', 'kc-age-hero-label', 'btn-change-age'].map(id => [id, {
    style: {}, attrs: {}, listeners: {}, focused: false,
    setAttribute(k,v) { this.attrs[k] = v; },
    querySelectorAll() { return buttons; }, querySelector() { return buttons[0]; },
    addEventListener(k,fn) { this.listeners[k] = fn; }, focus() { this.focused = true; }
  }]));
  const document = { body: {dataset: {}}, getElementById: id => elements[id] };
  const storage = { getItem() { if (blockedStorage) throw Error('blocked'); return saved; }, setItem(k,v) { if (blockedStorage) throw Error('blocked'); saved=v; } };
  const api = navigation.create({ document, storage, setTimeout(fn) { timers.set(++nextTimer,fn); return nextTimer; }, clearTimeout(id) { timers.delete(id); } });
  const init = () => api.init({onAgeChange: age => changes.push(age), onEntered: () => entered++});
  init();
  const flush = () => { const jobs=[...timers.values()];timers.clear();jobs.forEach(fn=>fn()); };
  const click = age => { const event = {target: {closest: () => buttons.find(b=>b.dataset.targetAge===age)}, preventDefault() {this.prevented=true;}, stopPropagation() {}, stopImmediatePropagation() {this.stopped=true;}}; elements['age-selection-screen'].listeners.click(event);return event; };
  return {api,elements,changes,flush,click,init,entered:()=>entered};
}

test('first visit: age gesture is consumed, background stays inert until ready, no game starts', () => {
  for (const age of ['toddler','low','high','job']) {
    const f=fixture(null);
    assert.equal(f.api.canLaunch(),false);
    const event=f.click(age);
    assert.ok(event.stopped && event.prevented);
    assert.equal(f.api.state().phase,'entering');
    assert.equal(f.elements['main-app'].inert,true);
    assert.equal(f.elements['age-selection-screen'].style.visibility,'visible');
    const result=launcher.open({}, {dataset:{id:'demo'}}, {canLaunch:f.api.canLaunch});
    assert.equal(result.reason,'navigation-not-ready');
    f.click(age);assert.deepEqual(f.changes,[age]);
    f.flush();assert.equal(f.api.canLaunch(),true);assert.equal(f.elements['main-app'].inert,false);
    assert.equal(f.entered(),1);assert.equal(f.elements['btn-change-age'].focused,true);
  }
});

test('valid saved age enters lobby; unknown saved values return to selection', () => {
  for (const age of ['toddler','low','high','job']) { const f=fixture(age);assert.equal(f.api.state().phase,'ready');assert.deepEqual(f.changes,[age]); }
  for (const age of ['',null,'all','undefined','invalid']) assert.equal(fixture(age).api.state().phase,'selecting');
});

test('age changes cancel pending transitions and initialization cannot bind twice', () => {
  const f=fixture('high');f.init();assert.deepEqual(f.changes,['high']);
  f.api.showSelector();assert.equal(f.api.canLaunch(),false);
  f.click('low');f.api.showSelector();f.flush();assert.equal(f.api.state().phase,'selecting');
  f.click('job');f.flush();assert.deepEqual(f.api.state(),{phase:'ready',age:'job'});assert.equal(f.entered(),1);
});

test('blocked storage still permits session selection', () => {
  const f=fixture(null,true);f.click('high');f.flush();assert.equal(f.api.canLaunch(),true);
});

test('double click, held key, and age-button events cannot launch games after transition', () => {
  const f=fixture('high');
  assert.equal(f.api.canLaunch({detail:2}),false);
  assert.equal(f.api.canLaunch({repeat:true}),false);
  assert.equal(f.api.canLaunch({target:{closest:()=>({})}}),false);
  assert.equal(f.api.canLaunch({detail:1,target:{closest:()=>null}}),true);
});

test('second launch cannot overwrite a live session', () => {
  const result=launcher.open({}, {dataset:{id:'second'}}, {canLaunch:()=>true,getSession:()=>({id:'first'})});
  assert.equal(result.reason,'session-active');
});
