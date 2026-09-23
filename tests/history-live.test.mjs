import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { QUESTIONS, MAX_PLAYERS } from '../worker/history-live.mjs';
import { QUESTION_BANK, CORE_HISTORY_FACTS, QUESTION_BANK_SIZE, ERA_ORDER, normalizeEraSelection, pickHistoryQuestions, chronologicalQuestionIndexes } from '../data/history-live-question-bank.mjs';

test('history live supports a full classroom', () => {
  assert.equal(MAX_PLAYERS, 26);
});

test('history question bank has at least one thousand playable questions', () => {
  assert.ok(Array.isArray(QUESTION_BANK));
  assert.ok(QUESTION_BANK_SIZE >= 1000, 'question bank should contain at least 1000 questions');
  assert.equal(QUESTION_BANK_SIZE, QUESTION_BANK.length);
  assert.ok(CORE_HISTORY_FACTS.length >= 1000, 'source fact pool itself must contain at least 1000 independent history facts');
  for (const [index, q] of QUESTION_BANK.entries()) {
    assert.equal(typeof q.q, 'string', 'question '+index+' needs text');
    assert.equal(typeof q.era, 'string', 'question '+index+' needs an era');
    assert.ok(Array.isArray(q.o), 'question '+index+' needs options');
    const expectedOptions = q.family === 'ox' ? 2 : 4;
    assert.equal(q.o.length, expectedOptions, 'question '+index+' has the wrong option count');
    assert.equal(new Set(q.o).size, expectedOptions, 'question '+index+' options must be unique');
    assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < expectedOptions, 'question '+index+' needs a valid answer index');
    assert.equal(typeof q.e, 'string', 'question '+index+' needs an explanation');
    assert.ok(q.e.length >= 10, 'question '+index+' explanation is too short');
  }
});

test('worker uses shared bank, supports 40 questions, and has ranking checkpoints', () => {
  const worker = fs.readFileSync(new URL('../worker/history-live.mjs', import.meta.url), 'utf8');
  assert.match(worker, /QUESTION_BANK/);
  assert.match(worker, /clampInt\(body\.questionCount,5,40,15\)/);
  assert.match(worker, /normalizeCheckpoints/);
  assert.match(worker, /status='checkpoint'/);
  assert.match(worker, /\/api\/history-live\/continue/);
  assert.doesNotMatch(worker, /\/api\/history-live\/solo/);
  assert.doesNotMatch(worker, /createSoloRoom/);
});

test('solo practice runs locally while live mode keeps server play', () => {
  const html = fs.readFileSync(new URL('../games/high_history_timebattle/history_timebattle.html', import.meta.url), 'utf8');
  assert.match(html, /혼자 연습 · 바로 시작/);
  assert.match(html, /import\('\.\.\/\.\.\/data\/history-live-question-bank\.mjs'\)/);
  assert.match(html, /pickHistoryQuestions/);
  assert.match(html, /function submitSoloAnswer/);
  assert.match(html, /function soloNext/);
  assert.doesNotMatch(html, /api\('\/solo'/);
  assert.match(html, /<option>40<\/option>/);
  assert.match(html, /checkpointMode/);
  assert.match(html, /hostContinue/);
  assert.match(html, /현재 .*등|현재 \+'등'/);
});


test('chronological mode spans the full timeline without repeating a core fact', () => {
  const picked = pickHistoryQuestions(40, () => 0.42, 'chronological');
  assert.equal(picked.length, 40);
  assert.equal(new Set(picked.map(q => q.sourceFact)).size, 40);
  const eraPositions = picked.map(q => ERA_ORDER.indexOf(q.era));
  for (let i = 1; i < eraPositions.length; i += 1) {
    assert.ok(eraPositions[i] >= eraPositions[i - 1], 'eras must never go backwards');
  }
  assert.equal(picked[0].era, '선사');
  assert.equal(picked.at(-1).era, '6·25 전쟁');
  const indexes = chronologicalQuestionIndexes(40);
  assert.equal(indexes.length, 40);
  assert.equal(new Set(indexes.map(i => QUESTION_BANK[i].sourceFact)).size, 40);
});

test('mobile quiz controls are touch friendly and both play modes expose chronology choice', () => {
  const html = fs.readFileSync(new URL('../games/high_history_timebattle/history_timebattle.html', import.meta.url), 'utf8');
  assert.match(html, /touch-action:manipulation/);
  assert.match(html, /@media\(hover:none\) and \(pointer:coarse\)/);
  assert.match(html, /id="orderMode"/);
  assert.match(html, /id="soloOrderMode"/);
  assert.match(html, /value="chronological"/);
  assert.match(html, /pickHistoryQuestions\(count,Math\.random,orderMode,questionMode,eras\)/);
});

test('live server records chronology mode in the room plan', () => {
  const worker = fs.readFileSync(new URL('../worker/history-live.mjs', import.meta.url), 'utf8');
  assert.match(worker, /chronologicalQuestionIndexes/);
  assert.match(worker, /orderMode=body\.orderMode==='chronological'/);
  assert.match(worker, /plan=\{questions:order,checkpoints,orderMode,questionMode,eras,scoreMode,round:1\}/);
});


test('direct timeline facts stay playable and have unique answer choices', () => {
  const direct = CORE_HISTORY_FACTS.filter(f => f.direct);
  assert.ok(direct.length >= 800, 'timeline expansion should add hundreds of independent date/order facts');
  for (const [index, fact] of direct.entries()) {
    assert.equal(typeof fact.q, 'string', 'direct fact '+index+' needs a question');
    assert.ok(Array.isArray(fact.o), 'direct fact '+index+' needs options');
    assert.equal(fact.o.length, 4);
    assert.equal(new Set(fact.o).size, 4);
    assert.ok(Number.isInteger(fact.a) && fact.a >= 0 && fact.a < 4);
    assert.equal(typeof fact.e, 'string');
  }
});


test('history timebattle exits through the parent launcher instead of nesting Kidscade', () => {
  const html = fs.readFileSync(new URL('../games/high_history_timebattle/history_timebattle.html', import.meta.url), 'utf8');
  assert.match(html, /function exitKidscade\(\)/);
  assert.match(html, /kidscade:close-game/);
  assert.match(html, /window\.parent\.postMessage/);
  assert.doesNotMatch(html, /href="\.\.\/\.\.\/index\.html"/);
});


test('OX bank covers the source fact pool and keeps both O and X answers', () => {
  const ox = QUESTION_BANK.filter(q => q.family === 'ox');
  assert.ok(ox.length >= 1000, 'OX mode needs a large independent pool');
  assert.ok(ox.filter(q => q.a === 0).length > 400, 'O answers should be common');
  assert.ok(ox.filter(q => q.a === 1).length > 400, 'X answers should be common');
  for (const q of ox.slice(0, 100)) {
    assert.deepEqual(q.o, ['O','X']);
  }
  const picked = pickHistoryQuestions(40, () => 0.37, 'random', 'ox');
  assert.equal(picked.length, 40);
  assert.ok(picked.every(q => q.family === 'ox'));
  const mixed = pickHistoryQuestions(40, () => 0.37, 'random', 'mixed');
  assert.ok(mixed.some(q => q.family === 'ox'));
  assert.ok(mixed.some(q => q.family !== 'ox'));
});

test('multiple-choice distractors prefer the same era and same category', () => {
  const candidates = CORE_HISTORY_FACTS
    .map((fact,index)=>({fact,index}))
    .filter(({fact,index}) => !fact.direct && CORE_HISTORY_FACTS.filter((other,j)=>j!==index&&!other.direct&&other.era===fact.era&&other.type===fact.type).length >= 3);
  assert.ok(candidates.length > 0);
  for (const {fact,index} of candidates.slice(0, 20)) {
    const q = QUESTION_BANK.find(item => item.sourceFact === index && item.family === 'identify');
    assert.ok(q);
    const optionFacts = q.o.map(term => CORE_HISTORY_FACTS.find(other => !other.direct && other.term === term)).filter(Boolean);
    assert.equal(optionFacts.length, 4);
    assert.ok(optionFacts.every(other => other.era === fact.era), 'all four choices should stay in '+fact.era+' when enough peers exist');
  }
});

test('history live UI exposes choice OX and mixed modes', () => {
  const html = fs.readFileSync(new URL('../games/high_history_timebattle/history_timebattle.html', import.meta.url), 'utf8');
  assert.match(html, /id="questionMode"/);
  assert.match(html, /id="soloQuestionMode"/);
  assert.match(html, /value="ox"/);
  assert.match(html, /value="mixed"/);
  assert.match(html, /answers\.ox/);
  assert.match(html, /questionMode:\$\('questionMode'\)\.value/);
});

test('history live server supports two-choice OX answers', () => {
  const worker = fs.readFileSync(new URL('../worker/history-live.mjs', import.meta.url), 'utf8');
  assert.match(worker, /questionMode/);
  assert.match(worker, /q\.family==='ox'\?\[0,1\]/);
  assert.match(worker, /raw>=q\.o\.length/);
  assert.match(worker, /Array\.from\(\{length:q\.o\.length\}/);
});


test('era filtering keeps every picked question inside the selected teaching eras', () => {
  const eras=['고려','조선 전기'];
  const picked=pickHistoryQuestions(40,()=>0.31,'random','mixed',eras);
  assert.equal(picked.length,40);
  assert.ok(picked.every(q=>eras.includes(q.era)));
  const chronological=pickHistoryQuestions(40,()=>0.31,'chronological','choice',['조선 후기']);
  assert.equal(chronological.length,40);
  assert.ok(chronological.every(q=>q.era==='조선 후기'));
  assert.deepEqual(normalizeEraSelection(['고려','고려','없는 시대']),['고려']);
});

test('live server can reconfigure the same room for later rounds', () => {
  const worker=fs.readFileSync(new URL('../worker/history-live.mjs',import.meta.url),'utf8');
  assert.match(worker,/\/api\/history-live\/reconfigure/);
  assert.match(worker,/async function reconfigureRoom/);
  assert.match(worker,/DELETE FROM history_live_answers WHERE room_id=\?/);
  assert.match(worker,/status='waiting'/);
  assert.match(worker,/scoreMode==='cumulative'/);
  assert.match(worker,/previous\.round\+1/);
  assert.match(worker,/eras:plan\.eras/);
});

test('teacher UI supports era selection presets and same-room next rounds', () => {
  const html=fs.readFileSync(new URL('../games/high_history_timebattle/history_timebattle.html',import.meta.url),'utf8');
  assert.match(html,/id="hostEraPicker"/);
  assert.match(html,/id="soloEraPicker"/);
  assert.match(html,/id="roundEraPicker"/);
  assert.match(html,/같은 방에서 다음 판/);
  assert.match(html,/function openRoundSetup\(\)/);
  assert.match(html,/async function saveRoundSetup\(\)/);
  assert.match(html,/점수 계속 누적/);
  assert.match(html,/applyHostPreset\('quick'\)/);
  assert.match(html,/applyRoundPreset\('challenge'\)/);
  assert.match(html,/selectedEras\('hostEraPicker'\)/);
  assert.match(html,/pickHistoryQuestions\(count,Math\.random,orderMode,questionMode,eras\)/);
});


test('small era selections still fill the requested round length without leaving the era', () => {
  const picked=pickHistoryQuestions(40,()=>0.17,'chronological','mixed',['6·25 전쟁']);
  assert.equal(picked.length,40);
  assert.ok(picked.every(q=>q.era==='6·25 전쟁'));
});


test('history timebattle uses shared asset-backed audio and visual feedback', () => {
  const html=fs.readFileSync(new URL('../games/high_history_timebattle/history_timebattle.html',import.meta.url),'utf8');
  assert.match(html,/audio-manager\.js/);
  assert.match(html,/KidscadeAudio/);
  assert.match(html,/playSfx\('ui\.tick'/);
  assert.match(html,/playSfx\(ok\?'correct':'wrong'/);
  assert.match(html,/playSfx\('victory'/);
  assert.match(html,/function confettiFx/);
  assert.match(html,/fx-correct/);
  assert.match(html,/fx-wrong/);
  assert.match(html,/fx-rise/);
  assert.match(html,/prefers-reduced-motion/);
  assert.match(html,/id="soundToggle"/);
});

test('shared audio catalog exposes history UI assets', () => {
  const catalog=JSON.parse(fs.readFileSync(new URL('../assets/audio/audio-catalog.json',import.meta.url),'utf8'));
  for(const key of ['ui.click','ui.confirm','ui.error','ui.tick','ui.open','ui.select']){
    assert.ok(Array.isArray(catalog.sounds[key])&&catalog.sounds[key].length>0,key+' must have an asset');
    assert.ok(catalog.sounds[key].every(path=>path.includes('history_royale/audio/ui/kenney_interface/')));
  }
});

test('history timebattle inline game script parses', () => {
  const html=fs.readFileSync(new URL('../games/high_history_timebattle/history_timebattle.html',import.meta.url),'utf8');
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
  assert.ok(scripts.length>0);
  for(const script of scripts)new Function(script);
});


test('question phase does not leak the era before reveal', () => {
  const worker=fs.readFileSync(new URL('../worker/history-live.mjs',import.meta.url),'utf8');
  const html=fs.readFileSync(new URL('../games/high_history_timebattle/history_timebattle.html',import.meta.url),'utf8');
  assert.match(worker,/fresh\.status==='reveal'\?\{era:q\.era\}:\{\}/);
  assert.match(worker,/payload\.reveal=\{answerIndex:display\.answerIndex,era:q\.era/);
  assert.match(html,/qEra'\)\.textContent='시대 비공개'/);
  assert.match(html,/revealEra'\)\.textContent=r\.era\|\|q\.era/);
});

test('generated history text avoids placeholder Korean particles', () => {
  for (const [index,q] of QUESTION_BANK.entries()) {
    const text=q.q+' '+q.e;
    for (const bad of ['은(는)','이(가)','과(와)','을(를)']) {
      assert.ok(!text.includes(bad),'question '+index+' contains awkward particle '+bad);
    }
  }
});

test('verified modern-history date corrections stay fixed', () => {
  const bank=fs.readFileSync(new URL('../data/history-live-question-bank.mjs',import.meta.url),'utf8');
  assert.match(bank,/"name": "통감부 설치",[\s\S]{0,90}"date": "1906년 2월"/);
  assert.match(bank,/"name": "고종 강제 퇴위",[\s\S]{0,90}"date": "1907년 7월"/);
  assert.match(bank,/"name": "대한 제국 군대 해산",[\s\S]{0,90}"date": "1907년 8월"/);
  assert.match(bank,/return ay<by;/);
});

test('regular false OX uses another concrete fact instead of a neighboring-era guess', () => {
  const falseOx=QUESTION_BANK.filter(q=>q.family==='ox'&&q.a===1&&!q.id.startsWith('ox-direct-'));
  assert.ok(falseOx.length>40);
  assert.ok(falseOx.every(q=>q.q.includes('다음 설명은')));
  assert.ok(falseOx.every(q=>!q.q.includes('가장 관련 깊다')));
});


test('live polling avoids overlapping requests and backs off on bad networks', () => {
  const html=fs.readFileSync(new URL('../games/high_history_timebattle/history_timebattle.html',import.meta.url),'utf8');
  assert.doesNotMatch(html,/setInterval\(poll,750\)/);
  assert.match(html,/pollInFlight/);
  assert.match(html,/function schedulePoll/);
  assert.match(html,/function pollingDelay/);
  assert.match(html,/AbortController/);
  assert.match(html,/timeoutMs=6500/);
  assert.match(html,/terminalFailures>=3/);
  assert.match(html,/window\.addEventListener\('online'/);
  assert.match(html,/visibilitychange/);
});

test('live server throttles heartbeat writes and supports active-room reconnects', () => {
  const worker=fs.readFileSync(new URL('../worker/history-live.mjs',import.meta.url),'utf8');
  assert.match(worker,/ONLINE_WINDOW_MS = 20000/);
  assert.match(worker,/HEARTBEAT_WRITE_MS = 7000/);
  assert.match(worker,/RECONNECT_RECLAIM_MS = 12000/);
  assert.doesNotMatch(worker,/if\(room\.status!=='waiting'\)return json\(\{ok:false,error:'room_already_started'/);
  assert.match(worker,/exactReconnect/);
  assert.match(worker,/reconnected:true/);
  assert.match(worker,/reconnected:false/);
});

test('state polling no longer runs two answer-count queries on every request', () => {
  const worker=fs.readFileSync(new URL('../worker/history-live.mjs',import.meta.url),'utf8');
  assert.match(worker,/LEFT JOIN history_live_answers/);
  assert.match(worker,/now-seen>=HEARTBEAT_WRITE_MS/);
  const auto=worker.slice(worker.indexOf('async function autoReveal'),worker.indexOf('async function revealIfEveryoneAnswered'));
  assert.doesNotMatch(auto,/SELECT COUNT/);
  assert.match(auto,/question_deadline_at/);
});

test('answer submission is safe to retry after a lost response', () => {
  const worker=fs.readFileSync(new URL('../worker/history-live.mjs',import.meta.url),'utf8');
  const html=fs.readFileSync(new URL('../games/high_history_timebattle/history_timebattle.html',import.meta.url),'utf8');
  assert.match(worker,/duplicate:true/);
  assert.match(worker,/SELECT option_index,is_correct,points FROM history_live_answers/);
  assert.match(worker,/revealIfEveryoneAnswered/);
  assert.match(html,/api\('\/answer',[\s\S]{0,260}\},1\)/);
});

test('connection recovery keeps room and nickname instead of hard reloading immediately', () => {
  const html=fs.readFileSync(new URL('../games/high_history_timebattle/history_timebattle.html',import.meta.url),'utf8');
  assert.match(html,/function recoverToJoin/);
  assert.match(html,/pendingReconnectPlayerId/);
  assert.match(html,/playerId:pendingReconnectPlayerId\|\|undefined/);
  assert.match(html,/다시 연결 필요/);
});


test('answer retries cannot spill into the next question', () => {
  const worker=fs.readFileSync(new URL('../worker/history-live.mjs',import.meta.url),'utf8');
  const html=fs.readFileSync(new URL('../games/high_history_timebattle/history_timebattle.html',import.meta.url),'utf8');
  assert.match(worker,/requestedQi/);
  assert.match(worker,/requestedQi!==currentQi/);
  assert.match(worker,/stale_question/);
  assert.match(html,/questionIndex:Math\.max\(0,Number\(lastState\?\.room\?\.questionNumber\|\|1\)-1\)/);
});
