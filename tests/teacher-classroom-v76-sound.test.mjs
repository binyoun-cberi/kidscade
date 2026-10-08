import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCHOOL_SOUNDS,SCHOOL_MELODIES,schoolAmbientKind,createSchoolSoundscape}
  from '../games/teacher-classroom-sim-prototype/school-soundscape.mjs';

function makeAudioClass(){
  const log=[];
  class MockAudioContext{
    constructor(){this.state='running';this.currentTime=0;this.sampleRate=24000;this.destination={};}
    createGain(){return {gain:parameter(),connect(){}}}
    createOscillator(){const n=node('oscillator');n.frequency=parameter();return n;}
    createBiquadFilter(){const n=node('filter');n.frequency=parameter();n.Q={value:0};return n;}
    createBuffer(channels,length){const arr=new Float32Array(length);return {getChannelData(){return arr}}}
    createBufferSource(){const n=node('noise');n.buffer=null;return n;}
    createStereoPanner(){const n=node('stereo');n.pan={value:0};return n;}
    resume(){this.state='running';return Promise.resolve()}
  }
  function parameter(){return {value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}}}
  function node(type){return {type,connect(){},start(){log.push(type)},stop(){}}}
  return {MockAudioContext,log};
}
const source=(name)=>readFileSync(new URL('../games/teacher-classroom-sim-prototype/'+name,import.meta.url),'utf8');

test('school Foley catalog includes quiet pencil, footsteps, paper, questions, and chairs',()=>{
  const needed=['step','pencil','chalk','paper','chair','whisper','dish','sneaker','door','question','answer','attention','offTask','alert','group','tick'];
  for(const kind of needed){
    const e=SCHOOL_SOUNDS[kind];assert.ok(e,kind);
    assert.ok(e.level>0&&e.level<=.07,kind+' too loud');
    assert.ok(e.interval>=.1&&e.duration<=.4,kind+' unbounded');
  }
  assert.ok(SCHOOL_MELODIES.recap.length>=3);
});

test('activity phase and room choose appropriate ambience while transitions stay quiet',()=>{
  assert.equal(schoolAmbientKind('explain'),'chalk');
  assert.equal(schoolAmbientKind('practice'),'pencil');
  assert.equal(schoolAmbientKind('recap'),'chalk');
  assert.equal(schoolAmbientKind('social'),'whisper');
  assert.equal(schoolAmbientKind('social','cafeteria'),'dish');
  assert.equal(schoolAmbientKind('practice','gym'),'sneaker');
  assert.equal(schoolAmbientKind('transition'),null);
});

test('Web Audio only starts after user gesture; mute and pause silence all Foley',()=>{
  const {MockAudioContext,log}=makeAudioClass();
  const s=createSchoolSoundscape({contextFactory:MockAudioContext,random:()=>.5});
  assert.equal(s.hasContext,false);
  assert.equal(s.play('question'),false);
  assert.equal(log.length,0);
  assert.equal(s.unlock(),true);
  assert.equal(s.hasContext,true);
  assert.equal(s.play('question'),true);
  assert.equal(s.play('question'),false,'rapid repeat must be throttled');
  const first=log.length;
  s.setEnabled(false);
  s.tick(5,{phase:'practice'});
  assert.equal(s.play('paper'),false);
  assert.equal(s.cue('recap'),false);
  assert.equal(log.length,first);
  s.setEnabled(true);
  s.setPaused(true);
  assert.equal(s.play('answer'),false);
  s.setPaused(false);
  assert.equal(s.play('answer'),true);
  assert.ok(log.length>first);
});

test('120 seconds of active class produce intermittent ambience, not a wall of sound',()=>{
  const {MockAudioContext,log}=makeAudioClass();
  const s=createSchoolSoundscape({contextFactory:MockAudioContext,random:()=>.38});
  s.unlock();
  for(let i=0;i<2400;i++)s.tick(.05,{phase:'practice',room:'classroom',moving:i>=400&&i<550,studentMotion:true});
  const counts=s.stats();
  assert.ok(counts.pencil>=15&&counts.pencil<=55,'natural sparse scribbling '+counts.pencil);
  assert.ok(counts.chair>=5&&counts.chair<=20,'occasional chair sound '+counts.chair);
  assert.ok(counts.step>=5&&counts.step<=35,'limited footsteps '+counts.step);
  assert.ok(log.length<155,'too many simultaneous Foley voices '+log.length);
});

test('school game wires audio to interactions, movement, and persistent mute',()=>{
  const html=source('index.html'),js=source('school-day-game.js'),css=source('style.css');
  assert.match(html,/id="soundButton"/);
  assert.match(html,/school-day-game\.js\?v=76/);
  assert.match(js,/SOUND_PREF_KEY='kidscade_teacher_sound_muted_v1'/);
  assert.match(js,/soundscape\.play\('question'\)/);
  assert.match(js,/soundscape\.play\('answer'\)/);
  assert.match(js,/soundscape\.play\('door'\)/);
  assert.match(js,/soundscape\.play\('whisper'/);
  assert.match(js,/soundscape\.tick\(dt,/);
  assert.match(js,/soundscape\.unlock\(\)/);
  assert.match(js,/soundscape\.setPaused\(true\)/);
  assert.match(js,/for\(const el of \[ui\.bell,ui\.talk,ui\.fight,ui\.ambience\]\)/);
  assert.match(css,/#soundButton:focus-visible/);
});
