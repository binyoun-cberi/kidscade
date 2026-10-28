export const SAVE_KEY='kidscade_game_v1:science_cosmic_growth:interstellar';
export const UPGRADES=[
['damage','브레이커 피해','피해 ×1.8',12,null,16,'◈'],['speed','브레이커 속도','초당 타격 +2',18,'damage',10,'»'],['radius','브레이커 반경','반경 +7',25,'damage',10,'◎'],['time','세션 타이머','제한 시간 +5초',35,'speed',8,'⌛'],['crit','치명타 확률','확률 +5%',60,'radius',10,'✧'],['critPower','치명타 배율','피해·수익 배율 +1',100,'crit',8,'✦'],['mass','천체 질량','체력 ×1.6 · 수익 ×2.5',25,'damage',20,'⬡'],['density','천체 생성 수','천체 +12개',40,'mass',10,'⁙'],['respawn','재생성','즉시 재생성 확률 +8%',90,'density',8,'↻'],['planet','행성 해금','체력 40배 · 수익 30배',450,'mass',1,'◉'],['star','항성 해금','체력 1400배 · 수익 600배',18000,'planet',1,'☀'],['gold','황금 천체','출현 확률 +2%',120,'mass',8,'◆'],['goldPower','황금 보너스','황금 수익 ×3',220,'gold',10,'＄'],['lightning','전기 천체','출현 확률 +3%',40,'speed',6,'ϟ'],['electricPower','번개 피해','연쇄 피해 +100%',300,'lightning',10,'⚡'],['chain','연쇄·분기','연쇄 대상 +2',450,'lightning',8,'⋈'],['moon','달 해금','출현 확률 +1.5%',55,'radius',6,'☾'],['moonPower','달 버프','달의 속도·반경 효과 증가',500,'moon',8,'◌'],['moonDuration','달 지속 시간','버프 +2초',700,'moon',6,'◷'],['moonCap','달 중첩 한도','최대 중첩 +1',900,'moonPower',4,'☽'],['comet','무지개 혜성','8초간 피해·수익 ×4',1800,'crit',5,'☄'],['laser','레이저 별','출현 확률 +2%',24000,'star',6,'━'],['laserPower','레이저 증폭','피해 ×2 · 두께 +8',36000,'laser',10,'═'],['nova','초신성','폭발 출현 확률 +1.5%',160000,'laser',6,'✺'],['novaPower','초신성 증폭','피해 ×2 · 반경 +35',240000,'nova',10,'✹'],['growthTime','성장 보상','성장 시 +2초',1000,'time',3,'⊕'],['luckyTime','시간 조각','파괴 시 2% 확률 +0.4초',1800,'growthTime',5,'⌛']
].map(([id,name,description,base,parent,max,icon])=>({id,name,description,base,parent,max,icon}));
export const FOCUSES = {
  balanced: {name:'균형', text:'모든 능력을 고르게 활용'},
  lightning: {name:'연쇄 번개', text:'번개 피해 ×2 · 연쇄 대상 +2'},
  moon: {name:'달 궤도', text:'달 한도 +1 · 달 지속 시간 +3초'},
  gold: {name:'황금 사냥', text:'황금 수익 ×2 · 치명타 확률 +10%'},
  burst: {name:'대폭발', text:'레이저·초신성 피해 ×2 · 폭주 충전 ×1.5'}
};
export const SPECIALS=['lightning','moon','gold','comet','laser','nova'];
export const fresh=()=>({version:2,money:0,total:0,kills:0,rounds:0,best:0,investment:0,levels:{},seen:[],focus:'balanced',mix:'balanced',sound:false,reduced:false,quick:false,cleared:false});
export function sanitize(raw){
  const s=fresh(); if(!raw||typeof raw!=='object')return s;
  for(const k of ['money','total','kills','rounds','best'])s[k]=Number.isFinite(raw[k])?Math.max(0,raw[k]):0;
  for(const k of ['sound','reduced','quick','cleared'])if(typeof raw[k]==='boolean')s[k]=raw[k];
  for(const u of UPGRADES){const n=Number(raw.levels?.[u.id]);s.levels[u.id]=Number.isFinite(n)?Math.max(0,Math.min(u.max,Math.floor(n))):0}
  if(FOCUSES[raw.focus])s.focus=raw.focus;
  if(['rocks','balanced','stars'].includes(raw.mix))s.mix=raw.mix;
  s.seen=Array.isArray(raw.seen)?SPECIALS.filter(id=>raw.seen.includes(id)):[];
  // Version-one investments used the original research prices. Preserve their refund value.
  if(raw.version===2&&Number.isFinite(raw.investment))s.investment=Math.max(0,raw.investment);
  else for(const u of UPGRADES)for(let i=0;i<level(s,u.id);i++)s.investment+=Math.ceil(({lightning:180,moon:250}[u.id]||u.base)*Math.pow(2.7,i));
  s.cleared=s.cleared||sizeFor(s.total)>=20;
  return s;
}
export const level=(s,id)=>s.levels[id]||0;
export const cost=(s,u)=>Math.ceil(u.base*Math.pow(2.7,level(s,u.id)));
export function buy(s,id){
  const u=UPGRADES.find(u=>u.id===id);
  if(!u||level(s,id)>=u.max||(u.parent&&!level(s,u.parent))||s.money<cost(s,u))return false;
  const paid=cost(s,u);s.money-=paid;s.investment+=paid;s.levels[id]=level(s,id)+1;return true;
}
export function refund(s){const amount=s.investment;s.money+=amount;s.investment=0;s.levels={};return amount}
export function stats(s,moons=0,rainbow=false){
  const l=id=>level(s,id),cap=1+l('moonCap')+(s.focus==='moon'?1:0),m=Math.min(moons,cap);
  return {damage:Math.pow(1.8,l('damage'))*(rainbow?4:1),interval:1/((4+2*l('speed'))*(1+m*(.5+.25*l('moonPower')))),radius:(25+7*l('radius'))*(1+m*(.25+.0625*l('moonPower'))),duration:20+5*l('time'),crit:Math.min(.75,.05+.05*l('crit')+(s.focus==='gold'?.1:0)),critPower:2+l('critPower'),reward:rainbow?4:1,count:48+12*l('density'),moonCap:cap};
}
export function bodyStats(s,tier){const mass=level(s,'mass');return {hp:[1,40,1400][tier]*Math.pow(1.6,mass),value:[1,30,600][tier]*Math.pow(2.5,mass)}}
export function breakSeconds(s,tier){const a=stats(s);return Math.max(1,Math.ceil(bodyStats(s,tier).hp/a.damage))*a.interval}
export function tierFor(s,roll){
  const star=level(s,'star')?(s.mix==='stars'?.3:s.mix==='rocks'?.04:.17):0;
  const planet=level(s,'planet')?(s.mix==='stars'?.35:s.mix==='rocks'?.14:.3):0;
  return roll<star?2:roll<star+planet?1:0;
}
export const sizeFor=total=>Math.min(20,1+Math.floor(Math.log10(1+total)*2));
export function format(n){for(const [v,u] of [[1e15,'Q'],[1e12,'T'],[1e9,'B'],[1e6,'M'],[1e3,'K']])if(n>=v)return (n/v).toFixed(2)+u;return Math.floor(n).toLocaleString('en-US')}
