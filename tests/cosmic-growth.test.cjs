const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const dir=path.join(ROOT,'games','science_cosmic_growth');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'style.css'),'utf8');
const js=fs.readFileSync(path.join(dir,'game.js'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'data','games.json'),'utf8'));

test('cosmic growth game shell is wired to local Three and Kidscade SDK',()=>{
  assert.match(html,/<title>먼지에서 블랙홀까지<\/title>/);
  assert.match(html,/data-game-id="science_cosmic_growth"/);
  assert.match(html,/assets\/vendor\/three-r160\/three\.module\.js/);
  assert.match(html,/game\.js\?v=1/);
  assert.match(html,/id="tapLayer"/);
  assert.match(html,/id="codex"/);
});

test('cosmic growth module has valid JS after module imports are stripped',()=>{
  const body=js.replace(/^import .*$/mg,'');
  assert.doesNotThrow(()=>new Function(body));
});

test('cosmic growth spans dust through quasar and reuses existing assets',()=>{
  for(const id of ['dust','asteroid','rocky_planet','star','supernova','stellar_black_hole','supermassive_black_hole','quasar']){
    assert.match(js,new RegExp("id:'"+id+"'"));
  }
  assert.match(js,/space\/planets\/planet/);
  assert.match(js,/3d\/nature\/kenney-nature-kit\/rock-/);
  assert.match(js,/effects\/particles\/kenney-particle-pack\/flare-01\.png/);
  assert.match(js,/effects\/particles\/kenney-particle-pack\/twirl-02\.png/);
  assert.match(js,/LOW_POWER/);
});

test('science facts and observation events are part of actual progression',()=>{
  for(const id of ['fusion','aurora','supernova','event_horizon','lensing','spaghettification','gravity_wave','jet']){
    assert.match(js,new RegExp("id:'"+id+"'"));
  }
  assert.match(js,/function discover\(/);
  assert.match(js,/function observeEvent\(/);
  assert.match(js,/science_cosmic_growth\.black_hole/);
  assert.match(js,/science_cosmic_growth\.discoveries_12/);
});

test('cosmic growth is registered as an all-grade science simulation',()=>{
  const game=catalog.games.find(x=>x.id==='science_cosmic_growth');
  assert.ok(game);
  assert.equal(game.title,'먼지에서 블랙홀까지');
  assert.equal(game.subject,'science');
  assert.equal(game.genre,'simulation');
  assert.equal(game.age,'low');
  assert.deepEqual(game.ages,['low','high']);
  assert.deepEqual(game.input,['touch','keyboard']);
  assert.equal(game.href,'games/science_cosmic_growth/index.html?v=1');
});

test('mobile layout keeps the upgrade strip compact',()=>{
  assert.match(css,/@media\(max-width:680px\)/);
  assert.match(css,/\.upgradeList\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});