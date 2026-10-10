'use strict';
// Reproducible KIDSMON 1v1 tournament, using the production turn-battle engine.
// Run: node scripts/kidsmon-balance-sim.cjs [--repeats=12] [--json]
// Never alters saved games or production balancing.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../games'),ctx={window:{},Math,Date};
for(const p of ['monsters.js','roster.js','combat.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-dex',p),'utf8'),ctx,{filename:p});
for(const p of ['engine.js','turn-battle.js','family-signatures.js','move-dex.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-expedition',p),'utf8'),ctx,{filename:p});
const D=ctx.window.OPENMON_DEX,E=ctx.window.OPENMON_EXPEDITION_ENGINE;
const B=ctx.window.OPENMON_TURN_BATTLE,M=B.moves;
const species=D.species.filter(s=>s.playable),ranks={};
for(const s of species)(ranks[s.evolutionRank]??=[]).push(s);
const strategies=['attack','defense','strategic','beginner'],levels=[5,14,26,40];
const flag=process.argv.find(x=>x.startsWith('--repeats='));
const repeats=flag?Number(flag.split('=')[1]):12;
if(!Number.isInteger(repeats)||repeats<1||repeats>100)throw Error('repeats must be an integer from 1 to 100');
const randomFor=seed=>{let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}};
const maxHP=mon=>D.combat.statsAtLevel(mon.id,mon.level).hp;
function estimate(mon,foe,move,side,opp){
 if(!move.power)return 0;
 const raw=D.combat.damage({attacker:mon.id,defender:foe.id,
  attackerLevel:mon.level,defenderLevel:foe.level,power:move.power,moveType:move.type});
 let amount=Math.max(1,Math.floor(raw*.62*(2+side.attack)/(2+opp.defense)));
 if(opp.shield)amount=Math.max(1,Math.round(amount*(1-opp.shield)));
 return Math.min(foe.hp,amount*(move.hits||1))*move.accuracy/100;
}
function select(role,mon,foe,side,opp,rng){
 const choices=mon.moveSlots.filter(x=>x.pp>0).map(x=>M[x.id]);
 if(!choices.length)return null;
 if(role==='beginner')return choices[Math.floor(rng()*choices.length)].id;
 const attacks=choices.filter(m=>m.power>0);
 const best=attacks.slice().sort((a,b)=>estimate(mon,foe,b,side,opp)-estimate(mon,foe,a,side,opp))[0];
 if(!best)return choices[0].id;
 if(role==='attack')return best.id;
 const hp=mon.hp/maxHP(mon),missing=1-hp,bestHit=estimate(mon,foe,best,side,opp);
 const healing=choices.find(m=>m.kind==='heal');
 const shields=choices.filter(m=>m.kind==='shield').sort((a,b)=>b.shield-a.shield);
 const buffs=choices.filter(m=>m.kind==='buff');
 const foeDamage=Math.max(0,...foe.moveSlots.filter(x=>x.pp>0).map(x=>estimate(foe,mon,M[x.id],opp,side)));
 const canFinish=bestHit>=foe.hp;
 if(role==='defense'){
  if(healing&&hp<.75&&missing>.22&&!canFinish)return healing.id;
  if(shields.length&&!side.shield&&foeDamage>=mon.hp*.22&&hp<.85&&!canFinish)return shields[0].id;
  const up=buffs.find(m=>m.buff.stat==='defense'&&side.defense<2);
  if(up&&hp>.5&&foe.hp>bestHit*2)return up.id;
  return best.id;
 }
 if(healing&&hp<.56&&missing>=.27&&!canFinish&&foeDamage<mon.hp*.94)return healing.id;
 if(shields.length&&!side.shield&&foeDamage>=mon.hp*.44&&foeDamage<mon.hp*1.8&&bestHit<foe.hp*.8)return shields[0].id;
 const boost=buffs.find(m=>m.buff.stat==='attack'&&side.attack<1);
 if(boost&&hp>.72&&foe.hp>bestHit*3&&foeDamage<mon.hp*.35)return boost.id;
 const statuses=attacks.filter(m=>m.afflict&&!opp.condition&&m.afflict.kind!=='slow')
  .sort((a,b)=>estimate(mon,foe,b,side,opp)-estimate(mon,foe,a,side,opp));
 if(statuses[0]&&estimate(mon,foe,statuses[0],side,opp)>bestHit*.62&&foe.hp>bestHit*1.6)return statuses[0].id;
 const drain=attacks.find(m=>m.drain);
 if(drain&&missing>.15&&estimate(mon,foe,drain,side,opp)>bestHit*.82)return drain.id;
 return best.id;
}
const perAI=Object.fromEntries(strategies.map(k=>[k,{games:0,wins:0,losses:0,draws:0,turns:0,hpFraction:0,actions:{heal:0,shield:0,buff:0,damage:0}}]));
const byLevel=Object.fromEntries(levels.map(l=>[l,Object.fromEntries(strategies.map(k=>[k,{games:0,wins:0,draws:0}]))]));
const pairs={},perSpecies=new Map(),usedMoves=new Map();
let games=0,timeouts=0,invalid=0,softActions=0;
for(let i=0;i<species.length;i++){
 const s=species[i],group=ranks[s.evolutionRank],self=group.findIndex(x=>x.id===s.id);
 for(const level of levels)for(const ai of strategies)for(let repeat=0;repeat<repeats;repeat++){
  const enemyAI=strategies[repeat%strategies.length];
  const offset=(i*17+repeat*7+level*3+41)%group.length;
  const rival=group[offset===self?(offset+1)%group.length:offset];
  const rng=randomFor(0xabc0134+i*100017+level*1319+repeat*23+strategies.indexOf(ai)*7307);
  const me=E.makeCreature(s.id,level),foe=E.makeCreature(rival.id,level);
  const save={party:[me],active:0,items:{ball:0,potion:0}};
  const battle={turnState:B.state()};
  let result='draw',turn=0;
  for(;turn<20;turn++){
   const own=select(ai,me,foe,battle.turnState.player,battle.turnState.foe,rng);
   const opposing=select(enemyAI,foe,me,battle.turnState.foe,battle.turnState.player,rng);
   if(own){
    const move=M[own],category=['heal','shield','buff'].includes(move.kind)?move.kind:'damage';
    perAI[ai].actions[category]++;
    usedMoves.set(own,(usedMoves.get(own)||0)+1);
   }else softActions++;
   // The production engine normally chooses a weighted wild move.
   // Force the tested opponent policy for this turn by temporarily
   // marking its other move slots empty, then restore their original PP.
   const previous=foe.moveSlots.map(x=>x.pp);
   if(opposing)foe.moveSlots.forEach(x=>{if(x.id!==opposing)x.pp=0});
   const res=B.resolve({save,foe,battle,action:own?{type:'move',id:own}:{type:'soft'},random:rng});
   if(!res.ok){invalid++;result='invalid';break}
   foe.moveSlots.forEach((x,k)=>{if(x.id!==opposing)x.pp=previous[k]});
   if(res.outcome!=='continue'){result=res.outcome==='won'?'win':res.outcome==='lost'?'lose':res.outcome;break}
  }
  if(turn===20)timeouts++;
  const entry=perAI[ai],row=byLevel[level][ai];
  entry.games++;entry.turns+=Math.min(turn+1,20);entry.hpFraction+=me.hp/maxHP(me);
  entry[result==='win'?'wins':result==='lose'?'losses':'draws']++;
  row.games++;row.wins+=Number(result==='win');row.draws+=Number(result==='draw');
  const key=ai+' vs '+enemyAI;
  pairs[key]??={games:0,wins:0,draws:0};
  pairs[key].games++;pairs[key].wins+=Number(result==='win');pairs[key].draws+=Number(result==='draw');
  const speciesRecord=perSpecies.get(s.id)||{id:s.id,name:s.name,rank:s.evolutionRank,games:0,wins:0};
  speciesRecord.games++;speciesRecord.wins+=Number(result==='win');
  perSpecies.set(s.id,speciesRecord);
  games++;
 }
}
const equipped=new Set(),learnable=new Set();
for(const s of species)for(const level of levels){
 const creature=E.makeCreature(s.id,level);
 creature.moveSlots.forEach(m=>equipped.add(m.id));
 B.learnable(creature).forEach(id=>learnable.add(id));
}
const percent=v=>Math.round(v*1000)/10;
const rank=[...perSpecies.values()].sort((a,b)=>b.wins/b.games-a.wins/a.games);
const report={
 engine:'games/openmon-expedition/turn-battle.js',
 seed:'0xabc0134',rivalSelection:'same evolutionRank, deterministic samples',repeats,
 species:species.length,moveCount:Object.keys(M).length,
 games,timeouts,invalid,softActions,
 equippedMoves:equipped.size,learnableMoves:learnable.size,
 notEquipped:Object.keys(M).filter(x=>!equipped.has(x)),
 results:Object.fromEntries(Object.entries(perAI).map(([k,v])=>[k,{
  games:v.games,wins:v.wins,winRate:percent(v.wins/v.games),
  drawRate:percent(v.draws/v.games),meanTurns:+(v.turns/v.games).toFixed(2),
  remainingHPRate:percent(v.hpFraction/v.games),actions:v.actions
 }])),
 byLevel:Object.fromEntries(Object.entries(byLevel).map(([level,v])=>[level,
  Object.fromEntries(Object.entries(v).map(([k,x])=>[k,percent(x.wins/x.games)]))])),
 matchups:Object.fromEntries(Object.entries(pairs).map(([k,v])=>[k,percent(v.wins/v.games)])),
 best:rank.slice(0,10).map(x=>({...x,winRate:percent(x.wins/x.games)})),
 worst:rank.slice(-10).reverse().map(x=>({...x,winRate:percent(x.wins/x.games)})),
 moveUsage:[...usedMoves].sort((a,b)=>b[1]-a[1])
};
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
else{
 console.log('KIDSMON 1v1 balance: '+games+' battles, '+species.length+' species, '+Object.keys(M).length+' moves');
 console.log('invalid='+invalid+' timeouts='+timeouts+' learnable='+learnable.size+' equipped='+equipped.size);
 for(const [k,v] of Object.entries(report.results))
  console.log(k+': '+v.winRate+'% | turns '+v.meanTurns+' | HP '+v.remainingHPRate+'%');
 console.log('Use --json for level matrix, species rankings, move usage and matchups.');
}
if(invalid)process.exitCode=1;
