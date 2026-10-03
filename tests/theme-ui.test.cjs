const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const theme = require('../theme-ui.js');

function storage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem:key => map.has(key) ? map.get(key) : null,
    setItem:(key,value) => map.set(key,String(value)),
    map
  };
}

function documentFixture() {
  const classes = new Set();
  const button = {
    dataset:{},
    attrs:{},
    textContent:'',
    listeners:{},
    setAttribute(name,value){ this.attrs[name]=String(value); },
    addEventListener(type,fn){ this.listeners[type]=fn; }
  };
  return {
    body:{ classList:{
      toggle(name,force){ if(force) classes.add(name); else classes.delete(name); return force; },
      contains:name => classes.has(name)
    }},
    getElementById:id => id === 'theme-btn' ? button : null,
    button,
    classes
  };
}

test('theme state reads, writes and applies through one module', () => {
  const s=storage({ kidscade_darkmode:'true' });
  const doc=documentFixture();
  assert.equal(theme.read(s),true);
  theme.apply(true,doc);
  assert.equal(doc.body.classList.contains('dark-mode'),true);
  assert.equal(doc.button.attrs['aria-pressed'],'true');
  assert.match(doc.button.textContent,/밝은 모드/);
  theme.write(false,s);
  assert.equal(s.getItem('kidscade_darkmode'),'false');
});

test('theme bind is idempotent and toggles persisted state', () => {
  const s=storage();
  const doc=documentFixture();
  const sounds=[];
  const first=theme.bind({document:doc,localStorage:s,playSound:value=>sounds.push(value)});
  const second=theme.bind({document:doc,localStorage:s,playSound:value=>sounds.push(value)});
  assert.equal(first.bound,true);
  assert.equal(second.bound,false);
  doc.button.listeners.click();
  assert.equal(s.getItem('kidscade_darkmode'),'true');
  assert.equal(doc.body.classList.contains('dark-mode'),true);
  assert.deepEqual(sounds,['click']);
});

test('index_base and compact topbar both delegate theme ownership', () => {
  const html=fs.readFileSync('index_base.html','utf8');
  const bootstrap=fs.readFileSync('main-bootstrap.js','utf8');
  const topbar=fs.readFileSync('ui-topbar-compact.js','utf8');
  assert.match(html,/<script src="theme-ui\.js"><\/script>/);
  assert.match(html,/KidscadeTheme\?\.bind/);
  assert.match(topbar,/KidscadeTheme\?\.bind/);
  assert.doesNotMatch(html,/localStorage\.getItem\('kidscade_darkmode'\)/);
  assert.doesNotMatch(html,/localStorage\.setItem\('kidscade_darkmode'/);
  assert.doesNotMatch(topbar,/localStorage\.getItem\('kidscade_darkmode'\)/);
  assert.doesNotMatch(topbar,/localStorage\.setItem\('kidscade_darkmode'/);
  assert.match(bootstrap,/withVersion\('theme-ui\.js'\)/);
});
