import { QUESTION_BANK, ERA_ORDER, normalizeEraSelection, chronologicalQuestionIndexes } from '../data/history-live-question-bank.mjs';
import { randomQuestionIndexes, normalizeCheckpoints, displayedQuestion } from './history-live.mjs';

export const MAX_PLAYERS = 26;
export const ROOM_TTL = 6 * 60 * 60 * 1000;
const int = (v, lo, hi, fallback) => Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Math.floor(Number(v)))) : fallback;
export function fail(code, status = 409) { throw Object.assign(new Error(code), { status }); }
export function settings(body = {}) {
  const questionCount = int(body.questionCount, 5, 40, 15);
  const questionMode = ['ox','mixed'].includes(body.questionMode) ? body.questionMode : 'choice';
  const eras = normalizeEraSelection(body.eras || ERA_ORDER);
  const orderMode = body.orderMode === 'chronological' ? 'chronological' : 'random';
  const indexes = orderMode === 'chronological' ? chronologicalQuestionIndexes(questionCount, questionMode, eras) : randomQuestionIndexes(questionCount, questionMode, eras);
  return { questionCount, secondsPerQuestion: int(body.secondsPerQuestion, 8, 30, 12), questionMode, eras, orderMode,
    checkpoints: normalizeCheckpoints(questionCount, body), scoreMode: body.scoreMode === 'cumulative' ? 'cumulative' : 'reset',
    // Pin question contents so deployments cannot change an ongoing round's answers.
    questions: indexes.map(i => structuredClone(QUESTION_BANK[i])) };
}
export function createState(code, hostHash, body, now) {
  return { schema: 1, id: crypto.randomUUID(), code, hostHash, ...settings(body), round: 1,
    roundId: crypto.randomUUID(), status: 'waiting', qi: -1, version: 1, createdAt: now, expiresAt: now + ROOM_TTL,
    players: [], answers: {}, actions: {}, tickets: {}, outbox: [] };
}
export function roleFor(state, hash) {
  if (hash === state.hostHash) return { role: 'host', id: 'host' };
  const p = state.players.find(p => p.hash === hash);
  return p ? { role: 'player', id: p.id } : null;
}
export function addPlayer(state, nickname, hash, now) {
  if (state.status !== 'waiting') fail('room_already_started');
  if (state.players.length >= MAX_PLAYERS) fail('room_full');
  let name = String(nickname || '').replace(/[<>\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14) || '역사 탐험가';
  const names = new Set(state.players.map(p => p.nickname.toLowerCase()));
  const base = name.slice(0, 11); let suffix = 2;
  while (names.has(name.toLowerCase())) name = base + suffix++;
  const player = { id: crypto.randomUUID(), hash, nickname: name, score: 0, streak: 0, joinedAt: now };
  state.players.push(player); state.version++;
  return player;
}
function question(state) {
  const q = state.questions[state.qi];
  const display = q ? displayedQuestion({ id: state.roundId, current_question: state.qi }, q) : null;
  return { q, display };
}
export function advanceDeadline(state, now) {
  if (state.status === 'question' && now >= state.deadlineAt) {
    reveal(state); return true;
  }
  return false;
}
function reveal(state) {
  // Non-answers break the streak too. All changes are committed with the phase transition.
  for (const p of state.players) if (!state.answers[p.id]) p.streak = 0;
  state.status = 'reveal'; state.version++;
}
function beginQuestion(state, qi, now) {
  state.qi = qi; state.status = 'question'; state.startedAt = now;
  state.deadlineAt = now + state.secondsPerQuestion * 1000; state.answers = {};
  state.beforeQuestion = Object.fromEntries(state.players.map(p => [p.id, { score: p.score, streak: p.streak }]));
}
function queueResult(state, now) {
  const key = state.id + ':' + state.roundId;
  if (!state.outbox.some(x => x.key === key)) state.outbox.push({ key, round: state.round,
    roundId: state.roundId, createdAt: now, attempts: 0, retryAt: now + 1000,
    players: state.players.map(({id,nickname,score,streak}) => ({id,nickname,score,streak})) });
}
export function hostCommand(state, action, body, now) {
  if (!/^[\w-]{8,80}$/.test(body.requestId || '')) fail('request_id_required', 400);
  const prior = state.actions[body.requestId];
  if (prior) {
    if (prior.action !== action) fail('request_id_conflict');
    return { ok: true, duplicate: true };
  }
  if (body.roundId !== state.roundId || Number(body.version) !== state.version) fail('stale_state');
  if (action === 'start') {
    if (state.status !== 'waiting') fail('invalid_state');
    if (!state.players.length) fail('no_players');
    beginQuestion(state, 0, now);
  } else if (action === 'next') {
    if (state.status !== 'reveal') fail('reveal_not_ready');
    if (state.qi + 1 >= state.questionCount) {
      state.status = 'finished'; state.deadlineAt = null; queueResult(state, now);
    } else if (state.checkpoints.includes(state.qi + 1)) {
      state.status = 'checkpoint'; state.deadlineAt = null;
    } else beginQuestion(state, state.qi + 1, now);
  } else if (action === 'continue') {
    if (state.status !== 'checkpoint') fail('checkpoint_not_ready');
    beginQuestion(state, state.qi + 1, now);
  } else if (action === 'reconfigure') {
    if (!['waiting','finished'].includes(state.status)) fail('round_in_progress');
    if (state.outbox.length >= 8) fail('results_pending', 503);
    if (state.round >= 100) fail('round_limit');
    if (state.status === 'finished') state.round++;
    Object.assign(state, settings(body)); state.roundId = crypto.randomUUID();
    state.status = 'waiting'; state.qi = -1; state.answers = {}; state.deadlineAt = null;
    for (const p of state.players) { p.streak = 0; if (state.scoreMode === 'reset') p.score = 0; }
  } else if (action === 'close') {
    state.status = 'closed'; state.deadlineAt = null;
  } else fail('not_found', 404);
  state.expiresAt = now + ROOM_TTL; state.version++;
  state.actions[body.requestId] = { action };
  const keys = Object.keys(state.actions);
  if (keys.length > 256) delete state.actions[keys[0]];
  return { ok: true };
}
export function answer(state, playerId, body, now) {
  if (body.roundId !== state.roundId || !Number.isInteger(body.questionIndex) || body.questionIndex !== state.qi) fail('stale_question');
  const p = state.players.find(p => p.id === playerId);
  if (!p) fail('player_required', 403);
  const prior = state.answers[playerId];
  // Acknowledgements never reveal correctness or score, including retries after reveal.
  if (prior) return { ok: true, submitted: true, duplicate: true, optionIndex: prior.optionIndex };
  if (state.status !== 'question' || now >= state.deadlineAt) fail('answer_closed');
  const { q, display } = question(state), option = body.optionIndex;
  if (!Number.isInteger(option) || option < 0 || option >= q.o.length) fail('invalid_option', 400);
  const correct = option === display.answerIndex;
  const streak = correct ? p.streak + 1 : 0;
  const points = correct ? 1000 + Math.round(500 * Math.max(0, state.deadlineAt - now) / (state.deadlineAt - state.startedAt)) + Math.min(300, Math.max(0, streak - 1) * 100) : 0;
  state.answers[playerId] = { optionIndex: option, correct, points };
  p.score += points; p.streak = streak; state.version++;
  if (state.players.every(p => state.answers[p.id])) reveal(state);
  return { ok: true, submitted: true, duplicate: false, optionIndex: option };
}
export function snapshot(state, auth, now) {
  const hidden = state.status === 'question';
  const players = state.players.map(p => {
    const value = hidden ? state.beforeQuestion[p.id] : p;
    return { id:p.id, nickname:p.nickname, score:value?.score || 0, streak:value?.streak || 0,
      answered:Boolean(state.answers[p.id]) && (!hidden || auth.role === 'host' || auth.id === p.id), online:true };
  }).sort((a,b) => b.score - a.score).map((p,i) => ({...p,rank:i+1}));
  const out = { ok:true, transport:'v2', version:state.version, role:auth.role, selfPlayerId:auth.role === 'player' ? auth.id : null,
    room:{ code:state.code, status:state.status, maxPlayers:MAX_PLAYERS, questionNumber:state.qi+1, questionCount:state.questionCount,
      secondsPerQuestion:state.secondsPerQuestion, deadlineAt:state.deadlineAt ? new Date(state.deadlineAt).toISOString() : null,
      serverNow:new Date(now).toISOString(), checkpoints:state.checkpoints, orderMode:state.orderMode, questionMode:state.questionMode,
      eras:state.eras, scoreMode:state.scoreMode, round:state.round, roundId:state.roundId }, players };
  const { q, display } = question(state);
  if (q && ['question','reveal','finished'].includes(state.status)) out.question = {number:state.qi+1,total:state.questionCount,
    difficulty:q.difficulty,prompt:q.q,options:display.options,kind:q.family==='ox'?'ox':'choice'};
  if (q && state.status === 'reveal') {
    const answers = Object.values(state.answers), counts = q.o.map(() => 0);
    for (const a of answers) counts[a.optionIndex]++;
    out.reveal = {answerIndex:display.answerIndex,era:q.era,explanation:q.e,optionStats:counts,answeredCount:answers.length,correctCount:answers.filter(a=>a.correct).length};
  }
  if (state.status === 'checkpoint') out.checkpoint = {afterQuestion:state.qi+1,nextQuestion:state.qi+2,totalPlayers:players.length};
  if (state.status === 'finished') out.results = players;
  return out;
}
