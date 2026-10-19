'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../games/high_one_life'),c={console};c.window=c;vm.createContext(c);
for(const m of fs.readFileSync(dir+'/index.html','utf8').matchAll(/<script src="\.\/([^?" ]+)/g))if(m[1]!=='game.js')vm.runInContext(fs.readFileSync(dir+'/'+m[1],'utf8'),c,{filename:m[1]});
const L=c.OneLifeSim.Life,H=c.OneLifeHousehold342,J=c.OneLifeJoseon,F=c.OneLifeJoseon4;
const copy=x=>JSON.parse(JSON.stringify(x));
function life(age=35,seed=17){const l=new L(seed,{birthYear:1715,countryName:'대한민국',birthSetup:{gender:'여자'}});l.year=l.birthYear+age;l.age=age;l.pending=null;l.alive=true;c.OneLifeWorld8.ensure(l);J.ensure(l).capital=50;J.ensure(l).land=2;c.OneLifeJoseon5.ensure(l).origin='상민';F.ensure(l);H.ensure(l);return l;}
function next(l){l.year++;l.age++;l.pending=null;H.settle(l);}
function relative(l){const p=F.ensure(l).people.find(p=>p.alive&&p.birthYear<=l.year);p.atHome=true;p.relation=80;p.wellbeing=90;return p;}
test('named relatives share existing purse, cannot take two paid jobs, no instant craft profit',()=>{
 const l=life(),p=relative(l);H.book(l,p).craft=3;const cash=J.ensure(l).capital;
 assert.equal(H.assign(l,p.id,'craft','quilt',true),true);assert.equal(J.ensure(l).capital,cash-6);assert.equal(H.ensure(l).stock.length,0);assert.equal(H.assign(l,p.id,'wage'),false);
 next(l);assert.equal(H.ensure(l).stock.length,0);assert.equal(H.assign(l,p.id,'wage'),false);next(l);const item=H.ensure(l).stock[0];assert.equal(item.recipe,'quilt');
 assert.equal(H.action(l,'sell',item.id),true);assert.equal(H.action(l,'sell',item.id),false);assert.equal(H.ensure(l).stock.length,0);
});
test('children control themselves, personal spending never creates money or adult authority',()=>{
 const l=life(9),p=relative(l);assert.equal(H.canManage(l),false);assert.equal(H.assign(l,p.id,'wage'),false);assert.equal(H.assign(l,'self','wage'),false);
 assert.equal(H.action(l,'sweet'),false);assert.equal(H.action(l,'errand'),true);assert.equal(H.action(l,'errand'),false);assert.equal(H.ensure(l).pocket,1);next(l);assert.equal(H.action(l,'sweet'),true);assert.equal(H.ensure(l).pocket,0);
 next(l);const cash=J.ensure(l).capital,trust=H.ensure(l).trust;assert.equal(H.action(l,'steal'),true);assert.equal(J.ensure(l).capital,cash-1);assert.equal(H.ensure(l).trust,trust-15);
});
test('forced work hurts actual relationships, voluntary refusal spends no materials',()=>{
 const l=life(),p=relative(l);p.relation=10;assert.equal(H.assign(l,p.id,'craft'),true);assert.equal(H.ensure(l).plans[p.id].task,'rest');assert.equal(J.ensure(l).capital,50);next(l);p.relation=80;
 assert.equal(H.assign(l,p.id,'wage','straw',true),true);assert.equal(p.relation,70);
});
test('dead, absent and missing family cannot produce goods or receive assignments',()=>{
 const l=life(),p=relative(l);H.assign(l,p.id,'craft','straw',true);p.alive=false;next(l);assert.equal(H.ensure(l).stock.length,0);assert.equal(H.assign(l,p.id,'wage'),false);
 const q=relative(l);q.atHome=false;assert.equal(H.assign(l,q.id,'wage'),false);q.atHome=true;l.joseon13={missing:[{personId:q.id,status:'missing'}]};assert.equal(H.assign(l,q.id,'wage'),false);
});
test('care prevents a shortage of care; fatigue and failed work stop guaranteed profit',()=>{
 const l=life(),p=relative(l);p.wellbeing=20;H.assign(l,'self','care');H.assign(l,p.id,'wage','straw',true);const cash=J.ensure(l).capital;next(l);assert.equal(J.ensure(l).capital,cash);assert.ok(H.ensure(l).history.some(h=>/マ|마치지 못/.test(h.text)));
});
test('letters take time and respect an absent adult manager, imprisonment cannot send one',()=>{
 const l=life(),p=relative(l);l.travel22={residence:{abroad:true}};assert.equal(H.canManage(l),false);assert.equal(H.assign(l,p.id,'wage'),false);assert.equal(H.action(l,'letter','care'),true);assert.equal(H.ensure(l).letters[0].status,'travelling');assert.equal(H.action(l,'letter','wage'),false);
 next(l);assert.ok(['lost','delivered'].includes(H.ensure(l).letters[0].status));l.joseon325={law:{kind:'prison'}};next(l);assert.equal(H.action(l,'letter','care'),false);
});
test('cotton harvest is material, not an instantly sold garment; skill and capital matter',()=>{
 const l=life();assert.equal(H.assign(l,'self','craft','silk'),false);assert.equal(H.action(l,'crop','cotton'),true);assert.equal(H.action(l,'crop','cotton'),false);l.rand=()=>.8;next(l);const raw=H.ensure(l).stock[0];assert.equal(raw.raw,true);assert.equal(H.action(l,'sell',raw.id),false);
 H.book(l,H.members(l)[0]).craft=2;const cash=J.ensure(l).capital;assert.equal(H.assign(l,'self','craft','quilt'),true);assert.equal(J.ensure(l).capital,cash-4);assert.equal(H.ensure(l).stock.length,0);
});
test('foreign pending decisions, death, duplicate years cannot mutate household resources',()=>{
 const l=life(),s=H.ensure(l);l.pending='another';assert.equal(H.action(l,'kin'),false);l.pending=null;H.assign(l,'self','wage');next(l);const d=copy(s),cash=J.ensure(l).capital;H.settle(l);assert.deepEqual(copy(s),d);assert.equal(J.ensure(l).capital,cash);l.alive=false;assert.equal(H.action(l,'donate'),false);
});
test('snapshot restores unpaid progress, letters, raw materials and action limits exactly',()=>{
 let l=life();H.book(l,H.members(l)[0]).craft=3;H.assign(l,'self','craft','quilt');H.action(l,'kin');next(l);const state=copy(H.ensure(l));l=L.restore(copy(l.snapshot()));assert.deepEqual(copy(H.ensure(l)),state);assert.equal(H.assign(l,'self','wage'),false);next(l);assert.equal(H.ensure(l).stock.length,1);
});
test('old saves receive no invented products or income',()=>{
 const l=life(),d=copy(l.snapshot());delete d.household342;const r=L.restore(d);assert.equal(H.ensure(r).stock.length,0);assert.equal(H.ensure(r).history.length,0);assert.equal(H.ensure(r).processedYear,r.year);
});
test('late Joseon crisis is conditional, saves before a decision and cannot sell someone twice',()=>{
 let l=life();J.ensure(l).birthStatus='상민';J.ensure(l).capital=-3;c.OneLifeJoseon2.ensure(l).grain=1;
 assert.equal(H.inCrisis(l),true);assert.equal(H.action(l,'crisis','self'),true);const q=copy(l.getChoice());l=L.restore(copy(l.snapshot()));assert.equal(l.pending,'household342:crisis');assert.deepEqual(copy(l.getChoice()),q);assert.equal(l.choose(0),true);assert.equal(l.joseon5.origin,'사노비');assert.equal(H.canManage(l),false);assert.equal(l.choose(0),false);assert.equal(H.ensure(l).contracts.length,1);
});
test('child sale leaves a living absent relative, later redemption can fail or restore them',()=>{
 const l=life(),p=relative(l);p.role='child';p.birthYear=l.year-12;J.ensure(l).birthStatus='상민';J.ensure(l).capital=-3;c.OneLifeJoseon2.ensure(l).grain=1;
 H.action(l,'crisis',p.id);assert.equal(l.choose(0),true);assert.equal(p.alive,true);assert.equal(p.atHome,false);assert.equal(p.legal,'천인');assert.equal(H.assign(l,p.id,'wage'),false);
 J.ensure(l).capital=40;l.rand=()=>.9;assert.equal(H.action(l,'redeem',p.id),true);assert.equal(p.atHome,true);assert.equal(p.legal,'양인');assert.equal(H.ensure(l).contracts[0].status,'freed');
});
test('1894 ends legal bondage without instant return; 1900 preserves household history',()=>{
 let l=new L(17,{birthYear:1840,countryName:'대한민국'});c.OneLifeWorld8.ensure(l);l.year=1890;l.age=50;l.pending=null;J.ensure(l).capital=50;c.OneLifeJoseon5.ensure(l).origin='상민';H.action(l,'kin');l.year=1900;l.age=l.year-l.birthYear;H.settle(l);const saved=copy(l.snapshot());assert.equal(H.enabled(l),false);l=L.restore(saved);assert.ok(H.ensure(l).history.some(x=>/친척/.test(x.text)));assert.equal(H.action(l,'kin'),false);
});
test('a paid unfinished craft can be stopped to rest without refund or duplicate output',()=>{
 const l=life();H.book(l,H.members(l)[0]).craft=3;H.assign(l,'self','craft','quilt');const cash=J.ensure(l).capital;assert.equal(H.action(l,'pause','self'),true);assert.equal(J.ensure(l).capital,cash);assert.equal(H.ensure(l).plans.self.task,'rest');next(l);assert.equal(H.ensure(l).stock.length,0);
});
test('domestic official absence delegates work and letters, then returns without a foreign migration',()=>{
 const l=life(),p=relative(l);J.ensure(l).office=true;assert.equal(H.action(l,'manager',p.id),true);assert.equal(H.action(l,'dispatch'),true);assert.equal(H.away(l),true);assert.equal(H.manager(l),p.id);assert.equal(l.travel22?.residence?.abroad||false,false);assert.equal(H.action(l,'letter','care'),true);next(l);next(l);assert.equal(H.away(l),false);assert.equal(H.ensure(l).trip,null);
});
test('household dialogue uses the right particle for a named relative',()=>{
 for(const [name,joined] of [['분이','분이와'],['만복','만복과']]){
  const l=life(),p=relative(l);p.name=name;assert.equal(H.action(l,'manager',p.id),true);assert.match(H.ensure(l).history.at(-1).text,new RegExp(joined+' 집을 비울'));
 }
});
test('first study without money does not invent earlier lessons, and exhaustion does not invent lost work',()=>{
 const l=life();H.assign(l,'self','study');J.ensure(l).capital=0;next(l);assert.match(H.ensure(l).history.at(-1).text,/새로 배우지 못/);assert.doesNotMatch(H.ensure(l).history.at(-1).text,/전에 배운/);
 const w=life(),p=relative(w);H.assign(w,p.id,'wage','straw',true);H.ensure(w).fatigue[p.id]=80;next(w);const line=H.ensure(w).history.find(h=>/마치지 못/.test(h.text));assert.match(line.text,/몸이 지쳐/);assert.doesNotMatch(line.text,/일감도 끊겨|흉년/);
});
test('letter arrival does not invent a reply and crafting ends without tutorial narration',()=>{
 const l=life(),p=relative(l);l.travel22={residence:{abroad:true}};H.action(l,'letter','care');l.rand=()=>.9;next(l);const line=H.ensure(l).history.find(h=>/편지가 닿았다/.test(h.text));assert.ok(line);assert.doesNotMatch(line.text,/답이 왔다|답장/);
 const w=life();H.assign(w,'self','craft');next(w);assert.match(H.ensure(w).history.at(-1).text,/짚 바구니를 다 만들었다/);assert.doesNotMatch(H.ensure(w).history.at(-1).text,/정할 수 있다/);
});
