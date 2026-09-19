export function createWorldAudio(){
  const SETTINGS_KEY='kidscade_world_audio_v1';
  const ROOT='../assets/audio/';
  const SFX={
    pickup:ROOT+'sfx/collect/coin-pickup-01.mp3',
    purchase:ROOT+'sfx/shop/purchase-kaching-01.mp3',
    shop:ROOT+'sfx/shop/register-open-01.mp3',
    impact:ROOT+'sfx/combat/impact-heavy-01.mp3',
    success:ROOT+'sfx/success/cheer-yay-01.mp3',
    fail:ROOT+'sfx/failure/fail-sting-01.mp3'
  };
  const BGM=ROOT+'incoming/newmusical/idoberg-relaxing-guitar-loop-v8-252351.mp3';
  let enabled=true,unlocked=false,bgm=null;
  try{const raw=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null');if(raw&&typeof raw.enabled==='boolean')enabled=raw.enabled}catch(_){}
  const cache=new Map();
  function persist(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify({enabled}))}catch(_){}}
  function make(src,loop=false,volume=.16){
    const a=new Audio(src);a.preload='auto';a.loop=loop;a.volume=volume;return a;
  }
  function ensureBgm(){
    if(!bgm){bgm=make(BGM,true,.105);bgm.addEventListener('error',()=>console.warn('[World v3 audio] BGM load failed'));}
    return bgm;
  }
  function unlock(){
    unlocked=true;
    if(enabled){const a=ensureBgm();if(a.paused)a.play().catch(()=>{});}
  }
  function sfx(kind,volume=.22){
    if(!enabled||!unlocked)return;
    const src=SFX[kind];if(!src)return;
    let a=cache.get(kind);
    if(!a){a=make(src,false,volume);cache.set(kind,a);}
    try{a.pause();a.currentTime=0;a.volume=volume;a.play().catch(()=>{});}catch(_){}
  }
  function setEnabled(next){
    enabled=!!next;persist();
    if(enabled){unlock();}else if(bgm){bgm.pause();}
    return enabled;
  }
  function toggle(){return setEnabled(!enabled)}
  function label(){return enabled?'🔊 소리':'🔇 소리'}
  function stop(){if(bgm)bgm.pause()}
  return {unlock,sfx,toggle,setEnabled,isEnabled:()=>enabled,label,stop};
}
