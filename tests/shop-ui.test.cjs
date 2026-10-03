const test = require('node:test');
const assert = require('node:assert/strict');
const shopUi = require('../shop-ui.js');

function classList() {
  const set = new Set();
  return {
    add(name){ set.add(name); },
    remove(...names){ names.forEach(name=>set.delete(name)); },
    toggle(name,force){ if(force) set.add(name); else set.delete(name); },
    contains(name){ return set.has(name); }
  };
}

function documentFixture() {
  const body = { classList: classList() };
  const elements = new Map();
  function get(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        classList: classList(),
        dataset:{},
        innerText:'',
        innerHTML:'',
        children:[],
        appendChild(node){ this.children.push(node); },
        addEventListener(){},
        setAttribute(){},
        querySelector(){ return null; }
      });
    }
    return elements.get(id);
  }
  return {
    body,
    getElementById:id => get(id),
    querySelectorAll:() => [],
    createElement:() => ({
      className:'',
      innerHTML:'',
      innerText:'',
      disabled:false,
      appendChild(){},
      querySelector(){ return null; },
      addEventListener(){}
    }),
    elements
  };
}

function stateFixture() {
  let equipped={ badge:'badge_basic', card:'card_basic', land:'land_basic' };
  let inventory={ badge:['badge_basic'], card:['card_basic'], land:['land_basic'] };
  return {
    owns:(category,id) => (inventory[category]||[]).includes(id),
    getEquipped:category => equipped[category] || '',
    grant(category,id){
      inventory={...inventory,[category]:[...(inventory[category]||[]),id]};
      equipped={...equipped,[category]:id};
      return {ok:true,inventory,equipped};
    },
    equip(category,id){
      equipped={...equipped,[category]:id};
      return {ok:true,inventory,equipped};
    },
    subscribe(){ return () => {}; }
  };
}

const shopDB={
  badge:[
    {id:'badge_basic',icon:'🌱',prefix:'신입생',noun:'게이머'},
    {id:'badge_pro',icon:'⭐',prefix:'반짝',noun:'탐험가',price:20}
  ],
  card:[
    {id:'card_basic',className:''},
    {id:'card_neon',className:'card-skin-neon',price:20}
  ],
  land:[
    {id:'land_basic',className:''},
    {id:'land_lab',className:'land-lab',price:20}
  ]
};

test('shop controller owns active tab instead of relying on a global currentShopTab', () => {
  const controller=shopUi.create({shopDB,document:documentFixture()});
  assert.equal(controller.getActiveTab(),'land');
  assert.equal(controller.openTab('card',{open:false,sound:false}),'card');
  assert.equal(controller.getActiveTab(),'card');
});

test('shop purchase delegates persistence to shop-state and spends seeds once', () => {
  const doc=documentFixture();
  const state=stateFixture();
  let spent=0;
  let mirrors=null;
  const controller=shopUi.create({
    document:doc,
    shopDB,
    shopState:state,
    getCoins:()=>100,
    changeSeeds:amount => { spent += amount; return true; },
    syncMirrors:value => { mirrors=value; }
  });
  const result=controller.buy('card',{id:'card_neon',name:'네온 카드',price:20,className:'card-skin-neon'});
  assert.equal(result.ok,true);
  assert.equal(spent,-20);
  assert.equal(state.getEquipped('card'),'card_neon');
  assert.equal(mirrors.equipped.card,'card_neon');
});

test('shop purchase blocks insufficient balance before persistence', () => {
  const state=stateFixture();
  let changed=0;
  const controller=shopUi.create({
    document:documentFixture(),
    shopDB,
    shopState:state,
    getCoins:()=>5,
    changeSeeds:() => { changed++; return true; }
  });
  const result=controller.buy('card',{id:'card_neon',name:'네온 카드',price:20});
  assert.equal(result.ok,false);
  assert.equal(result.reason,'insufficient-balance');
  assert.equal(changed,0);
  assert.equal(state.getEquipped('card'),'card_basic');
});

test('equipped card land and badge visuals are applied from shared shop state', () => {
  const doc=documentFixture();
  const state=stateFixture();
  state.grant('badge','badge_pro');
  state.grant('card','card_neon');
  state.grant('land','land_lab');
  const controller=shopUi.create({document:doc,shopDB,shopState:state});
  controller.applyEquipped();
  assert.equal(doc.getElementById('profile-emoji').innerText,'⭐');
  assert.equal(doc.getElementById('profile-prefix').innerText,'반짝');
  assert.equal(doc.getElementById('profile-noun').innerText,'탐험가');
  assert.equal(doc.body.classList.contains('card-skin-neon'),true);
  assert.equal(doc.body.classList.contains('land-lab'),true);
});
