// Quiet, event-driven school audio. No third-party downloads and no hot-loop audio nodes.
// The game's existing room-tone, chatter, bell and fight recordings remain separate.
export const SCHOOL_SOUNDS=Object.freeze({
  step:{voice:'noise',tone:0,filter:250,duration:.07,level:.035,interval:.29},
  pencil:{voice:'noise',tone:0,filter:1900,duration:.12,level:.020,interval:1.25},
  chalk:{voice:'noise',tone:0,filter:1300,duration:.23,level:.025,interval:2.6},
  paper:{voice:'noise',tone:0,filter:900,duration:.20,level:.046,interval:.42},
  chair:{voice:'noise',tone:0,filter:550,duration:.24,level:.034,interval:2.5},
  whisper:{voice:'noise',tone:0,filter:450,duration:.29,level:.023,interval:2.8},
  dish:{voice:'tone',tone:920,filter:0,duration:.12,level:.022,interval:2.6},
  sneaker:{voice:'noise',tone:0,filter:460,duration:.12,level:.034,interval:.55},
  door:{voice:'noise',tone:0,filter:480,duration:.37,level:.060,interval:1.8},
  question:{voice:'tone',tone:660,filter:0,duration:.13,level:.045,interval:4},
  answer:{voice:'tone',tone:740,filter:0,duration:.14,level:.056,interval:.45},
  attention:{voice:'tone',tone:580,filter:0,duration:.16,level:.055,interval:.55},
  offTask:{voice:'noise',tone:0,filter:600,duration:.16,level:.024,interval:3},
  alert:{voice:'tone',tone:350,filter:0,duration:.19,level:.047,interval:2.3},
  group:{voice:'tone',tone:530,filter:0,duration:.15,level:.054,interval:1},
  tick:{voice:'tone',tone:630,filter:0,duration:.065,level:.030,interval:.12}
});
export const SCHOOL_MELODIES=Object.freeze({
  write:[440,580],paper:[480,610],attention:[630,830],recap:[525,659,784],
  warning:[310,250],calm:[392,524],health:[520,660],group:[540,700],
  grade:[523,659,784,1046]
});
export function schoolAmbientKind(phase,room='classroom'){
  if(phase==='social')return room==='cafeteria'?'dish':'whisper';
  if(phase==='transition')return null;
  if(room==='gym')return 'sneaker';
  if(room==='cafeteria')return 'dish';
  if(phase==='explain'||phase==='recap')return 'chalk';
  if(phase==='practice')return 'pencil';
  return null;
}
export function createSchoolSoundscape({contextFactory=null,random=Math.random}={}){
  let ctx=null,master=null,noiseBuffer=null,enabled=true,paused=false,time=0;
  let roomState='',ambientWait=3.2,seatWait=7,footWait=0;
  const last=new Map(),counts=new Map();
  const randomUnit=()=>Math.max(0,Math.min(.999999,Number(random())||0));
  function ensure(){
    if(ctx)return true;
    try{
      const Context=contextFactory||globalThis.AudioContext||globalThis.webkitAudioContext;
      if(!Context)return false;
      ctx=new Context();
      master=ctx.createGain();master.gain.value=enabled&&!paused?.68:0;
      master.connect(ctx.destination);
      return true;
    }catch(_){return false}
  }
  function unlock(){
    if(!ensure())return false;
    if(ctx.state==='suspended')ctx.resume?.().catch(()=>{});
    return true;
  }
  function output(pan){
    if(typeof ctx.createStereoPanner!=='function')return master;
    const panner=ctx.createStereoPanner();
    panner.pan.value=Math.max(-.75,Math.min(.75,Number(pan)||0));
    panner.connect(master);
    return panner;
  }
  function envelope(node,when,volume,duration){
    const gain=ctx.createGain();
    gain.gain.setValueAtTime(.0001,when);
    gain.gain.linearRampToValueAtTime(Math.max(.0002,volume),when+Math.min(.025,duration*.22));
    gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
    node.connect(gain);
    return gain;
  }
  function tone(freq,when,duration,volume,pan=0,type='sine'){
    const oscillator=ctx.createOscillator();oscillator.type=type;
    oscillator.frequency.setValueAtTime(freq,when);
    envelope(oscillator,when,volume,duration).connect(output(pan));
    oscillator.start(when);oscillator.stop(when+duration+.02);
  }
  function noise(when,duration,volume,frequency,pan=0){
    const sampleRate=ctx.sampleRate||44100;
    if(!noiseBuffer){
      noiseBuffer=ctx.createBuffer(1,Math.ceil(sampleRate*.6),sampleRate);
      const data=noiseBuffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=randomUnit()*2-1;
    }
    const sample=ctx.createBufferSource();sample.buffer=noiseBuffer;
    const filter=ctx.createBiquadFilter();
    filter.type=frequency>800?'bandpass':'lowpass';
    filter.frequency.setValueAtTime(frequency,when);
    if(filter.Q)filter.Q.value=.8;
    sample.connect(filter);
    envelope(filter,when,volume,duration).connect(output(pan));
    sample.start(when,randomUnit()*.13,duration);sample.stop(when+duration+.025);
  }
  function play(kind,{pan=0,volume=1}={}){
    const spec=SCHOOL_SOUNDS[kind];
    if(!spec||!enabled||paused||!ctx)return false;
    if(time-(last.get(kind)??-Infinity)<spec.interval)return false;
    last.set(kind,time);
    counts.set(kind,(counts.get(kind)||0)+1);
    const when=ctx.currentTime+.012,gain=spec.level*Math.max(0,Math.min(1.2,volume));
    try{
      if(spec.voice==='noise')noise(when,spec.duration,gain,spec.filter,pan);
      else tone(spec.tone,when,spec.duration,gain,pan,kind==='alert'?'triangle':'sine');
      if(kind==='question')tone(850,when+.09,.12,gain*.67,pan);
      if(kind==='answer')tone(980,when+.10,.14,gain*.75,pan);
      if(kind==='door')tone(170,when+.12,.18,gain*.45,pan,'triangle');
      return true;
    }catch(_){return false}
  }
  function cue(kind){
    if(!enabled||paused||!ctx)return false;
    const melody=SCHOOL_MELODIES[kind]||SCHOOL_MELODIES.write;
    const when=ctx.currentTime+.012;
    try{
      melody.forEach((freq,i)=>tone(freq,when+i*.075,.12,.035,0,kind==='warning'?'triangle':'sine'));
      counts.set('cue:'+kind,(counts.get('cue:'+kind)||0)+1);
      return true;
    }catch(_){return false}
  }
  function tick(dt,{phase='',room='classroom',moving=false,studentMotion=false}={}){
    const seconds=Math.max(0,Math.min(.1,Number(dt)||0));
    if(!seconds)return;
    time+=seconds;
    const key=phase+'|'+room;
    if(key!==roomState){roomState=key;ambientWait=2.6;seatWait=6.4;footWait=.2}
    if(!enabled||paused||!ctx)return;
    if(moving){
      footWait-=seconds;
      if(footWait<=0){play(room==='gym'?'sneaker':'step',{volume:.75});footWait=.35}
    }else footWait=Math.max(0,footWait-seconds);
    const ambient=schoolAmbientKind(phase,room);
    if(ambient){
      ambientWait-=seconds;
      if(ambientWait<=0){
        play(ambient,{pan:(randomUnit()-.5)*1.2,volume:.5+randomUnit()*.25});
        ambientWait=(phase==='practice'?2.3:phase==='social'?4.8:5.5)+randomUnit()*2.7;
      }
    }
    if(studentMotion&&room!=='gym'&&phase!=='transition'){
      seatWait-=seconds;
      if(seatWait<=0){
        play('chair',{pan:(randomUnit()-.5)*1.2,volume:.55});
        seatWait=8+randomUnit()*5;
      }
    }
  }
  function setEnabled(value){
    enabled=!!value;
    if(master)master.gain.value=enabled&&!paused?.68:0;
    return enabled;
  }
  function setPaused(value){
    paused=!!value;
    if(master)master.gain.value=enabled&&!paused?.68:0;
  }
  return {
    unlock,play,cue,tick,setEnabled,setPaused,
    get enabled(){return enabled},
    get hasContext(){return !!ctx},
    get contextState(){return ctx?.state||'missing'},
    stats(){return Object.fromEntries(counts)}
  };
}
