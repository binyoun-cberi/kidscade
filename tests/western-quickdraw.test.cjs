const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const JS=fs.readFileSync(path.join(ROOT,'games/western_quickdraw/game.js'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'data/games.json'),'utf8'));
const modes=['solo','duo','practice'];

function harness(){
 let now=0,nextId=1,queue=[],elementNumber=0;
 const elements=new Map(),listeners={},results=[],storage=new Map();
 function element(id){
  if(elements.has(id))return elements.get(id);
  const classes=new Set();
  const el={
   id,dataset:{},value:id==='difficulty'?'normal':id==='target'?'5':'0',
   textContent:'',innerHTML:'',style:{},children:[],handlers:{},
   classList:{
    toggle(name,on){if(on===undefined?!classes.has(name):on)classes.add(name);else classes.delete(name)},
    add(name){classes.add(name)},remove(name){classes.delete(name)},contains(name){return classes.has(name)}
   },
   addEventListener(name,fn){this.handlers[name]=fn},
   setAttribute(){},appendChild(child){this.children.push(child)},
   getBoundingClientRect(){return {top:0,width:450,height:800}},
   getContext(){return new Proxy({},{get:()=>()=>{}})},
   closest(){return null},matches(){return false},focus(){}
  };
  elements.set(id,el);return el;
 }
 const document={
  body:element('body'),hidden:false,
  getElementById:element,
  createElement(){return element('mark'+(++elementNumber))},
  querySelectorAll(selector){
   if(selector!=='[data-mode]')return [];
   return modes.map(mode=>{const el=element('mode-'+mode);el.dataset.mode=mode;return el})
  },
  addEventListener(name,fn){listeners['document:'+name]=fn}
 };
 const window={
  devicePixelRatio:1,
  addEventListener(name,fn){listeners['window:'+name]=fn},
  KidscadeGame:{start(d){results.push(['start',d])},result(d){results.push(['result',d])}}
 };
 const rng=Object.create(Math);rng.random=()=>.5;
 const sandbox={
  document,window,Math:rng,performance:{now:()=>now},
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,v)=>storage.set(key,v)},
  Audio:class{pause(){}play(){return Promise.resolve()}set currentTime(n){}set volume(n){}},
  requestAnimationFrame:()=>1,
  setTimeout(fn,delay){const id=nextId++;queue.push({id,at:now+delay,fn});return id},
  clearTimeout(id){queue=queue.filter(job=>job.id!==id)},
  console
 };
 vm.runInNewContext(JS,sandbox,{filename:'western_quickdraw/game.js'});
 function advance(ms){
  const end=now+ms;
  for(let iterations=0;queue.some(job=>job.at<=end);iterations++){
   assert.ok(iterations<300,'Unexpected timer loop');
   queue.sort((a,b)=>a.at-b.at);const job=queue.shift();now=job.at;job.fn();
  }
  now=end;
 }
 function click(id){const el=element(id);assert.equal(typeof el.handlers.click,'function',id+' click');el.handlers.click({target:el})}
 function fire(y=720){
  const el=element('scene');assert.equal(typeof el.handlers.pointerdown,'function');
  el.handlers.pointerdown({clientY:y,target:el,preventDefault(){}});
 }
 const state=()=>window.KidscadeWesternQuickdraw.getState();
 return {state,advance,click,fire,element,document,listeners,results,storage};
}
test('game entry is registered once and reused audio/cover assets resolve',()=>{
 const entries=catalog.games.filter(game=>game.id==='western_quickdraw');
 assert.equal(entries.length,1);const game=entries[0];
 assert.equal(game.href,'games/western_quickdraw/index.html');
 assert.deepEqual(game.players,['solo','local2']);
 for(const file of [game.href,'games/western_quickdraw/style.css','games/western_quickdraw/game.js',game.cover,
   'assets/audio/sfx/combat/projectile-whoosh-01.mp3',
   'assets/audio/sfx/combat/impact-heavy-01.mp3',
   'assets/audio/sfx/success/cheer-yay-01.mp3',
   'assets/audio/sfx/failure/fail-sting-01.mp3']){
  assert.ok(fs.existsSync(path.join(ROOT,file)),'Missing resource '+file);
 }
 assert.match(fs.readFileSync(path.join(ROOT,game.href),'utf8'),/data-game-id="western_quickdraw"/);
 assert.doesNotThrow(()=>new vm.Script(JS));
});
test('firing before the signal loses; a valid quick draw beats the first outlaw',()=>{
 const g=harness();g.click('startButton');
 assert.equal(g.state().state,'ready');
 g.fire();assert.equal(g.state().scores[1],1);
 g.advance(1450);g.advance(3250);
 assert.equal(g.state().state,'bang');
 g.advance(100);g.fire();
 assert.equal(g.state().scores[0],1);assert.equal(g.state().scores[1],1);
});
test('five wins unlock next outlaw and report a complete match',()=>{
 const g=harness();g.click('startButton');
 for(let i=0;i<5;i++){
  g.advance(3250);assert.equal(g.state().state,'bang');
  g.advance(95);g.fire();assert.equal(g.state().scores[0],i+1);
  g.advance(1450);
 }
 assert.equal(g.state().state,'finished');
 assert.equal(JSON.parse(g.storage.get('kidscade-western-quickdraw-v1')).unlocked,2);
 const result=g.results.filter(x=>x[0]==='result');
 assert.equal(result.length,1);assert.equal(result[0][1].outcome,'win');
});
test('2 players share a screen, first input wins and false start forfeits',()=>{
 const g=harness();g.click('mode-duo');g.click('startButton');
 g.advance(3250);g.fire(50);g.advance(9);g.fire(720);
 assert.deepEqual(Array.from(g.state().scores),[0,1]);
 g.advance(1450);g.fire(720);
 assert.deepEqual(Array.from(g.state().scores),[0,2]);
});
test('visibility pause cancels stale signal timers and resumes with a fresh countdown',()=>{
 const g=harness();g.click('startButton');g.advance(300);
 g.document.hidden=true;g.listeners['document:visibilitychange']();
 assert.equal(g.state().state,'pause');
 g.advance(15000);assert.equal(g.state().state,'pause');
 g.document.hidden=false;g.click('resumeButton');assert.equal(g.state().state,'ready');
 g.advance(3250);assert.equal(g.state().state,'bang');
});
test('practice submits a valid clear outcome without overwriting match win score',()=>{
 const g=harness();g.click('mode-practice');g.click('startButton');
 for(let i=0;i<5;i++){g.advance(3250);g.advance(125);g.fire();g.advance(1450)}
 assert.equal(g.state().state,'finished');
 const result=g.results.filter(x=>x[0]==='result')[0][1];
 assert.equal(result.outcome,'clear');assert.equal(Object.hasOwn(result,'score'),false);
});
