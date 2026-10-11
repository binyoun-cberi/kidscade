/* v8: Fictional family biographies, geographical setting and ILLUSTRATIVE survival curves.
 * IMPORTANT: These are NOT real official age/sex tables; country baseline values
 * from v3 are game approximations and not a verified WDI extract.
 */
(function(root,factory){const x=factory(root?.OneLifeSim,root?.OneLifeWorld2,root?.OneLifeWorld3,root?.OneLifeWorld5,root?.OneLifeWorld7);
if(typeof module!=='undefined'&&module.exports)module.exports=x;if(root)root.OneLifeWorld8=x;
})(typeof window!=='undefined'?window:null,function(Sim,W2,W3,W5,W7){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const Official=typeof module!=='undefined'&&module.exports
  ? require('./official-data.js') : (typeof window!=='undefined'?window.OneLifeOfficialStats:null);
const measured=(country,key,birthYear=2026)=>birthYear===2026?Official?.countries?.[country?.[0]]?.[key]?.value:null;
function roll(seed,k){let x=(seed^Math.imul(k+1,0x9e3779b9))>>>0;x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/4294967296;}
const GROUP={
eastAsia:['온대·계절성 기후','도심·마을·산','#91b8af'],southAsia:['몬순·고온 등 다양한 기후','도심 골목과 농촌','#d8ba91'],
southEastAsia:['열대·몬순 등 다양한 기후','해안·도심·농촌','#b1cd9e'],northAfrica:['건조·해안·산악','그늘진 마을·마당','#d8c29b'],
westAfrica:['해안·사바나 등 다양한 기후','시장·주택가·마을','#cdb998'],eastAfrica:['고원·해안·사바나 등 다양한 기후','주택가·농장·시장','#b5c893'],
centralSouthAfrica:['초원·고원·열대 등 다양한 기후','여러 형태의 마을과 주거','#c1c295'],middleEast:['건조·고원·해안','그늘·마당·거리','#d3c09e'],
westernEurope:['온대·해양성·지중해성','아파트·광장·석조 거리','#b4b9c8'],eastEurope:['대륙성·온대','주거단지·골목','#b1beca'],
centralAsia:['건조·대륙성·고산','골목·마당·시장','#cbbf9c'],northAmerica:['해안·평원·산맥','주택가·도시·교외','#a8bfc0'],
latinAmerica:['열대·고산·온대','시장·골목·다양한 주택','#d4b99d'],pacific:['해양성·열대','해안·교외·농촌','#9ebdc9'],
other:['지역에 따른 다양한 기후','여러 형태의 집과 생활','#b5c0b8']
};
const SPECIAL={
'케냐':['고원·해안·사바나가 공존','나무 그늘과 흙길'],
'대한민국':['산지·도시·농촌','언덕과 버스 정류장'],
'인도':['평원·고원·해안·대도시','시장과 골목'],
'모나코':['지중해 연안 도시국가','항구와 언덕'],
'브라질':['숲·고원·대서양 연안','다양한 색의 주택'],
'나이지리아':['해안·내륙·사바나','시장과 도시 주거'],
'일본':['섬·산지·대도시','도시철도와 골목'],
'프랑스':['산지·평원·지중해','광장과 석조 건물'],
'모로코':['해안·산악·사막','마당과 그늘'],
'러시아':['대륙의 매우 다양한 기후','산림·철도·주거'],
'미국':['평원·해안·산맥','주택가·시가지·교통망']
};
const housing=['가족이 소유한 집','친척과 함께 사는 집','임차한 집','여러 가족이 함께 쓰는 집'];
function profile(life){
 W7.ensure(life);
 const p=life.profile,w=life.world7,u=w.familyPercentile,region=W5.groupFor(life.country[0]),c=GROUP[region]||GROUP.other;
 const h=roll(life.seed,810),kind=u>.78&&h<.7?0:u<.24&&h<.4?1:h<.47?2:h<.73?0:3;
 return {region,regionName:(SPECIAL[life.country[0]]||c)[0],accent:(SPECIAL[life.country[0]]||c)[1],
  housing:housing[kind],familyNote:['가족과 집안일을 나누는 생활','이웃과 자주 어울리는 일상','배움과 건강을 돌보는 가정','바쁜 일과 서로 돕는 시간'][Math.floor(roll(life.seed,811)*4)],
  workNote:['농사·상점·집안일을 함께 돕는 일상','학교·마을 활동을 함께 하는 생활','이웃·가족과 책임을 나누는 생활'][Math.floor(roll(life.seed,812)*3)],
  climate:c[0],structure:c[1],tone:c[2],
  neighborhood:p.settlement==='농촌'?'마을·농가':p.settlement==='소도시'?'소도시 생활권':'도시 주거 지역',
  reference:'세계은행 수명 지표를 참고한 게임용 근삿값',year:2024,
  stories:[],version:8};
}
function ensure(life){W7.ensure(life);return life.world8||(life.world8=profile(life));}
function moment(life){
 if(!life.alive||![0,8,18,38,62].includes(life.age))return;
 const d=ensure(life),p=life.profile,a=life.age;
 const sentence=a===0?p.city+'의 '+p.settlement+'에 있는 '+d.housing+'에서 태어났다. 부모는 '+p.motherJob+'과 '+p.fatherJob+' 일을 한다.'
 :a===8?d.neighborhood+'에서 성장하며 '+d.workNote+'을 경험했다.'
 :a===18?d.housing+'에서 자란 경험과 '+life.world.educationLevel+'의 배움이 앞으로의 선택에 영향을 주었다.'
 :a===38?'어린 시절 '+d.neighborhood+'에서 시작한 삶은 '+(life.world6.profession||life.career)+'의 경험으로 이어졌다.'
 :'삶의 시간이 흐르며 '+d.familyNote+'과 소중한 사람들의 기억이 남았다.';
 d.stories.push({age:a,text:sentence});life.logEvent(sentence,'family');
}
function mortality(country,gender,birthYear=2026){
 const observedLife=measured(country,'lifeExpectancy',birthYear);
 const observedUnder5=measured(country,'under5Mortality',birthYear);
 const baseline=Number.isFinite(observedLife)?observedLife:W3.baseline(country);
 const ref=clamp(baseline+(gender==='여자'?1.7:-1.7),48,93);
 // This one number is a published under-five estimate; the detailed ages
 // and the entire adult survival curve remain illustrative until sex/age life tables arrive.
 const under5=Number.isFinite(observedUnder5)
   ?clamp(observedUnder5/1000,0,.9)
   :clamp(.003+(.95-(country[4]||.6))*.053,.003,.062);
 const scale=clamp((ref-4.6)/(.906*(1-under5)),48,110);
 return {baseline,reference:ref,under5,scale,shape:3.8,
   sourceUnder5:Number.isFinite(observedUnder5)?'UN IGME':'game',
   sourceLife:Number.isFinite(observedLife)?'World Bank':'game'};
}
function survival(country,gender,age,birthYear=2026){
 const m=mortality(country,gender,birthYear),a=clamp(age,0,110);
 return a===0?1:a<=5?clamp(1-m.under5*Math.pow(a/5,.7),0,1):
 clamp((1-m.under5)*Math.exp(-Math.pow((a-5)/m.scale,m.shape)),0,1);
}
function points(country,gender,birthYear=2026){return Array.from({length:111},(_,i)=>({age:i,value:survival(country,gender,i,birthYear)}));}
function synopsis(life){const x=ensure(life),p=life.profile;
 return life.country[0]+' · '+p.city+' '+p.settlement+' · '+x.housing+' · 어머니 '+p.motherJob+' · 아버지 '+p.fatherJob;}
function install(){
 if(!Sim?.Life||!W7?.ensure||Sim.Life.prototype.__world8)return false;
 const L=Sim.Life,tick=L.prototype.tick,snap=L.prototype.snapshot,restore=L.restore;
 L.prototype.tick=function(){if(!this.alive||this.pending)return false;ensure(this);const ok=tick.call(this);if(ok&&this.alive)moment(this);return ok;};
 L.prototype.snapshot=function(){const d=ensure(this);return {...snap.call(this),world8:{...d,stories:d.stories.map(x=>({...x}))}};};
 L.restore=function(data){const life=restore.call(this,data);if(!life)return null;
 const d=ensure(life),x=data?.world8;if(x&&typeof x==='object'){
 for(const k of ['region','regionName','accent','housing','familyNote','workNote','climate','structure','tone','neighborhood','reference'])
 if(typeof x[k]==='string')d[k]=x[k].slice(0,160);
 if(Array.isArray(x.stories))d.stories=x.stories.filter(z=>z&&Number.isInteger(z.age)&&typeof z.text==='string').slice(-10).map(z=>({...z}));
 }return life;};
 Object.defineProperty(L.prototype,'__world8',{value:true});return true;
}
install();
return Object.freeze({install,ensure,profile,moment,mortality,survival,points,synopsis,GROUP,SPECIAL});
});