'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../games/high_one_life'),c={console};c.window=c;vm.createContext(c);for(const m of fs.readFileSync(dir+'/index.html','utf8').matchAll(/<script src="\.\/([^?" ]+)/g))if(m[1]!=='game.js')vm.runInContext(fs.readFileSync(dir+'/'+m[1],'utf8'),c,{filename:m[1]});
const L=c.OneLifeSim.Life,D=c.OneLifeDiaspora340,T=c.OneLifeTravel22,copy=x=>JSON.parse(JSON.stringify(x));
function life(year=1966,gender='남자',seed=17){const l=new L(seed,{birthYear:year-25,countryName:'대한민국',birthSetup:{gender}});c.OneLifeWorld9.ensure(l);l.year=year;l.age=25;l.alive=true;l.pending=null;l.stats.health=85;l.money.netWorth=5000;return l;}
function force(l,type,key){l.pending=null;assert.equal(D.open(l,type,key),true);assert.ok(l.getChoice());}
function departed(key,year,gender='남자',seed=17){const l=life(year,gender,seed);if(key==='germanyNurse')c.OneLifeWorld7.ensure(l).qualification.push('nursing');if(key==='gulf'){c.OneLifeWorld6.career(l,'trades',0,'일하며');l.world6.history[0].age=20;}assert.equal(D.depart(l,key),true);return l;}
function j(l){return D.ensure(l).journeys.at(-1);}
test('route dates, adult selection and professional nursing qualifications are enforced',()=>{
 assert.equal(D.eligible(life(1962),'germanyMine'),false);assert.equal(D.eligible(life(1963),'germanyMine'),true);assert.equal(D.eligible(life(1978),'germanyMine'),false);assert.equal(D.eligible(life(1966,'여자'),'germanyMine'),false);
 const nurse=life(1966,'여자');assert.equal(D.eligible(nurse,'germanyNurse'),false);c.OneLifeWorld7.ensure(nurse).qualification.push('nursing');assert.equal(D.eligible(nurse,'germanyNurse'),true);assert.equal(D.eligible(life(1906),'mexico'),false);assert.equal(D.eligible(life(1905),'mexico'),true);
 assert.equal(D.eligible(life(1975),'gulf'),false);const gulf=departed('gulf',1975);assert.equal(T.summary(gulf).residence.region,'중동');
});
test('application and departure are separate and selection can fail without moving',()=>{
 let accepted=0,rejected=0;for(let seed=1;seed<=40;seed++){const l=life(1966,'남자',seed);force(l,'invite','germanyMine');l.choose(0);assert.equal(T.ensure(l).residence.abroad,false);assert.equal(D.ensure(l).active.type,'review');l.choose(0);if(T.ensure(l).residence.abroad)accepted++;else rejected++;}assert.ok(accepted&&rejected);
});
test('each custom residence and pending choice restore exactly; domestic finance stays idle abroad',()=>{
 for(const [key,y,g] of [['mexico',1905,'여자'],['germanyMine',1966,'남자'],['germanyNurse',1966,'여자'],['gulf',1975,'여자'],['china',1921,'여자']]){
  let l=departed(key,y,g);force(l,key==='china'?'chinaLife':'work',key);const data=copy(l.snapshot()),q=copy(l.getChoice()),own=copy(D.ensure(l)),r=copy(T.ensure(l).residence);l=L.restore(data);assert.deepEqual(copy(l.getChoice()),q,key);assert.deepEqual(copy(D.ensure(l)),own,key);assert.deepEqual(copy(T.ensure(l).residence),r,key);
  l.choose(0);const cash=l.money.netWorth,seen=l.log.length;l.tick();assert.equal(l.money.netWorth,cash,key);assert.equal(l.log.slice(seen).some(e=>e.kind==='money'||e.kind==='joseon-economy'),false,key);assert.ok(l.getChoice());
 }
});
test('local earnings, remittance to an actual relative and return settle only once',()=>{
 const l=departed('germanyMine',1966);force(l,'work','germanyMine');l.choose(0);assert.equal(j(l).savings,5);
 const person=l.world9.people.find(p=>p.role==='어머니');person.alive=true;person.birthYear=l.year-50;force(l,'work','germanyMine');l.choose(2);assert.equal(j(l).savings,3);assert.equal(j(l).remitted,2);assert.equal(j(l).transfers[0].personId,person.id);
 j(l).savings=10;const cash=l.money.netWorth;force(l,'contract','germanyMine');l.choose(0);assert.equal(T.ensure(l).residence.abroad,false);assert.equal(j(l).status,'returned');assert.equal(l.money.netWorth,cash+600);assert.equal(l.choose(0),false);assert.equal(l.money.netWorth,cash+600);
});
test('dead or missing relatives never receive a fabricated remittance',()=>{
 const l=departed('germanyMine',1966);l.world9.people.forEach(p=>p.alive=false);j(l).savings=3;force(l,'work','germanyMine');l.choose(2);assert.equal(j(l).savings,3);assert.equal(j(l).remitted,0);assert.match(l.log.at(-1).text,/받을 사람/);
});
test('insufficient return money and failed renewal leave room to earn rather than an annual contract trap',()=>{
 const l=departed('germanyMine',1966);l.year=1969;l.age=28;force(l,'contract','germanyMine');l.choose(0);assert.equal(j(l).due,1971);l.year=1970;l.age++;D.abroadYear(l,T.ensure(l));assert.equal(D.ensure(l).active.type,'work');
});
test('Mexico reaches community participation after the actual 1909 contract end, not instant return',()=>{
 const l=departed('mexico',1905,'여자');l.year=1909;l.age=29;D.abroadYear(l,T.ensure(l));assert.equal(D.ensure(l).active.type,'orgInvite');assert.equal(D.ensure(l).active.key,'diaspora');l.choose(1);force(l,'contract','mexico');l.choose(0);assert.equal(T.ensure(l).residence.abroad,true);
});
test('independence roles require participation and literacy; leaving preserves the actual history',()=>{
 const l=life(1920,'여자');l.world.educationYears=0;if(l.joseon)l.joseon.literacy=0;force(l,'orgInvite','domestic');l.choose(0);assert.equal(D.ensure(l).org.role,'');assert.equal(l.getChoice().options[1].action,'support');l.choose(2);assert.equal(D.ensure(l).org.role,'learning');
 for(let i=0;i<2;i++){force(l,'orgYear','domestic');l.choose(0);}assert.equal(D.ensure(l).org.literacy,2);force(l,'orgYear','domestic');l.choose(3);assert.equal(l.getChoice().options[1].action,'records');l.choose(1);force(l,'orgYear','domestic');l.choose(2);assert.equal(D.ensure(l).org.status,'left');assert.ok(D.ensure(l).history.length>=5);
});
test('China organizations and Guangbok Army obey date and location, without inferred combat',()=>{
 const l=departed('china',1939,'여자');assert.equal(D.orgEligible(l,'kwangbok'),false);l.year=1940;l.age++;assert.equal(D.orgEligible(l,'kwangbok'),true);force(l,'orgInvite','kwangbok');l.choose(0);l.choose(2);assert.equal(D.ensure(l).org.role,'training');assert.equal(l.log.some(e=>/전투에서 승리|장교로 임명/.test(e.text)),false);
 const domestic=life(1940,'여자');assert.equal(D.orgEligible(domestic,'kwangbok'),false);
});
test('liberation does not grant instant return or automatic honors; activity survives restore',()=>{
 let l=departed('china',1940,'여자');force(l,'orgInvite','provisional');l.choose(0);l.choose(0);l.year=1945;l.age=30;D.abroadYear(l,T.ensure(l));assert.equal(D.ensure(l).active.type,'liberation');l=L.restore(copy(l.snapshot()));assert.equal(l.getChoice().title,'해방 뒤에도 남은 삶의 일');l.choose(0);assert.equal(T.ensure(l).residence.abroad,true);assert.equal(D.ensure(l).org.status,'finished');l.year=1946;l.age++;D.abroadYear(l,T.ensure(l));assert.equal(D.ensure(l).active.type,'chinaLife');l.choose(0);assert.equal(j(l).savings,2);
});
test('invalid selection is atomic and forged foreign residence is rejected',()=>{
 const l=life(1966);force(l,'invite','germanyMine');const data=copy(l.snapshot());assert.equal(l.choose(-1),false);assert.deepEqual(copy(l.snapshot()),data);
 const bad=copy(departed('germanyMine',1966).snapshot());bad.travel22.residence.since=1940;bad.diaspora340.journeys[0].departed=1940;const r=L.restore(bad);assert.equal(T.ensure(r).residence.abroad,false);
});
