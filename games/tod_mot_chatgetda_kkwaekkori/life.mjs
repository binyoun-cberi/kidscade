// Deterministic, renderer-independent neighborhood stories.
// They are scenery, NEVER extra selectable citizens or puzzle RNG draws.
// All changes are tracked separately from the saved clue/route simulation.
export const LIFE_CUES=Object.freeze({
  bakery:['shop-door','fresh-bread'],
  market:['market-bag','market-awning'],
  park:['bird-hop','play-ball'],
  home:['water-flowers','window-glow'],
  school:['pinwheel','school-bell'],
  stop:['notice-board','street-bunting']
});
export const LIFE_LIMIT=Object.freeze({small:6,medium:8,large:11});
function hash(seed,value){
  let h=(seed>>>0)^0x91e10da5;
  for(const char of value)h=Math.imul(h^char.charCodeAt(0),16777619)>>>0;
  return h>>>0;
}
export function createLivingCity(town){
  if(town.challenge)return null;
  const limit=LIFE_LIMIT[town.stageName]||6;
  // Represent every district type, then spread extra stories across the
  // larger towns without changing any original block or resident.
  const sorted=[...town.blocks].sort((a,b)=>
    hash(town.seed,a.id)-hash(town.seed,b.id));
  const seen=new Set(),picked=[];
  for(const block of sorted)if(!seen.has(block.kind)){
    seen.add(block.kind);picked.push(block);
  }
  for(const block of sorted)if(picked.length<limit&&!picked.includes(block))picked.push(block);
  const scenes=picked.map(block=>{
    const key=hash(town.seed,block.id);
    return {id:'life-'+block.id,blockId:block.id,kind:block.kind,
      start:1.4+(key%29)*.13,period:11+((key>>>5)%7),
      duration:4.8+((key>>>12)%4)*.7,
      cue:LIFE_CUES[block.kind][0],active:false,phase:0,
      cycle:-1,episodes:0};
  });
  return {scenes,episodes:0,counts:{},recent:[]};
}
export function stepLivingCity(town){
  const life=town.life;
  if(!life)return;
  for(const scene of life.scenes){
    const elapsed=town.time-scene.start;
    if(elapsed<0){scene.active=false;scene.phase=0;continue;}
    const cycle=Math.floor(elapsed/scene.period);
    const within=elapsed-cycle*scene.period;
    scene.cue=LIFE_CUES[scene.kind][cycle%LIFE_CUES[scene.kind].length];
    scene.active=within<scene.duration;
    scene.phase=scene.active?Math.min(1,within/scene.duration):0;
    if(scene.active&&cycle>scene.cycle){
      scene.cycle=cycle;scene.episodes++;life.episodes++;
      life.counts[scene.cue]=(life.counts[scene.cue]||0)+1;
      life.recent.push({kind:scene.cue,block:scene.blockId,at:+town.time.toFixed(2)});
      if(life.recent.length>18)life.recent.shift();
    }
  }
}
