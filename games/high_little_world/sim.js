export const COLS=32;
export const ROWS=24;
export const CELL=1;
export const HEIGHT_STEP=.34;
const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const SETTLEMENT_NAMES=['새싹','물빛','솔바람','푸른들','해오름','별숲','돌샘','강마루','구름'];
function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function hash01(x,z,seed){let n=(x*374761393+z*668265263+seed*69069)|0;n=(n^(n>>>13))*1274126177;return((n^(n>>>16))>>>0)/4294967295}
export class WorldSim{
  constructor(seed=Date.now()){this.reset(seed)}
  reset(seed=Date.now()){
    this.seed=(Number(seed)||1)>>>0;this.rng=mulberry32(this.seed);this.tick=0;this.year=0;this.cells=[];this.settlements=[];this.nextSettlementId=1;this.eventLog=[];this.usedPowers={};
    for(let z=0;z<ROWS;z++)for(let x=0;x<COLS;x++){
      const nx=(x-(COLS-1)/2)/(COLS*.48),nz=(z-(ROWS-1)/2)/(ROWS*.47),rad=Math.hypot(nx,nz);
      const noise=(hash01(x,z,this.seed)-.5)*1.35+(hash01(x*3+7,z*5+11,this.seed)-.5)*.5;
      const raw=(1-rad)*5.7+noise-1.15;
      const height=Math.max(0,Math.min(5,Math.floor(raw)));
      const sea=height===0;
      const moisture=sea?1:clamp(.26+(1-rad)*.2+(hash01(x+41,z+17,this.seed)-.5)*.18);
      const fertility=sea?0:clamp(.35+moisture*.35+(hash01(x+9,z+31,this.seed)-.5)*.22);
      const vegetation=sea?0:clamp((moisture-.16)*.95+fertility*.2-height*.035);
      this.cells.push({x,z,height,sea,water:sea?.72:0,moisture,fertility,temperature:.66,vegetation,herb:0,pred:0,fire:0,sunHeat:0,road:false,biome:sea?'ocean':'grass'});
    }
    this.updateBiomes();this.log('🌍 작은 섬이 태어났습니다.');
  }
  index(x,z){return z*COLS+x}
  get(x,z){return x<0||z<0||x>=COLS||z>=ROWS?null:this.cells[this.index(x,z)]}
  neighbors(c){return [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>this.get(c.x+dx,c.z+dz)).filter(Boolean)}
  cellsInRadius(x,z,r){const out=[];for(let zz=Math.max(0,z-r);zz<=Math.min(ROWS-1,z+r);zz++)for(let xx=Math.max(0,x-r);xx<=Math.min(COLS-1,x+r);xx++)if(Math.hypot(xx-x,zz-z)<=r+.2)out.push(this.get(xx,zz));return out}
  log(text){this.eventLog.unshift({year:Math.floor(this.year),text});this.eventLog=this.eventLog.slice(0,7)}
  settlementNear(x,z,r=4){return this.settlements.find(s=>Math.hypot(s.x-x,s.z-z)<=r)}
  applyPower(type,x,z){
    const center=this.get(x,z);if(!center)return {ok:false,msg:'세계 바깥이에요.'};
    this.usedPowers[type]=(this.usedPowers[type]||0)+1;
    const area=(r)=>this.cellsInRadius(x,z,r);
    if(type==='inspect')return {ok:true,inspect:true,msg:this.describeCell(center)};
    if(type==='raise'){
      for(const c of area(1)){c.height=Math.min(5,c.height+1);c.sea=false;if(c.water>.7)c.water=.7}
      this.updateBiomes();return {ok:true,msg:'⛰️ 땅이 솟아올랐어요. 물길이 달라질 수 있어요.'};
    }
    if(type==='lower'){
      for(const c of area(1)){c.height=Math.max(0,c.height-1);if(c.height===0){c.sea=true;c.water=Math.max(.72,c.water);c.vegetation=0;c.herb=0;c.pred=0}}
      this.updateBiomes();return {ok:true,msg:'🕳️ 땅이 낮아졌어요. 물이 이쪽으로 모일 수 있어요.'};
    }
    if(type==='rain'){
      for(const c of area(2)){const f=1-Math.min(1,Math.hypot(c.x-x,c.z-z)/3);c.water=Math.min(1.6,c.water+.26+.25*f);c.moisture=clamp(c.moisture+.22+.18*f)}
      return {ok:true,msg:'🌧️ 비가 내립니다. 잠시 지켜보면 물이 낮은 곳으로 흘러요.'};
    }
    if(type==='sun'){
      for(const c of area(2)){c.sunHeat=Math.min(.45,c.sunHeat+.24);c.water=Math.max(0,c.water-.08);c.moisture=Math.max(0,c.moisture-.07)}
      return {ok:true,msg:'☀️ 햇빛이 강해졌어요. 따뜻해지지만 물도 더 빨리 마릅니다.'};
    }
    if(type==='drought'){
      for(const c of area(4)){c.water=Math.max(0,c.water-.34);c.moisture=Math.max(0,c.moisture-.36);c.sunHeat=Math.min(.5,c.sunHeat+.18)}
      this.log('🏜️ 가뭄이 한 지역을 덮쳤습니다.');return {ok:true,msg:'🏜️ 넓은 지역이 메말랐어요.'};
    }
    if(type==='plants'){
      if(center.sea)return {ok:false,msg:'🌱 깊은 바다에는 육상 식물을 심기 어려워요.'};
      for(const c of area(1))if(!c.sea)c.vegetation=clamp(c.vegetation+.42);
      return {ok:true,msg:'🌱 식물을 놓았어요. 환경이 맞으면 주변으로 퍼집니다.'};
    }
    if(type==='herbivore'){
      if(center.sea||center.vegetation<.2)return {ok:false,msg:'🦌 먹을 풀이 있는 육지에 놓아 주세요.'};
      center.herb=Math.min(14,center.herb+5);return {ok:true,msg:'🦌 초식동물이 풀을 먹기 시작했어요.'};
    }
    if(type==='predator'){
      if(center.sea||center.herb<.7)return {ok:false,msg:'🦊 먹잇감이 있는 육지에 놓아 주세요.'};
      center.pred=Math.min(6,center.pred+2.3);return {ok:true,msg:'🦊 포식자가 생태계에 들어왔어요.'};
    }
    if(type==='human'){
      if(center.sea||center.water>.65)return {ok:false,msg:'👥 사람이 정착할 마른 육지를 골라 주세요.'};
      if(this.settlementNear(x,z,5))return {ok:false,msg:'🏘️ 가까이에 이미 정착지가 있어요.'};
      const waterAccess=[center,...this.neighbors(center),...area(2)].some(c=>c.sea||c.water>.13);
      if(!waterAccess)return {ok:false,msg:'💧 사람은 물을 구할 수 있는 곳에 정착하려고 해요.'};
      const s={id:this.nextSettlementId++,name:SETTLEMENT_NAMES[(this.nextSettlementId+this.seed)%SETTLEMENT_NAMES.length]+' 마을',x,z,pop:6,food:8,wood:3,knowledge:0,level:0,age:0,blessed:0};
      this.settlements.push(s);this.log('👥 '+s.name+'의 첫 야영지가 생겼습니다.');return {ok:true,msg:'👥 사람들이 자리를 잡았어요. 이제 스스로 살아갑니다.'};
    }
    if(type==='blessing'){
      const s=this.settlements.reduce((best,q)=>!best||dist(q,center)<dist(best,center)?q:best,null);
      if(!s||Math.hypot(s.x-x,s.z-z)>5)return {ok:false,msg:'✨ 정착지 가까이에 축복을 내려 주세요.'};
      s.food+=18;s.knowledge+=5;s.blessed=8;return {ok:true,msg:'✨ '+s.name+'에 풍요와 영감이 찾아왔어요.'};
    }
    if(type==='lightning'){
      center.fire=Math.max(center.fire,center.moisture<.45&&center.vegetation>.25?.85:.28);center.herb*=.8;center.pred*=.88;
      return {ok:true,msg:center.fire>.5?'⚡ 마른 식생에 불이 붙었어요!':'⚡ 번개가 내리쳤지만 크게 번지진 않았어요.'};
    }
    if(type==='fire'){
      if(center.sea)return {ok:false,msg:'🔥 바다에는 불을 붙일 수 없어요.'};
      center.fire=1;return {ok:true,msg:'🔥 불이 붙었습니다. 건조할수록 주변으로 잘 번져요.'};
    }
    if(type==='meteor'){
      for(const c of area(2)){const d=Math.hypot(c.x-x,c.z-z);if(d<1.1)c.height=Math.max(0,c.height-2);else c.height=Math.max(0,c.height-1);c.sea=c.height===0;c.water=c.sea?Math.max(c.water,.45):Math.max(0,c.water-.15);c.vegetation*=.08;c.herb*=.12;c.pred*=.18;c.fire=c.sea?0:Math.max(c.fire,.75);c.fertility=clamp(c.fertility+.2)}
      for(const s of this.settlements)if(Math.hypot(s.x-x,s.z-z)<2.6)s.pop=Math.max(0,s.pop*.48);
      this.updateBiomes();this.log('☄️ 운석이 충돌해 지형이 바뀌었습니다.');return {ok:true,msg:'☄️ 충돌구가 생겼어요. 시간이 지나면 새로운 환경이 될 수도 있어요.'};
    }
    return {ok:false,msg:'아직 사용할 수 없는 힘이에요.'};
  }
  step(times=1){for(let i=0;i<times;i++)this.singleStep()}
  singleStep(){
    this.tick++;this.year+=.25;this.waterStep();this.climateStep();this.fireStep();this.ecologyStep();if(this.tick%2===0)this.settlementStep();if(this.tick%8===0)this.rebuildRoads();this.updateBiomes();
    if(this.tick%36===0&&this.rng()<.28){const x=Math.floor(this.rng()*COLS),z=Math.floor(this.rng()*ROWS);for(const c of this.cellsInRadius(x,z,3)){c.water=Math.min(1.4,c.water+.14);c.moisture=clamp(c.moisture+.12)}this.log('🌦️ 자연적으로 비구름이 지나갔습니다.')}
  }
  waterStep(){
    const delta=new Float32Array(this.cells.length);
    for(const c of this.cells){
      if(c.sea||c.water<.025)continue;
      const surface=c.height*HEIGHT_STEP+c.water*.28;
      let target=null,targetSurface=surface;
      for(const n of this.neighbors(c)){const ns=n.height*HEIGHT_STEP+n.water*.28-(n.sea ? .12 : 0);if(ns<targetSurface){target=n;targetSurface=ns}}
      if(target){const flow=Math.min(c.water*.38,Math.max(0,(surface-targetSurface)*.24));if(flow>.003){delta[this.index(c.x,c.z)]-=flow;delta[this.index(target.x,target.z)]+=flow}}
    }
    this.cells.forEach((c,i)=>{c.water=clamp(c.water+delta[i],0,1.7);if(c.sea)c.water=Math.max(.68,c.water)});
  }
  climateStep(){
    for(const c of this.cells){
      const lat=Math.abs(c.z-(ROWS-1)/2)/(ROWS/2),nearWater=this.neighbors(c).some(n=>n.sea||n.water>.18);
      c.sunHeat*=.86;c.temperature=clamp(.76-lat*.14-c.height*.055+c.sunHeat,.08,1);
      if(c.sea){c.moisture=1;c.fertility=0;continue}
      c.moisture=clamp(c.moisture+c.water*.055+(nearWater ? .018 : 0)-(.011+c.temperature*.011));
      c.water=Math.max(0,c.water-(.008+c.temperature*.009));
      c.fertility=clamp(c.fertility+(c.moisture>.3&&c.moisture<.82 ? .002 : -.001)+c.vegetation*.0015);
      if(c.fire<.08){
        const comfort=clamp(1-Math.abs(c.temperature-.58)*2.1)*clamp(1-Math.abs(c.moisture-.55)*1.65);
        const ns=this.neighbors(c),spread=ns.reduce((s,n)=>s+n.vegetation,0)/Math.max(1,ns.length);
        c.vegetation=clamp(c.vegetation+comfort*c.fertility*(1-c.vegetation)*.032+spread*.006-c.herb*.0018-(c.water>.72 ? .035 : 0));
      }
    }
  }
  fireStep(){
    const ignite=[];
    for(const c of this.cells){
      if(c.fire<=.01)continue;
      c.vegetation=Math.max(0,c.vegetation-.11*c.fire);c.herb=Math.max(0,c.herb-.08*c.fire);c.pred=Math.max(0,c.pred-.045*c.fire);c.fertility=clamp(c.fertility+.007*c.fire);
      if(c.moisture<.34&&c.vegetation>.18)for(const n of this.neighbors(c))if(!n.sea&&n.fire<.08&&n.vegetation>.3&&this.rng()<.035*c.fire*(1-n.moisture))ignite.push(n);
      c.fire=Math.max(0,c.fire-(.035+c.moisture*.095+c.water*.12));
    }
    ignite.forEach(c=>c.fire=Math.max(c.fire,.72));
  }
  ecologyStep(){
    for(const c of this.cells){
      if(c.sea||c.water>.78){c.herb*=.94;c.pred*=.95;continue}
      const starve=c.vegetation<.12?.09:0;
      const herbBirth=c.herb>0?c.herb*(.012+c.vegetation*.018)*(1-c.herb/13):0;
      const predation=c.pred*.055;
      c.herb=clamp(c.herb+herbBirth-predation-c.herb*(.012+starve),0,14);
      c.vegetation=Math.max(0,c.vegetation-c.herb*.0024);
      const predatorBirth=c.pred>0?c.pred*(.007+c.herb*.002)*(1-c.pred/5.5):0;
      c.pred=clamp(c.pred+predatorBirth-c.pred*.018,0,6);
      if(c.herb>.5&&this.rng()<.08){const n=this.neighbors(c).filter(q=>!q.sea&&q.vegetation>.18).sort((a,b)=>b.vegetation-a.vegetation)[0];if(n){const moved=c.herb*.05;c.herb-=moved;n.herb=Math.min(14,n.herb+moved)}}
    }
  }
  settlementStep(){
    const dead=[];
    for(const s of this.settlements){
      s.age+=.5;if(s.blessed>0)s.blessed--;
      const r=2+s.level,area=this.cellsInRadius(s.x,s.z,r),water=area.some(c=>c.sea||c.water>.13);
      const foodPotential=area.reduce((sum,c)=>sum+c.vegetation*.5+c.herb*.035+(c.biome==='wetland' ? .16 : 0),0);
      const woodPotential=area.reduce((sum,c)=>sum+(c.biome==='forest'?c.vegetation*.36:c.vegetation*.08),0);
      s.food=Math.max(-12,s.food+foodPotential*.045+s.blessed*.4-s.pop*.018);
      s.wood=Math.max(0,s.wood+woodPotential*.016);
      s.knowledge+=s.pop*.004+(s.blessed>0 ? .12 : 0);
      const good=water&&s.food>Math.max(2,s.pop*.08);
      if(good)s.pop+=Math.max(.08,s.pop*(.008+s.level*.0015));else s.pop-=Math.max(.06,s.pop*.006);
      if(s.food>8){const harvest=Math.min(s.food-8,s.pop*.035);s.food-=harvest}
      const old=s.level;s.level=s.pop>=70?3:s.pop>=28?2:s.pop>=12?1:0;
      if(s.level>old)this.log('🏘️ '+s.name+'이 '+this.settlementStage(s)+' 단계로 발전했습니다.');
      const home=this.get(s.x,s.z);if(home?.fire>.45){s.pop*=.985;s.food-=.4}
      const chop=area.filter(c=>c.vegetation>.5&&!c.sea);if(chop.length&&s.wood<25){const c=chop[Math.floor(this.rng()*chop.length)];c.vegetation=Math.max(.12,c.vegetation-.008*(1+s.level))}
      if(s.pop<1)dead.push(s);
      if(s.pop>105&&this.settlements.length<6&&this.tick%20===0)this.foundChildSettlement(s);
    }
    if(dead.length){this.settlements=this.settlements.filter(s=>!dead.includes(s));dead.forEach(s=>this.log('🏚️ '+s.name+'의 사람들이 떠났습니다.'))}
  }
  foundChildSettlement(parent){
    const candidates=this.cells.filter(c=>!c.sea&&c.water<.5&&!this.settlementNear(c.x,c.z,5)&&Math.hypot(c.x-parent.x,c.z-parent.z)>5&&Math.hypot(c.x-parent.x,c.z-parent.z)<11&&[c,...this.neighbors(c)].some(q=>q.sea||q.water>.12));
    if(!candidates.length)return;const c=candidates[Math.floor(this.rng()*candidates.length)],pop=22;parent.pop-=pop;
    const s={id:this.nextSettlementId++,name:SETTLEMENT_NAMES[(this.nextSettlementId+this.seed)%SETTLEMENT_NAMES.length]+' 마을',x:c.x,z:c.z,pop,food:14,wood:7,knowledge:parent.knowledge*.18,level:1,age:0,blessed:0};this.settlements.push(s);this.log('🧭 '+parent.name+'에서 떠난 사람들이 '+s.name+'을 세웠습니다.');
  }
  rebuildRoads(){
    this.cells.forEach(c=>c.road=false);if(this.settlements.length<2)return;
    const markLine=(a,b)=>{let x=a.x,z=a.z,dx=Math.abs(b.x-x),dz=Math.abs(b.z-z),sx=x<b.x?1:-1,sz=z<b.z?1:-1,err=dx-dz;for(let guard=0;guard<100;guard++){const c=this.get(x,z);if(c&&!c.sea)c.road=true;if(x===b.x&&z===b.z)break;const e2=2*err;if(e2>-dz){err-=dz;x+=sx}if(e2<dx){err+=dx;z+=sz}}};
    for(let i=1;i<this.settlements.length;i++){let nearest=this.settlements[0];for(let j=0;j<i;j++)if(dist(this.settlements[i],this.settlements[j])<dist(this.settlements[i],nearest))nearest=this.settlements[j];markLine(this.settlements[i],nearest)}
  }
  updateBiomes(){
    for(const c of this.cells){
      if(c.sea){c.biome='ocean';continue}
      if(c.height>=5){c.biome='mountain';continue}
      if(c.water>.58){c.biome='wetland';continue}
      if(c.moisture<.18&&c.vegetation<.25){c.biome='barren';continue}
      if(c.vegetation>.67&&c.moisture>.42){c.biome='forest';continue}
      if(c.vegetation>.42){c.biome='meadow';continue}
      c.biome='grass';
    }
  }
  settlementStage(s){return ['야영지','마을','큰 마을','도시'][s.level]||'정착지'}
  describeCell(c){
    const labels={ocean:'바다',mountain:'산지',wetland:'습지',barren:'메마른 땅',forest:'숲',meadow:'풀꽃지대',grass:'초원'};
    const s=this.settlementNear(c.x,c.z,1.5);
    return (labels[c.biome]||c.biome)+'\n높이 '+c.height+' · 물 '+Math.round(c.water*100)+' · 수분 '+Math.round(c.moisture*100)+'%\n온도 '+Math.round(c.temperature*100)+' · 비옥도 '+Math.round(c.fertility*100)+'% · 식생 '+Math.round(c.vegetation*100)+'%\n초식 '+c.herb.toFixed(1)+' · 포식 '+c.pred.toFixed(1)+(c.fire>.05?' · 🔥 화재 '+Math.round(c.fire*100)+'%':'')+(s?'\n🏘️ '+s.name+' · '+this.settlementStage(s)+' · 인구 '+Math.round(s.pop):'');
  }
  stats(){
    const n=this.cells.length,veg=this.cells.reduce((s,c)=>s+c.vegetation,0)/n,herb=this.cells.reduce((s,c)=>s+c.herb,0),pred=this.cells.reduce((s,c)=>s+c.pred,0),humans=this.settlements.reduce((s,q)=>s+q.pop,0);
    return {veg:Math.round(veg*100),herb:Math.round(herb),pred:Math.round(pred),humans:Math.round(humans),settlements:this.settlements.length,year:Math.floor(this.year)};
  }
  snapshot(){return {version:1,seed:this.seed,tick:this.tick,year:this.year,nextSettlementId:this.nextSettlementId,cells:this.cells,settlements:this.settlements,eventLog:this.eventLog,usedPowers:this.usedPowers}}
  restore(data){
    if(!data||data.version!==1||!Array.isArray(data.cells)||data.cells.length!==COLS*ROWS)return false;
    this.seed=data.seed>>>0;this.rng=mulberry32(this.seed+Number(data.tick||0));this.tick=Number(data.tick)||0;this.year=Number(data.year)||0;this.nextSettlementId=Number(data.nextSettlementId)||1;
    this.cells=data.cells.map(c=>({...c}));this.settlements=Array.isArray(data.settlements)?data.settlements.map(s=>({...s})):[];this.eventLog=Array.isArray(data.eventLog)?data.eventLog:[];this.usedPowers=data.usedPowers||{};this.updateBiomes();return true;
  }
}
