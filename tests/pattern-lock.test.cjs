const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','low_pattern_lock');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const js=fs.readFileSync(path.join(dir,'game.js'),'utf8');

function loadInternals(){
  const exposed=js.replace(/\}\)\(\);\s*$/,"window.__PLTEST={LEVELS,generateBank,cluePool,filterByClue,chooseBestClue,chooseBalancedClue,samePath,analyze};})();");
  const element=()=>({classList:{add(){},remove(){},toggle(){},contains(){return true}},style:{},dataset:{},addEventListener(){},appendChild(){},querySelectorAll(){return[]},setAttribute(){},innerHTML:'',textContent:'',disabled:false,className:''});
  const sandbox={
    window:{},document:{getElementById(){return element()},createElement(){return element()}},
    localStorage:{getItem(){return null},setItem(){}},navigator:{vibrate(){}},
    setInterval(){return 0},setTimeout(){return 0},clearTimeout(){},addEventListener(){},
    Math,JSON,Set,Map,Array,Object,Number,String,Boolean,Infinity
  };
  vm.runInNewContext(exposed,sandbox,{timeout:1500});
  return sandbox.window.__PLTEST;
}

test('Pattern Lock v5 is clue deduction, not preview memory',()=>{
  assert.match(html,/<title>패턴 락<\/title>/);
  assert.match(html,/후보 12개/);
  assert.match(html,/이 패턴으로 도전/);
  assert.match(html,/손을 떼어도 바로 제출되지 않아요/);
  assert.doesNotMatch(html,/다시 보기/);
  assert.doesNotMatch(js,/showPreview/);
  assert.match(js,/pattern_lock_v5/);
  assert.match(js,/generateBank/);
  assert.match(js,/filterByFeedback/);
  assert.match(js,/chooseBalancedClue/);
});

test('all 18 target patterns are valid and repeat stages really repeat command blocks',()=>{
  const T=loadInternals();
  assert.equal(T.LEVELS.length,18);
  for(const level of T.LEVELS){
    const cols=level.grid[0],path=level.solution;
    assert.equal(new Set(path).size,path.length,'repeated node in level '+level.id);
    assert.ok(path.every(i=>Number.isInteger(i)&&i>=0&&i<cols*cols),'out of range level '+level.id);
    let hasDiagonal=false;
    const dirs=[];
    for(let i=1;i<path.length;i++){
      const a=path[i-1],b=path[i],ar=Math.floor(a/cols),ac=a%cols,br=Math.floor(b/cols),bc=b%cols;
      const dr=br-ar,dc=bc-ac;
      assert.ok(Math.abs(dr)<=1&&Math.abs(dc)<=1&&(dr||dc),'non-adjacent move level '+level.id);
      if(dr&&dc)hasDiagonal=true;
      dirs.push(Math.sign(dr)+','+Math.sign(dc));
    }
    assert.ok(hasDiagonal,'level '+level.id+' should contain a diagonal');
    if(level.structure.repeat){
      const unit=level.structure.unit,times=level.structure.repeat;
      assert.ok(unit>=1);
      assert.ok(unit*times<=dirs.length);
      for(let i=unit;i<unit*times;i++)assert.equal(dirs[i],dirs[i%unit],'repeat block mismatch level '+level.id);
    }
  }
});

test('candidate engine starts ambiguous and progressive clues can isolate one target',()=>{
  const T=loadInternals();
  for(const level of T.LEVELS){
    const bank=T.generateBank(level);
    assert.ok(bank.length>=100,'candidate bank too small level '+level.id);
    const target=bank.find(c=>T.samePath(c.path,level.solution));
    assert.ok(target,'target missing from bank level '+level.id);
    let list=[...bank],pool=T.cluePool(level),revealed=[];
    const applyKind=kind=>{
      const d=pool.find(x=>x.kind===kind);if(!d)return;
      revealed.push(d);pool=pool.filter(x=>x.id!==d.id);list=T.filterByClue(list,d,target,level);
    };
    applyKind('points');
    if(level.chapter.includes('기초'))applyKind('sequenceCount');
    if(level.chapter.includes('선택')){applyKind('choiceCount');applyKind('sequenceCount')}
    if(level.chapter.includes('반복')||level.chapter.includes('종합'))applyKind('repeatCount');
    if(level.chapter.includes('반복'))applyKind('repeatUnit');
    while(list.length>20&&revealed.length<5){
      const d=T.chooseBalancedClue(list,pool,target,level,12,4);if(!d)break;
      revealed.push(d);pool=pool.filter(x=>x.id!==d.id);list=T.filterByClue(list,d,target,level);
    }
    assert.ok(list.length>1,'initial clues must not reveal the answer level '+level.id);
    assert.ok(list.length<=20,'initial clue set should be manageable level '+level.id);
    let safety=0;
    while(list.length>1&&safety++<30){
      const current=list.length,desired=current>4?Math.max(2,Math.ceil(current/2)):1;
      let best=null,bestScore=Infinity;
      for(const clue of pool){
        const count=T.filterByClue(list,clue,target,level).length;
        if(count<=0||count>=current)continue;
        if(current>4&&count<2)continue;
        const score=Math.abs(count-desired);
        if(score<bestScore){best=clue;bestScore=score}
      }
      if(!best)best=T.chooseBestClue(list,pool,target,level,true);
      assert.ok(best,'no clue can reduce candidates level '+level.id);
      pool=pool.filter(x=>x.id!==best.id);
      list=T.filterByClue(list,best,target,level);
    }
    assert.equal(list.length,1,'all clues must isolate one candidate level '+level.id);
  }
});

test('catalog points to Pattern Lock v5',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='low_pattern_lock');
  assert.ok(game);
  assert.equal(game.title,'패턴 락');
  assert.equal(game.href,'games/low_pattern_lock/index.html?v=5');
  assert.equal(game.subject,'thinking');
  assert.equal(game.genre,'puzzle');
  assert.equal(game.difficulty,'medium');
  assert.deepEqual(game.ages,['low','high']);
  assert.equal(game.classroom,true);
});
