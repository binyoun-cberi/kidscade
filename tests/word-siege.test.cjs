const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','language_word_siege');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const runtime=fs.readFileSync(path.join(dir,'game.js'),'utf8');
const dataSource=fs.readFileSync(path.join(dir,'word-data.js'),'utf8');

function loadData(){
  const sandbox={window:{}};
  vm.runInNewContext(dataSource,sandbox,{filename:'word-data.js'});
  return sandbox.window.WordSiegeData;
}

function canSpell(rack,word){
  const counts={};
  for(const c of rack)counts[c]=(counts[c]||0)+1;
  for(const c of word){if(!counts[c])return false;counts[c]--}
  return true;
}

test('Word Siege runtime parses and uses Kidscade shared storage',()=>{
  for(const file of ['game.js','word-data.js']){
    const src=fs.readFileSync(path.join(dir,file),'utf8');
    const parsed=spawnSync(process.execPath,['--check'],{input:src,encoding:'utf8'});
    assert.equal(parsed.status,0,parsed.stderr||parsed.stdout);
  }
  assert.ok(html.includes('../../kidscade-storage.js'));
  assert.ok(html.includes('data-game-id="language_word_siege"'));
  assert.ok(!runtime.includes('localStorage.getItem('));
  assert.ok(!runtime.includes('localStorage.setItem('));
});

test('Word Siege starts with a guaranteed economy and attack choice',()=>{
  const data=loadData();
  assert.equal(data.maxRack,12);
  assert.equal(data.startRack.length,12);
  assert.ok(canSpell(data.startRack,'MINER'));
  assert.ok(canSpell(data.startRack,'ARROW'));
  assert.equal(data.words.MINER.role,'resource');
  assert.equal(data.words.ARROW.role,'rapid');
  assert.equal(data.words.FIRE.role,'burn');
  assert.equal(data.words.ICE.role,'slow');
  assert.equal(data.words.FAST.role,'modifier');
  assert.ok(Object.keys(data.words).length>=400);
  assert.equal(data.wordList.length,437);
  assert.equal(data.combos.length,20);
  assert.ok(Object.keys(data.signatures).length>=60);
});

test('Word Siege contains the intended tower-defense and anti-stall loop',()=>{
  assert.match(runtime,/const MAX_WAVES=8|state\.wave>=8|WAVE.*8/);
  assert.match(runtime,/function availableWords\(/);
  assert.match(runtime,/function showHint\(/);
  assert.match(runtime,/function ensurePlayableRack\(/);
  assert.match(runtime,/def\.role==='resource'/);
  assert.match(runtime,/function applyLinks\(/);
  assert.match(runtime,/Math\.max\(\.65,Math\.pow\(\.93,duplicates\)\)/);
  assert.match(runtime,/function startWave\(/);
  assert.match(runtime,/function endGame\(/);
});

test('Word Siege storage keys are registered',()=>{
  const storage=fs.readFileSync(path.join(root,'kidscade-storage.js'),'utf8');
  assert.match(storage,/wordSiegeDictionary:\s*'kidscade_word_siege_discovered_v1'/);
  assert.match(storage,/wordSiegeBest:\s*'kidscade_word_siege_best_v1'/);
});

test('Word Siege is registered as a language strategy game',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='language_word_siege');
  assert.ok(game);
  assert.equal(game.title,'워드 시즈');
  assert.equal(game.subject,'language');
  assert.equal(game.genre,'strategy');
  assert.deepEqual(game.ages,['low','high']);
  assert.equal(game.scoreKey,'kidscade_word_siege_best_v1');
});


test('Word Siege word semantics and combos are internally consistent',()=>{
  const d=loadData();
  for(const [word,entry] of Object.entries(d.words)){
    assert.match(word,/^[A-Z]+$/);
    assert.ok(word.length<=d.maxRack,'unspellable entry: '+word);
    assert.ok(entry.meaning&&!entry.meaning.startsWith('빠른 공격'),'missing meaning: '+word);
    assert.ok(d.roleStats[entry.role],'unknown role: '+word);
    assert.ok(entry.difficulty>=1&&entry.difficulty<=9);
  }
  for(const pair of d.combos){
    assert.ok(d.words[pair.a]&&d.words[pair.b],'missing combo word '+pair.name);
    assert.ok(pair.name);
  }
  assert.equal(d.signatures.THUNDERBOLT.chain,4);
  assert.equal(d.signatures.SHOCKWAVE.element,'push');
});

function headlessGame(){
  const d=loadData(), elements=new Map();
  class Element{
    constructor(){
      this.innerHTML='';this.textContent='';this.disabled=false;this.style={};this.dataset={};
      this.classList={add(){},remove(){}};
    }
    addEventListener(){}
    appendChild(){}
    getBoundingClientRect(){return {left:0,top:0,width:1000,height:600}}
    getContext(){return {setTransform(){}}}
  }
  const document={
    getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id)},
    createElement(){return new Element()}
  };
  const window={
    WordSiegeData:d,
    KidscadeStorage:{getJson(){return []},setJson(){return true},getInt(){return 0},setRaw(){return true}},
    addEventListener(){},devicePixelRatio:1
  };
  const hooks=`window.__headless={restart,startWave,update,beginPlacement,buildTower,makeTowerStats,towerCost,availableWords,validPlacement,rolePlacementValid,applyLinks,effectiveStats,showHint,swapOne, get state(){return state}};resize();`;
  const patched=runtime.replace('resize();requestAnimationFrame(loop);',hooks);
  assert.notEqual(patched,runtime,'headless hooks are missing');
  const ctx={window,document,performance:{now:()=>0},setTimeout(){return 0},clearTimeout(){},requestAnimationFrame(){}};
  vm.runInNewContext(patched,ctx,{filename:'game.js',timeout:3000});
  window.__headless.restart();
  return {h:window.__headless,d,window};
}
function spell(state,word){
  const used=new Set(),chosen=[];
  for(const letter of word){
    const index=state.rack.findIndex((ch,i)=>ch===letter&&!used.has(i));
    if(index<0)return false;
    chosen.push(index);used.add(index);
  }
  state.selected=chosen;return true;
}
function buildMatching(h,d,word){
  if(!spell(h.state,word))return false;
  if(h.state.ink<h.towerCost(d.words[word]))return false;
  h.beginPlacement();
  if(!h.state.placing)return false;
  const spots=[];
  for(let y=.075;y<.94;y+=.045)for(let x=.07;x<.95;x+=.045){
    const p={x:+x.toFixed(4),y:+y.toFixed(4)};
    if(h.validPlacement(p)&&h.rolePlacementValid(p,d.words[word],word))spots.push(p);
  }
  if(!spots.length){h.state.placing=null;h.state.selected=[];return false}
  // Keep production near its ore and attack towers around the bends in the path.
  spots.sort((a,b)=>Math.abs(a.x-.50)+Math.abs(a.y-.44)-Math.abs(b.x-.50)-Math.abs(b.y-.44));
  h.buildTower(spots[0]);return !h.state.placing;
}

test('Word Siege headless construction spends INK and prevents free idle mining',()=>{
  const {h,d}=headlessGame();
  assert.equal(h.state.ink,20);
  assert.ok(buildMatching(h,d,'MINER'));
  const afterMine=h.state.ink;
  assert.ok(afterMine<20,'construction should cost INK');
  assert.ok(buildMatching(h,d,'ARROW'));
  const afterBoth=h.state.ink;
  assert.ok(afterBoth>=0,'starter economy must allow MINER + ARROW');
  h.update(12);
  assert.equal(h.state.ink,afterBoth,'mining while paused would trivialize INK');
  h.startWave();
  for(let i=0;i<200;i++)h.update(.04);
  assert.ok(h.state.ink>afterBoth,'the miner should generate INK in combat');
  assert.ok(h.state.towers.length===2);
  assert.ok(h.makeTowerStats('THUNDERBOLT',d.words.THUNDERBOLT).chain===4);
  assert.ok(h.makeTowerStats('GLACIER',d.words.GLACIER).slow<h.makeTowerStats('ICE',d.words.ICE).slow);
});

test('Word Siege meaningful pairs activate only when towers are neighbors',()=>{
  const {h,d}=headlessGame(),s=h.state;
  const wordTower=(word,x,y)=>({
    id:s.uid++,word,def:d.words[word],stats:h.makeTowerStats(word,d.words[word]),
    x,y,cool:0,harvestClock:0,pulse:0,links:[],combos:[]
  });
  const a=wordTower('FIRE',.25,.15),b=wordTower('WIND',.37,.15);
  s.towers.push(a,b);
  h.applyLinks();
  assert.ok(s.discoveredCombos.has('화염폭풍'));
  assert.ok(h.effectiveStats(a).damage>a.stats.damage);
  b.x=.9;b.y=.9;h.applyLinks();
  assert.equal(a.combos.length,0);
});

test('Word Siege full-wave bot simulations terminate without runtime errors', {timeout:60000},()=>{
  const styles=[
    {name:'beginner',build:1,maxLen:5},
    {name:'mixed',build:2,maxLen:8},
    {name:'advanced',build:3,maxLen:12},
    {name:'hint-user',build:2,maxLen:7,hint:true}
  ];
  const results=[];
  for(const style of styles){
    const {h,d}=headlessGame();
    if(style.name!=='beginner')buildMatching(h,d,'MINER');
    else buildMatching(h,d,'ARROW');
    let rounds=0;
    for(let wave=1;wave<=8&&!h.state.ended;wave++){
      for(let j=0;j<style.build;j++){
        let available=h.availableWords().filter(w=>w.length<=style.maxLen&&h.state.ink>=h.towerCost(d.words[w]));
        available=available.filter(w=>d.words[w].role!=='repair'&&d.words[w].role!=='modifier');
        available.sort((a,b)=>{
          const score=w=>(d.words[w].role==='resource'?(h.state.towers.some(t=>t.def.role==='resource')?-10:6):10)
            +(d.words[w].difficulty*.4)+((d.signatures[w]||{}).damage||1);
          return score(b)-score(a);
        });
        if(style.hint&&h.state.ink>5)h.showHint();
        if(!available.length){if(h.state.ink>=2)h.swapOne();continue}
        if(!buildMatching(h,d,available[0]))continue;
      }
      h.startWave();
      let steps=0;
      while(h.state.inWave&&!h.state.ended&&steps++<2800)h.update(.04);
      assert.ok(steps<2800,'stuck wave '+wave+' for '+style.name);
      rounds=h.state.wave;
    }
    assert.ok(h.state.ended,'simulation should reach victory or defeat: '+style.name);
    results.push({name:style.name,waves:rounds,core:Math.ceil(h.state.core),towers:h.state.towers.length,unique:h.state.unique.size,combos:h.state.discoveredCombos.size});
  }
  console.log('WORD_SIEGE_SIMULATION '+JSON.stringify(results));
  assert.equal(results.length,4);
});
