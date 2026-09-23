import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createState, addOrReconnect, snapshot, setReady, startMatch, advanceDeadline,
  validateSubmission, applySubmission, leaveMatch, TURN_MS
} from '../worker/wordchain-room-model.mjs';

const now=1_800_000_000_000;
const make=()=>{
  const s=createState('0ABCDE',{id:'host',nickname:'방장'},'h'.repeat(64),4,now,7);
  addOrReconnect(s,{id:'p2',nickname:'둘'},'2'.repeat(64),now+1);
  addOrReconnect(s,{id:'p3',nickname:'셋'},'3'.repeat(64),now+2);
  return s;
};

test('new wordchain v2 rooms keep all realtime state outside D1-shaped tables',()=>{
  const s=make();
  assert.equal(s.code,'0ABCDE');
  assert.equal(s.players.length,3);
  assert.equal(s.status,'waiting');
  assert.deepEqual(s.usedWords,[]);
  assert.deepEqual(s.actions,{});
  assert.equal('room_id' in s,false);
});

test('joining resets readiness and supports authenticated reconnect without adding a duplicate player',()=>{
  const s=createState('0ABCDE',{id:'host',nickname:'방장'},'h'.repeat(64),2,now,1);
  assert.equal(s.players[0].ready,true);
  addOrReconnect(s,{id:'p2',nickname:'둘'},'2'.repeat(64),now+1);
  assert.ok(s.players.every(p=>p.ready===false));
  const before=s.players.length;
  const r=addOrReconnect(s,{id:'p2',nickname:'둘-재접속'},'4'.repeat(64),now+2);
  assert.equal(r.reconnected,true);
  assert.equal(s.players.length,before);
  assert.equal(s.players.find(p=>p.id==='p2').nickname,'둘-재접속');
  assert.equal(s.players.find(p=>p.id==='p2').tokenHash,'4'.repeat(64));
});

test('three-player rooms require everyone ready and start with one durable server deadline',()=>{
  const s=make();
  assert.throws(()=>startMatch(s,'host',now+10),/players_not_ready/);
  for(const p of s.players)setReady(s,p.id,true,now+11);
  startMatch(s,'host',now+12);
  assert.equal(s.status,'playing');
  assert.ok(s.currentWord.length>=2);
  assert.ok(s.usedWords.includes(s.currentWord));
  assert.equal(s.turnDeadline-s.startAt,TURN_MS);
  assert.equal(s.history.at(-1).kind,'starter');
});

test('deadline expiry is server-authoritative, removes one life and advances the turn once',()=>{
  const s=make();for(const p of s.players)setReady(s,p.id,true,now+1);startMatch(s,'host',now+2);
  const slot=s.currentSlot;
  const player=s.players.find(p=>p.slot===slot);
  const deadline=s.turnDeadline;
  assert.equal(advanceDeadline(s,deadline-1),false);
  assert.equal(advanceDeadline(s,deadline),true);
  assert.equal(player.lives,2);
  assert.notEqual(s.currentSlot,slot);
  assert.equal(s.history.at(-1).kind,'timeout');
  assert.equal(advanceDeadline(s,deadline+1),false);
});

test('submissions are turn-bound, idempotent and one-shot penalties are committed once',()=>{
  const s=createState('0ABCDE',{id:'host',nickname:'방장'},'h'.repeat(64),2,now,1);
  addOrReconnect(s,{id:'p2',nickname:'둘'},'2'.repeat(64),now+1);
  s.status='playing';s.startAt=now-100;s.currentWord='기차';s.usedWords=['기차'];s.currentSlot=1;s.turnDeadline=now+TURN_MS;
  const check=validateSubmission(s,'host',{word:'차표',actionId:'action-0001'},now);
  const result=applySubmission(s,check,false,now);
  assert.equal(result.oneShot,true);
  assert.ok(s.usedWords.includes('차표'));
  assert.equal(s.players.find(p=>p.id==='p2').lives,2);
  const duplicate=validateSubmission(s,'host',{word:'차표',actionId:'action-0001'},now+1);
  assert.equal(duplicate.duplicate,true);
  assert.equal(duplicate.result.oneShot,true);
  assert.equal(s.players.find(p=>p.id==='p2').lives,2);
});

test('wrong turn and wrong initial are rejected before dictionary work',()=>{
  const s=createState('0ABCDE',{id:'host',nickname:'방장'},'h'.repeat(64),2,now,1);
  addOrReconnect(s,{id:'p2',nickname:'둘'},'2'.repeat(64),now+1);
  s.status='playing';s.startAt=now-100;s.currentWord='기차';s.usedWords=['기차'];s.currentSlot=1;s.turnDeadline=now+TURN_MS;
  assert.throws(()=>validateSubmission(s,'p2',{word:'차표',actionId:'action-0002'},now),/not_your_turn/);
  assert.throws(()=>validateSubmission(s,'host',{word:'사과',actionId:'action-0003'},now),/wrong_initial/);
});

test('leaving a live room eliminates the player without requiring browser unload writes',()=>{
  const s=make();for(const p of s.players)setReady(s,p.id,true,now+1);startMatch(s,'host',now+2);
  const leaving=s.players.find(p=>p.slot===s.currentSlot);
  const out=leaveMatch(s,leaving.id,now+3);
  assert.equal(out.left,true);
  assert.equal(leaving.lives,0);
  assert.equal(s.history.at(-1).kind,'leave');
  assert.notEqual(s.currentSlot,leaving.slot);
});

test('room snapshots preserve the old UI contract while online state comes from sockets',()=>{
  const s=make();
  const view=snapshot(s,{id:'host'},new Set(['p2']),now+10);
  assert.equal(view.id,'0ABCDE');
  assert.equal(view.code,'0ABCDE');
  assert.equal(view.self.isHost,true);
  assert.equal(view.players.find(p=>p.nickname==='둘').online,true);
  assert.equal(view.minPlayers,3);
});
