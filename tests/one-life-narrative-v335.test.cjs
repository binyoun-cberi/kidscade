'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),root=path.resolve(__dirname,'../games/high_one_life');
function runtime(){const c={console};c.window=c;vm.createContext(c);for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="\.\/([^?" ]+)/g))if(m[1]!=='game.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),c);return c;}
function born(c,year=1592){const l=new c.OneLifeSim.Life(17,{birthYear:year-22,countryName:'대한민국',birthSetup:{gender:'남자'}});l.year=year;l.age=22;c.OneLifeJoseon.ensure(l).region='경상도';return l;}
function choose(c,l,key,id,index){const mod=c[key],s=mod.ensure(l);s.queue=[];s.active={id:l.year+'-'+id,eventId:id,year:l.year};l.pending=(key==='OneLifeJoseon13'?'joseon13:':'joseon19:')+s.active.id;a.ok(mod.choose(l,index));return s;}
test('all wartime choices have distinct authored immediate actions',()=>{
 const c=runtime(),W=c.OneLifeJoseon13;let count=0;for(const e of W.EVENTS)for(const o of e.options){a.ok(W.RESULTS[o.label],o.label);a.doesNotMatch(W.RESULTS[o.label],/훗날|오래 인연|나중에.*찾아/);count++;}a.equal(count,78);
});
test('empty wartime donations become labor and preserving food does not create supplies',()=>{
 const c=runtime(),l=born(c),v=c.OneLifeJoseon2.ensure(l);v.grain=0;const s=c.OneLifeJoseon13.ensure(l);s.active={id:'1592-imjinNorth',eventId:'imjinNorth',year:1592};l.pending='joseon13:'+s.active.id;
 a.match(c.OneLifeJoseon13.prompt(l).options[1].label,/대신/);choose(c,l,'OneLifeJoseon13','imjinNorth',1);a.equal(v.grain,0);a.match(l.log.find(e=>e.kind==='joseon13-choice').text,/나눌 곡식이 없어/);a.equal(s.followups.length,0);
 v.grain=5;choose(c,l,'OneLifeJoseon13','militia1593',1);a.equal(v.grain,5);
});
test('repair decreases actual home and field damage without claiming an immediate harvest',()=>{
 const c=runtime(),l=born(c,1601),s=c.OneLifeJoseon13.ensure(l);s.damage=8;s.fields=7;c.OneLifeJoseon.ensure(l).capital=50;
 choose(c,l,'OneLifeJoseon13','imjinFields',1);a.equal(s.fields,1);a.equal(s.damage,8);a.match(l.log.find(e=>e.kind==='joseon13-choice').text,/아직 수확/);
 choose(c,l,'OneLifeJoseon13','imjinRepair',0);a.ok(s.damage<8);a.equal(s.fields,1);
});
test('asking the magistrate for relief does not award grain and is not echoed years later',()=>{
 const c=runtime(),l=born(c,1810),v=c.OneLifeJoseon2.ensure(l),s=c.OneLifeJoseon19.ensure(l);s.office.integrity=90;v.grain=5;
 choose(c,l,'OneLifeJoseon19','goodMagistrate',2);a.equal(v.grain,5);a.equal(s.followups.length,0);
 const e=l.log.find(e=>e.kind==='joseon19-choice');a.match(e.text,/기다려야/);a.doesNotMatch(e.text,/ — /);a.ok(e.choiceLabel);a.ok(e.sourceUrl);
});
test('a fatal wartime choice records the death instead of a safe return',()=>{
 const c=runtime();let found=false;
 for(let seed=1;seed<=150&&!found;seed++){
  const l=born(c);l.seed=seed;choose(c,l,'OneLifeJoseon13','militia1593',2);
  if(!l.alive){found=true;const record=l.log.find(e=>e.kind==='joseon13-choice');a.match(record.text,/목숨을 잃었다/);a.doesNotMatch(record.text,/고향을 찾았다|돌아왔다/);}
 }
 a.ok(found);
});
