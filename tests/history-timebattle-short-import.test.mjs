import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { IMPORTED_HISTORY_QUIZ } from '../data/history-timebattle-imported-quiz.mjs';
import { QUESTION_BANK, pickHistoryQuestions, ERA_ORDER } from '../data/history-live-question-bank.mjs';
import { createState,addPlayer,hostCommand,answer,snapshot,gradeHistoryShortAnswer } from '../worker/history-room-model.mjs';

test('reviewed worksheet questions are distinct, traceable and assigned to real periods',()=>{
 assert.ok(IMPORTED_HISTORY_QUIZ.length>=180);
 const ids=new Set();
 for(const q of IMPORTED_HISTORY_QUIZ){
  assert.ok(!ids.has(q.id),q.id);ids.add(q.id);
  assert.ok(ERA_ORDER.includes(q.era),q.id);
  assert.ok(q.q.endsWith('?'),q.id);
  assert.ok(q.answer.length>=2,q.id);
  assert.match(q.source,/역사 퀴즈 [12]회/);
 }
 assert.equal(IMPORTED_HISTORY_QUIZ.find(x=>x.id==='set1-042')?.answer,'을미사변');
 assert.equal(IMPORTED_HISTORY_QUIZ.find(x=>x.id==='set2-083')?.answer,'최충헌');
 assert.equal(IMPORTED_HISTORY_QUIZ.some(x=>x.id==='set2-097'),false);
});

test('source worksheets add actual choice and short questions rather than filler',()=>{
 for(const item of IMPORTED_HISTORY_QUIZ){
  const choice=QUESTION_BANK.find(q=>q.id==='worksheet-'+item.id);
  const short=QUESTION_BANK.find(q=>q.id==='short-worksheet-'+item.id);
  assert.ok(choice,item.id);
  assert.ok(short,item.id);
  assert.equal(choice.q,item.q);
  assert.equal(short.o[short.a],item.answer);
  assert.equal(short.family,'short');
  assert.equal(choice.o.length,4);
  assert.equal(new Set(choice.o).size,4);
 }
 for(const mode of ['choice','ox','mixed','short']){
  for(const era of ['삼국','고려','조선 후기','일제강점기']){
   const picked=pickHistoryQuestions(10,Math.random,'random',mode,[era]);
   assert.equal(picked.length,10,mode+': '+era);
   if(mode==='short')assert.ok(picked.every(q=>q.family==='short'));
   else assert.ok(picked.every(q=>q.family!=='short'));
  }
 }
});

test('short answer grading accepts benign writing differences, but not wrong names',()=>{
 assert.equal(gradeHistoryShortAnswer(' 을사 조약 ',['을사늑약','을사조약']),true);
 assert.equal(gradeHistoryShortAnswer(' 4.19 혁명 ',['4·19 혁명']),true);
 assert.equal(gradeHistoryShortAnswer('1962',['1962년']),true);
 assert.equal(gradeHistoryShortAnswer('정약용',['정약용']),true);
 assert.equal(gradeHistoryShortAnswer('정약영',['정약용']),false);
 assert.equal(gradeHistoryShortAnswer('',['정약용']),false);
 assert.equal(gradeHistoryShortAnswer('가'.repeat(41),['정약용']),false);
});

test('live short rooms accept private typed answers, reveal only after submissions and prevent double scoring',()=>{
 const now=Date.now();
 const state=createState('0SHORT','host',{questionMode:'short',eras:['일제강점기'],secondsPerQuestion:20,questionCount:10},now);
 assert.equal(state.questionMode,'short');
 assert.ok(state.questions.every(q=>q.family==='short'));
 addPlayer(state,'학생1','a',now);addPlayer(state,'학생2','b',now);
 hostCommand(state,'start',{requestId:'begin',roundId:state.roundId,version:state.version},now);
 const q=state.questions[0],correct=q.o[q.a];
 const visible=snapshot(state,{role:'player',id:state.players[0].id},now);
 assert.deepEqual(visible.question.options,[]);
 assert.equal(visible.question.kind,'short');
 assert.equal(visible.question.answerText,undefined);
 answer(state,state.players[0].id,{roundId:state.roundId,questionIndex:0,inputText:correct},now+200);
 const before=snapshot(state,{role:'player',id:state.players[1].id},now+200);
 assert.equal(before.reveal,undefined);
 assert.equal(JSON.stringify(before).includes(correct),false,'other players must not see a submitted correct string');
 answer(state,state.players[1].id,{roundId:state.roundId,questionIndex:0,inputText:'오답예시'},now+500);
 assert.equal(state.status,'reveal');
 const first=snapshot(state,{role:'player',id:state.players[0].id},now+600);
 const second=snapshot(state,{role:'player',id:state.players[1].id},now+600);
 const teacher=snapshot(state,{role:'host',id:'host'},now+600);
 assert.equal(first.reveal.answerText,correct);
 assert.equal(first.reveal.myCorrect,true);
 assert.equal(second.reveal.myAnswer,'오답예시');
 assert.equal(second.reveal.myCorrect,false);
 assert.equal(teacher.reveal.myAnswer,undefined);
 assert.equal(first.reveal.optionStats.length,0);
 assert.equal(answer(state,state.players[0].id,{roundId:state.roundId,questionIndex:0,inputText:'다른 답'},now+700).duplicate,true);
});

test('all three game setups expose short-answer UI, retaining existing mixed solo mode',()=>{
 const html=fs.readFileSync(new URL('../games/high_history_timebattle/history_timebattle.html',import.meta.url),'utf8');
 assert.equal((html.match(/<option value="short">/g)||[]).length,3);
 assert.match(html,/function submitLiveShortAnswer/);
 assert.match(html,/function submitSoloShortAnswer/);
 assert.match(html,/value="choice-short"/);
 assert.match(html,/window\.__historyShortDraft/);
});
