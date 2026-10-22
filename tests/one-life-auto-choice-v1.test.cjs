'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const auto=require(path.join(root,'auto-choice-v1.js'));
const file=n=>fs.readFileSync(path.join(root,n),'utf8');
test('automatic choice is consistent and never consumes the simulated random stream',()=>{
 const life={seed:1717,year:1600,age:24,pending:'joseon-choice',rng:124567,alive:true,
  log:[{age:24,text:'an event'}],getReflection(){return null},
  getChoice(){return {title:'새로운 길',options:[{label:'가'},{label:'나'},{label:'다'}]};}};
 const start=JSON.stringify({rng:life.rng,log:life.log,pending:life.pending});
 const first=auto.decide(life),second=auto.decide(life);
 assert.deepEqual(first,second);
 assert.ok(first.index>=0&&first.index<3);
 assert.equal(JSON.stringify({rng:life.rng,log:life.log,pending:life.pending}),start);
});
test('linked options are processed exactly one step per call; reflections need no typed answer',()=>{
 let calls=0;
 const life={seed:15,year:1450,age:25,pending:'chain:1',alive:true,
  log:[],getReflection(){return null},getChoice(){return {options:[{},{}],title:'첫 갈림길'};},
  choose(i){assert.ok(i===0||i===1);calls++;this.pending=calls===1?'chain:2':null;return true;}};
 assert.equal(auto.tick(life),true);assert.equal(calls,1);
 assert.equal(life.pending,'chain:2');
 assert.equal(auto.tick(life),true);assert.equal(calls,2);
 assert.equal(auto.tick(life),false);
 const reflection={pending:'reflection:30',alive:true,getReflection(){return 30;},
  reflect(text){assert.equal(text,'');this.pending=null;return true;}};
 assert.equal(auto.tick(reflection),true);
 assert.equal(reflection.pending,null);
});
test('automatic decisions stop safely when dead, missing, or unsupported',()=>{
 assert.equal(auto.decide(null),null);
 assert.equal(auto.decide({alive:false,pending:1}),null);
 assert.equal(auto.tick({alive:true,pending:'other',getReflection(){return null},getChoice(){return null}}),false);
});
test('automatic choice is optional, restored only from explicit opt-in, available on both play screens',()=>{
 const game=file('game.js'),html=file('index.html'),goryeo=file('goryeo-view-v343.js');
 assert.match(game,/let autoChoiceMode=false/);
 assert.match(game,/autoChoiceMode=safeGet\(SAVE_KEY\)\?\.autoChoiceMode===true/);
 assert.match(game,/if\(autoChoiceMode&&now-lastAutoChoiceAt>=650&&!namingChild\)/);
 assert.match(game,/if\(stage!=='play'\|\|!life\|\|!life\.alive\|\|paused\|\|document\.hidden\)return/);
 assert.match(game,/OneLifeAutoChoiceV1\.tick\(life\)/);
 assert.match(html,/id="autoChoiceBtn"[^>]*aria-pressed="false"/);
 assert.match(html,/auto-choice-v1\.js\?v=1/);
 assert.match(goryeo,/handlers\.toggleAuto/);
});