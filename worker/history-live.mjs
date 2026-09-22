const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin'
});

const PREFIX = '/api/history-live/';
const MAX_PLAYERS = 26;
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const ONLINE_WINDOW_MS = 8000;
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const QUESTIONS = Object.freeze([
  { era:'선사', difficulty:1, q:'신석기 시대 사람들의 생활 모습을 보여 주는 대표적인 유물은 무엇일까요?', o:['빗살무늬 토기','고려청자','측우기','금속활자'], a:0, e:'빗살무늬 토기는 신석기 시대의 대표적인 유물로, 당시 사람들이 한곳에 머물러 생활하며 음식을 저장하고 조리했음을 보여 줍니다.' },
  { era:'선사', difficulty:1, q:'청동기 시대의 대표적인 무덤으로 알맞은 것은 무엇일까요?', o:['고인돌','돌무지덧널무덤','왕릉','장군총'], a:0, e:'고인돌은 청동기 시대의 대표적인 무덤으로, 지배층이 나타났음을 짐작하게 하는 유적입니다.' },
  { era:'고조선', difficulty:2, q:'고조선의 8조법을 통해 알 수 있는 사회 모습으로 가장 알맞은 것은?', o:['생명과 재산을 중요하게 여겼다','모든 사람이 같은 신분이었다','농사를 짓지 않았다','왕이 존재하지 않았다'], a:0, e:'8조법에는 사람을 죽이거나 다치게 한 경우, 남의 물건을 훔친 경우에 대한 내용이 있어 생명과 재산을 중요하게 여겼음을 알 수 있습니다.' },
  { era:'삼국', difficulty:1, q:'광개토대왕과 장수왕 때 크게 성장한 나라는 어디일까요?', o:['고구려','백제','신라','가야'], a:0, e:'광개토대왕과 장수왕은 고구려의 왕으로, 이 시기에 고구려의 영토와 영향력이 크게 확대되었습니다.' },
  { era:'삼국', difficulty:2, q:'백제가 한강 유역을 차지하고 활발하게 교류하며 전성기를 맞은 왕은 누구일까요?', o:['근초고왕','장수왕','진흥왕','문무왕'], a:0, e:'근초고왕 때 백제는 한강 유역을 바탕으로 크게 성장하고 중국·일본 등과 활발하게 교류했습니다.' },
  { era:'삼국', difficulty:2, q:'신라가 한강 유역을 차지하고 영역을 크게 넓힌 왕은 누구일까요?', o:['진흥왕','온조왕','광개토대왕','무왕'], a:0, e:'진흥왕 때 신라는 한강 유역을 차지하고 영토를 넓혔으며, 이를 기념하는 순수비를 세웠습니다.' },
  { era:'남북국', difficulty:1, q:'불국사와 석굴암을 남긴 나라는 어디일까요?', o:['통일 신라','고구려','고려','조선'], a:0, e:'불국사와 석굴암은 통일 신라의 대표적인 불교 문화유산입니다.' },
  { era:'남북국', difficulty:2, q:'고구려를 계승한다는 의식을 가지고 만주와 한반도 북부에서 성장한 나라는?', o:['발해','가야','후백제','조선'], a:0, e:'발해는 고구려 유민과 말갈인이 함께 세웠으며 고구려를 계승한 나라로 발전했습니다.' },
  { era:'고려', difficulty:1, q:'후삼국을 통일하고 고려를 세운 인물은 누구일까요?', o:['왕건','궁예','견훤','이성계'], a:0, e:'왕건은 후삼국을 통일하고 고려를 세워 태조가 되었습니다.' },
  { era:'고려', difficulty:2, q:'거란의 침입 때 외교 담판으로 강동 6주를 확보한 인물은?', o:['서희','강감찬','최무선','윤관'], a:0, e:'서희는 거란 장수 소손녕과 외교 담판을 벌여 강동 6주를 확보했습니다.' },
  { era:'고려', difficulty:2, q:'귀주대첩에서 거란군을 크게 물리친 고려의 장군은?', o:['강감찬','서희','김유신','을지문덕'], a:0, e:'강감찬은 귀주대첩에서 거란군을 크게 물리쳤습니다.' },
  { era:'고려', difficulty:1, q:'몽골의 침입을 겪는 가운데 나라의 평안을 바라는 마음으로 다시 만든 문화유산은?', o:['팔만대장경','훈민정음','첨성대','독립문'], a:0, e:'고려는 몽골의 침입을 물리치고자 하는 마음을 담아 팔만대장경을 다시 만들었습니다.' },
  { era:'고려', difficulty:1, q:'고려를 대표하는 문화유산으로 비취색 빛깔이 특징인 것은?', o:['고려청자','백자','금관','빗살무늬 토기'], a:0, e:'고려청자는 맑은 비취색과 상감 기법 등으로 유명한 고려의 대표 문화유산입니다.' },
  { era:'고려', difficulty:2, q:'현존하는 세계에서 가장 오래된 금속 활자 인쇄본으로 알려진 책은?', o:['직지','삼국사기','조선왕조실록','동의보감'], a:0, e:'직지는 1377년에 금속 활자로 인쇄된 책으로, 현존하는 세계에서 가장 오래된 금속 활자 인쇄본으로 알려져 있습니다.' },
  { era:'조선 전기', difficulty:1, q:'조선을 세우고 첫 번째 왕이 된 인물은 누구일까요?', o:['이성계','세종','정조','왕건'], a:0, e:'이성계는 1392년 조선을 세우고 태조가 되었습니다.' },
  { era:'조선 전기', difficulty:1, q:'조선이 새 수도로 정한 곳은 어디일까요?', o:['한양','개경','경주','평양'], a:0, e:'조선은 한양을 새로운 수도로 정하고 경복궁과 종묘 등을 건설했습니다.' },
  { era:'조선 전기', difficulty:1, q:'세종이 백성들이 우리말을 쉽게 적도록 만든 문자의 처음 이름은?', o:['훈민정음','이두','향찰','구결'], a:0, e:'세종은 백성들이 쉽게 배우고 사용할 수 있도록 훈민정음을 창제했습니다.' },
  { era:'조선 전기', difficulty:1, q:'조선 세종 때 강수량을 재기 위해 사용한 기구는?', o:['측우기','앙부일구','자격루','혼천의'], a:0, e:'측우기는 비가 얼마나 왔는지 재는 기구로 농사와 행정에 필요한 자료를 얻는 데 활용되었습니다.' },
  { era:'조선 전기', difficulty:2, q:'시간이 되면 자동으로 종이나 북을 울려 시각을 알려 준 조선의 물시계는?', o:['자격루','측우기','앙부일구','거중기'], a:0, e:'자격루는 물의 흐름을 이용해 시간을 재고 자동으로 시각을 알려 주도록 만든 물시계입니다.' },
  { era:'조선 전기', difficulty:1, q:'임진왜란 때 거북선과 수군을 이끌고 활약한 인물은?', o:['이순신','권율','곽재우','정약용'], a:0, e:'이순신은 조선 수군을 이끌고 여러 해전에서 일본군에 맞서 싸웠습니다.' },
  { era:'조선 전기', difficulty:2, q:'임진왜란 때 스스로 군대를 조직하여 일본군에 맞서 싸운 백성들의 군대를 무엇이라고 할까요?', o:['의병','훈련도감','별무반','화랑'], a:0, e:'의병은 나라가 위기에 처했을 때 백성들이 자발적으로 조직한 군대입니다.' },
  { era:'조선 후기', difficulty:1, q:'영조와 정조가 여러 정치 세력의 갈등을 줄이기 위해 실시한 정책은?', o:['탕평책','대동법','균역법','과거제'], a:0, e:'영조와 정조는 붕당 간의 심한 대립을 줄이고 인재를 고르게 쓰기 위해 탕평책을 추진했습니다.' },
  { era:'조선 후기', difficulty:1, q:'정조가 건설한 계획도시이자 성곽으로 알맞은 것은?', o:['수원 화성','경복궁','남한산성','독립문'], a:0, e:'정조는 수원 화성을 건설해 새로운 정치와 경제의 중심지로 발전시키려 했습니다.' },
  { era:'조선 후기', difficulty:2, q:'공납의 폐단을 줄이기 위해 쌀·동전·베 등으로 세금을 내도록 한 제도는?', o:['대동법','균역법','과전법','호패법'], a:0, e:'대동법은 지역 특산물을 내던 공납 대신 쌀·동전·베 등으로 세금을 내도록 하여 공납의 폐단을 줄였습니다.' },
  { era:'조선 후기', difficulty:1, q:'조선 후기에 서민들이 즐기며 발달한 문화로 가장 알맞은 것은?', o:['판소리와 탈놀이','금속활자 제작','고인돌 축조','순수비 건립'], a:0, e:'조선 후기에는 판소리, 탈놀이, 민화 등 서민 문화가 활발하게 발달했습니다.' },
  { era:'조선 후기', difficulty:2, q:'수원 화성 건설에 거중기를 활용하는 등 실용적인 학문을 연구한 인물은?', o:['정약용','최치원','김부식','원효'], a:0, e:'정약용은 실학자로서 백성의 생활에 도움이 되는 제도와 기술을 연구했고 수원 화성 건설에도 참여했습니다.' },
  { era:'개항기', difficulty:1, q:'조선이 일본과 맺은 최초의 근대적 조약으로, 1876년에 체결된 것은?', o:['강화도 조약','을사늑약','한일 병합 조약','정미7조약'], a:0, e:'1876년 강화도 조약을 계기로 조선의 항구가 개항되고 외국과의 교류가 확대되었습니다.' },
  { era:'개항기', difficulty:2, q:'1894년 전봉준 등을 중심으로 농민들이 사회 개혁과 외세 배척을 주장하며 일으킨 운동은?', o:['동학 농민 운동','3·1 운동','6·10 만세 운동','광주 학생 항일 운동'], a:0, e:'동학 농민 운동은 1894년에 농민들이 부패한 정치와 외세의 침략에 맞서 일으킨 운동입니다.' },
  { era:'개항기', difficulty:2, q:'갑오개혁 때 폐지되어 신분에 따른 법적 차별을 줄이는 계기가 된 제도는?', o:['신분제','과거제','대동법','훈련도감'], a:0, e:'갑오개혁에서는 신분제가 폐지되어 법적으로 신분에 따른 차별을 없애는 방향의 변화가 이루어졌습니다.' },
  { era:'대한제국', difficulty:1, q:'고종이 황제가 되어 1897년에 선포한 나라의 이름은?', o:['대한제국','대한민국','고려','조선총독부'], a:0, e:'고종은 1897년 대한제국을 선포하고 황제에 올랐습니다.' },
  { era:'국권 피탈', difficulty:2, q:'1905년 일본이 강제로 체결하여 대한제국의 외교권을 빼앗은 조약은?', o:['을사늑약','강화도 조약','조미 수호 통상 조약','정전 협정'], a:0, e:'을사늑약으로 대한제국은 외교권을 빼앗겼고 이에 반대하는 다양한 저항이 이어졌습니다.' },
  { era:'일제강점기', difficulty:1, q:'1919년 전국 각지에서 사람들이 독립을 외치며 참여한 운동은?', o:['3·1 운동','동학 농민 운동','갑신정변','6·10 만세 운동'], a:0, e:'3·1 운동은 1919년 3월 1일을 전후해 전국적으로 확산된 대표적인 독립운동입니다.' },
  { era:'일제강점기', difficulty:1, q:'3·1 운동 이후 독립운동을 체계적으로 이끌기 위해 상하이에 수립된 조직은?', o:['대한민국 임시정부','조선총독부','독립협회','신민회'], a:0, e:'대한민국 임시정부는 1919년 상하이에서 수립되어 여러 독립운동 세력을 연결하고 독립운동을 이끌었습니다.' },
  { era:'일제강점기', difficulty:2, q:'봉오동 전투에서 독립군을 이끌고 일본군을 물리치는 데 활약한 인물은?', o:['홍범도','김구','안중근','유관순'], a:0, e:'홍범도 등이 이끈 독립군은 1920년 봉오동 전투에서 일본군을 물리쳤습니다.' },
  { era:'일제강점기', difficulty:2, q:'청산리 대첩에서 북로군정서군을 이끌고 활약한 인물은?', o:['김좌진','윤봉길','이봉창','신채호'], a:0, e:'김좌진이 이끈 북로군정서군 등 독립군은 1920년 청산리 일대에서 일본군과 싸워 큰 전과를 거두었습니다.' },
  { era:'일제강점기', difficulty:2, q:'일제강점기에 우리말과 한글을 연구하고 지키기 위해 활동한 단체는?', o:['조선어학회','독립협회','화랑도','집현전'], a:0, e:'조선어학회는 우리말과 한글을 연구하고 사전을 만들기 위해 노력했습니다.' },
  { era:'광복 이후', difficulty:1, q:'우리나라가 일제의 식민 지배에서 벗어나 광복을 맞은 해는?', o:['1945년','1919년','1948년','1950년'], a:0, e:'1945년 8월 15일 일본이 항복하면서 우리나라는 광복을 맞았습니다.' },
  { era:'광복 이후', difficulty:1, q:'대한민국 정부가 수립된 해는 언제일까요?', o:['1948년','1945년','1950년','1960년'], a:0, e:'대한민국 정부는 1948년 8월 15일 수립되었습니다.' },
  { era:'6·25 전쟁', difficulty:1, q:'6·25 전쟁이 시작된 해는 언제일까요?', o:['1950년','1945년','1948년','1953년'], a:0, e:'6·25 전쟁은 1950년 6월 25일 시작되었습니다.' },
  { era:'6·25 전쟁', difficulty:2, q:'6·25 전쟁의 전투를 멈추기 위한 정전 협정이 체결된 해는?', o:['1953년','1950년','1948년','1960년'], a:0, e:'정전 협정은 1953년 7월 27일 체결되어 전투가 멈추었습니다.' },
  { era:'역사 탐구', difficulty:2, q:'역사 연구에서 당시 사람들이 실제로 사용한 물건이나 기록을 살펴보는 가장 중요한 이유는?', o:['당시의 생활과 생각을 근거를 통해 이해하기 위해','옛날 물건의 가격만 알아보기 위해','현재와 똑같은 생활인지 확인하기 위해','모든 사건을 한 사람의 관점으로 설명하기 위해'], a:0, e:'역사 자료는 당시 사회의 생활 모습과 생각, 사건을 근거를 바탕으로 이해하도록 도와줍니다.' }
]);

function json(data, status=200, extra={}) {
  return new Response(JSON.stringify(data), { status, headers:{...JSON_HEADERS,...extra} });
}
function nowIso(ms=Date.now()){ return new Date(ms).toISOString(); }
function clampInt(v,min,max,fallback=min){ const n=Math.floor(Number(v)); return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback; }
function cleanNickname(v){ return String(v||'').replace(/[<>\u0000-\u001f]/g,'').replace(/\s+/g,' ').trim().slice(0,14)||'역사 탐험가'; }
function cleanCode(v){ return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6); }
function bearer(request){ const raw=request.headers.get('authorization')||''; return raw.startsWith('Bearer ')?raw.slice(7).trim():''; }
async function sha256(value){
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value||'')));
  return Array.from(new Uint8Array(buf),b=>b.toString(16).padStart(2,'0')).join('');
}
function randomToken(){ const bytes=new Uint8Array(32); crypto.getRandomValues(bytes); return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''); }
function randomCode(){ const bytes=new Uint8Array(6); crypto.getRandomValues(bytes); return Array.from(bytes,b=>ROOM_ALPHABET[b%ROOM_ALPHABET.length]).join(''); }
function shuffleIndexes(count){
  const a=Array.from({length:QUESTIONS.length},(_,i)=>i), bytes=new Uint32Array(a.length); crypto.getRandomValues(bytes);
  for(let i=a.length-1;i>0;i--){ const j=bytes[i]%(i+1); [a[i],a[j]]=[a[j],a[i]]; }
  return a.slice(0,count);
}
function optionOrder(room,position){
  let seed=2166136261;
  const key=String(room?.id||'')+':'+String(position);
  for(let i=0;i<key.length;i++) seed=Math.imul(seed^key.charCodeAt(i),16777619)>>>0;
  const order=[0,1,2,3];
  for(let i=order.length-1;i>0;i--){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const j=seed%(i+1); [order[i],order[j]]=[order[j],order[i]];
  }
  return order;
}
function displayedQuestion(room,q){
  const order=optionOrder(room,Number(room.current_question));
  return {order,options:order.map(index=>q.o[index]),answerIndex:order.indexOf(q.a)};
}
async function parseJson(request){
  if(!(request.headers.get('content-type')||'').toLowerCase().includes('application/json')) throw new Error('json-required');
  return request.json();
}

const SCHEMA=[
  `CREATE TABLE IF NOT EXISTS history_live_rooms (
    id TEXT PRIMARY KEY, room_code TEXT NOT NULL UNIQUE, host_token_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting', question_order_json TEXT NOT NULL,
    current_question INTEGER NOT NULL DEFAULT -1, question_count INTEGER NOT NULL DEFAULT 15,
    seconds_per_question INTEGER NOT NULL DEFAULT 12, question_started_at TEXT,
    question_deadline_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, expires_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS history_live_players (
    id TEXT PRIMARY KEY, room_id TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE,
    nickname TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 0, streak INTEGER NOT NULL DEFAULT 0,
    joined_at TEXT NOT NULL, last_seen_at TEXT NOT NULL,
    FOREIGN KEY(room_id) REFERENCES history_live_rooms(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_history_live_players_room ON history_live_players(room_id)`,
  `CREATE TABLE IF NOT EXISTS history_live_answers (
    room_id TEXT NOT NULL, player_id TEXT NOT NULL, question_index INTEGER NOT NULL,
    option_index INTEGER NOT NULL, answered_at TEXT NOT NULL, is_correct INTEGER NOT NULL DEFAULT 0,
    points INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(room_id,player_id,question_index),
    FOREIGN KEY(room_id) REFERENCES history_live_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY(player_id) REFERENCES history_live_players(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_history_live_answers_room_q ON history_live_answers(room_id,question_index)`
];
let schemaReady=false;
async function ensureSchema(env){ if(schemaReady)return; if(!env.DB)throw new Error('database-not-configured'); for(const sql of SCHEMA)await env.DB.prepare(sql).run(); schemaReady=true; }
async function cleanup(env,now=Date.now()){
  const expired=await env.DB.prepare('SELECT id FROM history_live_rooms WHERE expires_at < ?').bind(nowIso(now)).all();
  for(const row of expired.results||[]) await env.DB.batch([
    env.DB.prepare('DELETE FROM history_live_answers WHERE room_id=?').bind(row.id),
    env.DB.prepare('DELETE FROM history_live_players WHERE room_id=?').bind(row.id),
    env.DB.prepare('DELETE FROM history_live_rooms WHERE id=?').bind(row.id)
  ]);
}
async function uniqueCode(env){
  for(let i=0;i<12;i++){ const code=randomCode(); const row=await env.DB.prepare('SELECT 1 ok FROM history_live_rooms WHERE room_code=?').bind(code).first(); if(!row)return code; }
  throw new Error('room-code-exhausted');
}
async function roomByCode(env,code){ return env.DB.prepare('SELECT * FROM history_live_rooms WHERE room_code=?').bind(cleanCode(code)).first(); }
async function playerByToken(env,roomId,token){
  if(!/^[0-9a-f]{64}$/i.test(token))return null;
  const hash=await sha256(token);
  return env.DB.prepare('SELECT * FROM history_live_players WHERE room_id=? AND token_hash=?').bind(roomId,hash).first();
}
async function roleFor(env,room,token){
  if(!room||!/^[0-9a-f]{64}$/i.test(token))return {role:null,player:null};
  const hash=await sha256(token);
  if(hash===room.host_token_hash)return {role:'host',player:null};
  const player=await env.DB.prepare('SELECT * FROM history_live_players WHERE room_id=? AND token_hash=?').bind(room.id,hash).first();
  return player?{role:'player',player}:{role:null,player:null};
}
async function autoReveal(env,room,now=Date.now()){
  if(room?.status!=='question')return room;
  const count=await env.DB.prepare('SELECT COUNT(*) n FROM history_live_players WHERE room_id=?').bind(room.id).first();
  const answered=await env.DB.prepare('SELECT COUNT(*) n FROM history_live_answers WHERE room_id=? AND question_index=?').bind(room.id,room.current_question).first();
  const deadline=room.question_deadline_at?new Date(room.question_deadline_at).getTime():NaN;
  const everyoneAnswered=Number(count?.n||0)>0 && Number(answered?.n||0)>=Number(count?.n||0);
  if(!everyoneAnswered && (!Number.isFinite(deadline)||now<deadline))return room;
  await env.DB.prepare("UPDATE history_live_rooms SET status='reveal',updated_at=? WHERE id=? AND status='question'").bind(nowIso(now),room.id).run();
  return roomByCode(env,room.room_code);
}
async function createRoom(request,env){
  let body={}; try{body=await parseJson(request)}catch(_){}
  const questionCount=clampInt(body.questionCount,5,20,15), seconds=clampInt(body.secondsPerQuestion,8,30,12);
  await cleanup(env);
  const id=crypto.randomUUID(),code=await uniqueCode(env),token=randomToken(),hash=await sha256(token),now=Date.now(),order=shuffleIndexes(questionCount);
  await env.DB.prepare(`INSERT INTO history_live_rooms
    (id,room_code,host_token_hash,status,question_order_json,current_question,question_count,seconds_per_question,created_at,updated_at,expires_at)
    VALUES (?,?,?,'waiting',?,-1,?,?,?,?,?)`)
    .bind(id,code,hash,JSON.stringify(order),questionCount,seconds,nowIso(now),nowIso(now),nowIso(now+ROOM_TTL_MS)).run();
  return json({ok:true,code,hostToken:token,maxPlayers:MAX_PLAYERS,questionCount,secondsPerQuestion:seconds},201);
}
async function createSoloRoom(request,env){
  let body={}; try{body=await parseJson(request)}catch(_){}
  const questionCount=clampInt(body.questionCount,5,20,15), seconds=clampInt(body.secondsPerQuestion,8,30,12);
  await cleanup(env);
  const roomId=crypto.randomUUID(),code=await uniqueRoomCode(env),hostToken=randomToken(),hostHash=await sha256(hostToken);
  const playerToken=randomToken(),playerHash=await sha256(playerToken),playerId=crypto.randomUUID();
  const now=Date.now(),deadline=now+seconds*1000,order=shuffleIndexes(questionCount),nick=cleanNickname(body.nickname||'나');
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO history_live_rooms
      (id,room_code,host_token_hash,status,question_order_json,current_question,question_count,seconds_per_question,question_started_at,question_deadline_at,created_at,updated_at,expires_at)
      VALUES (?,?,?,'question',?,0,?,?,?,?,?,?,?)`)
      .bind(roomId,code,hostHash,JSON.stringify(order),questionCount,seconds,nowIso(now),nowIso(deadline),nowIso(now),nowIso(now),nowIso(now+ROOM_TTL_MS)),
    env.DB.prepare(`INSERT INTO history_live_players
      (id,room_id,token_hash,nickname,score,streak,joined_at,last_seen_at) VALUES (?,?,?,?,0,0,?,?)`)
      .bind(playerId,roomId,playerHash,nick,nowIso(now),nowIso(now))
  ]);
  return json({ok:true,code,hostToken,playerToken,playerId,nickname:nick,questionCount,secondsPerQuestion:seconds},201);
}
async function joinRoom(request,env){
  let body; try{body=await parseJson(request)}catch(_){return json({ok:false,error:'invalid_json'},400)}
  const room=await roomByCode(env,body.code);
  if(!room)return json({ok:false,error:'room_not_found'},404);
  if(room.status!=='waiting')return json({ok:false,error:'room_already_started'},409);
  const count=await env.DB.prepare('SELECT COUNT(*) n FROM history_live_players WHERE room_id=?').bind(room.id).first();
  if(Number(count?.n||0)>=MAX_PLAYERS)return json({ok:false,error:'room_full'},409);
  let nick=cleanNickname(body.nickname);
  const names=await env.DB.prepare('SELECT nickname FROM history_live_players WHERE room_id=?').bind(room.id).all();
  const used=new Set((names.results||[]).map(r=>String(r.nickname).toLowerCase()));
  if(used.has(nick.toLowerCase())){ const base=nick.slice(0,11); let n=2; while(used.has((base+n).toLowerCase())&&n<99)n++; nick=(base+n).slice(0,14); }
  const token=randomToken(),hash=await sha256(token),id=crypto.randomUUID(),at=nowIso();
  await env.DB.prepare(`INSERT INTO history_live_players
    (id,room_id,token_hash,nickname,score,streak,joined_at,last_seen_at) VALUES (?,?,?,?,0,0,?,?)`)
    .bind(id,room.id,hash,nick,at,at).run();
  return json({ok:true,code:room.room_code,playerId:id,playerToken:token,nickname:nick},201);
}
function currentQuestion(room){
  let order=[]; try{order=JSON.parse(room.question_order_json||'[]')}catch(_){}
  const pos=Number(room.current_question);
  if(pos<0||pos>=order.length)return null;
  const q=QUESTIONS[order[pos]];
  return q?{...q,bankIndex:order[pos]}:null;
}
async function state(request,env){
  const url=new URL(request.url), room=await roomByCode(env,url.searchParams.get('code'));
  if(!room)return json({ok:false,error:'room_not_found'},404);
  const auth=await roleFor(env,room,bearer(request));
  if(!auth.role)return json({ok:false,error:'unauthorized'},401);
  const fresh=await autoReveal(env,room);
  if(auth.role==='player')await env.DB.prepare('UPDATE history_live_players SET last_seen_at=? WHERE id=?').bind(nowIso(),auth.player.id).run();
  const playersRes=await env.DB.prepare('SELECT id,nickname,score,streak,last_seen_at,joined_at FROM history_live_players WHERE room_id=? ORDER BY score DESC,joined_at ASC').bind(fresh.id).all();
  const players=playersRes.results||[], qi=Number(fresh.current_question);
  const ansRes=qi>=0?await env.DB.prepare('SELECT player_id,option_index,is_correct,points FROM history_live_answers WHERE room_id=? AND question_index=?').bind(fresh.id,qi).all():{results:[]};
  const answers=ansRes.results||[], answered=new Set(answers.map(a=>a.player_id)), now=Date.now();
  const roster=players.map((p,i)=>({id:p.id,nickname:p.nickname,score:Number(p.score||0),streak:Number(p.streak||0),rank:i+1,answered:answered.has(p.id),online:now-new Date(p.last_seen_at).getTime()<=ONLINE_WINDOW_MS}));
  const q=currentQuestion(fresh),display=q?displayedQuestion(fresh,q):null;
  const payload={ok:true,role:auth.role,selfPlayerId:auth.player?.id||null,room:{code:fresh.room_code,status:fresh.status,maxPlayers:MAX_PLAYERS,questionNumber:qi+1,questionCount:Number(fresh.question_count),secondsPerQuestion:Number(fresh.seconds_per_question),deadlineAt:fresh.question_deadline_at||null,serverNow:nowIso(now)},players:roster};
  if(q&&display&&['question','reveal','finished'].includes(fresh.status))payload.question={number:qi+1,total:Number(fresh.question_count),era:q.era,difficulty:q.difficulty,prompt:q.q,options:display.options};
  if(q&&fresh.status==='reveal'){
    const stats=[0,0,0,0]; answers.forEach(a=>{if(a.option_index>=0&&a.option_index<4)stats[a.option_index]++});
    payload.reveal={answerIndex:display.answerIndex,explanation:q.e,optionStats:stats,answeredCount:answers.length,correctCount:answers.filter(a=>Number(a.is_correct)===1).length};
  }
  if(fresh.status==='finished')payload.results=roster;
  return json(payload);
}
async function hostAction(request,env,action){
  let body; try{body=await parseJson(request)}catch(_){return json({ok:false,error:'invalid_json'},400)}
  let room=await roomByCode(env,body.code);
  if(!room)return json({ok:false,error:'room_not_found'},404);
  const auth=await roleFor(env,room,bearer(request));
  if(auth.role!=='host')return json({ok:false,error:'host_required'},403);
  const now=Date.now();
  if(action==='start'){
    if(room.status!=='waiting')return json({ok:false,error:'invalid_state'},409);
    const count=await env.DB.prepare('SELECT COUNT(*) n FROM history_live_players WHERE room_id=?').bind(room.id).first();
    if(Number(count?.n||0)<1)return json({ok:false,error:'no_players'},409);
    const deadline=now+Number(room.seconds_per_question)*1000;
    await env.DB.prepare(`UPDATE history_live_rooms SET status='question',current_question=0,question_started_at=?,question_deadline_at=?,updated_at=?,expires_at=? WHERE id=?`)
      .bind(nowIso(now),nowIso(deadline),nowIso(now),nowIso(now+ROOM_TTL_MS),room.id).run();
  }else if(action==='next'){
    room=await autoReveal(env,room,now);
    if(room.status!=='reveal')return json({ok:false,error:'reveal_not_ready'},409);
    const next=Number(room.current_question)+1;
    if(next>=Number(room.question_count)){
      await env.DB.prepare(`UPDATE history_live_rooms SET status='finished',question_started_at=NULL,question_deadline_at=NULL,updated_at=?,expires_at=? WHERE id=?`)
        .bind(nowIso(now),nowIso(now+30*60*1000),room.id).run();
    }else{
      const deadline=now+Number(room.seconds_per_question)*1000;
      await env.DB.prepare(`UPDATE history_live_rooms SET status='question',current_question=?,question_started_at=?,question_deadline_at=?,updated_at=? WHERE id=?`)
        .bind(next,nowIso(now),nowIso(deadline),nowIso(now),room.id).run();
    }
  }else if(action==='close'){
    await env.DB.batch([
      env.DB.prepare('DELETE FROM history_live_answers WHERE room_id=?').bind(room.id),
      env.DB.prepare('DELETE FROM history_live_players WHERE room_id=?').bind(room.id),
      env.DB.prepare('DELETE FROM history_live_rooms WHERE id=?').bind(room.id)
    ]);
  }
  return json({ok:true});
}
async function answerQuestion(request,env){
  let body; try{body=await parseJson(request)}catch(_){return json({ok:false,error:'invalid_json'},400)}
  let room=await roomByCode(env,body.code);
  if(!room)return json({ok:false,error:'room_not_found'},404);
  room=await autoReveal(env,room);
  if(room.status!=='question')return json({ok:false,error:'answer_closed'},409);
  const player=await playerByToken(env,room.id,bearer(request));
  if(!player)return json({ok:false,error:'player_required'},403);
  const raw=Number(body.optionIndex);
  if(!Number.isInteger(raw)||raw<0||raw>3)return json({ok:false,error:'invalid_option'},400);
  const now=Date.now(),deadline=new Date(room.question_deadline_at).getTime(),started=new Date(room.question_started_at).getTime();
  if(!Number.isFinite(deadline)||now>deadline)return json({ok:false,error:'answer_closed'},409);
  const qi=Number(room.current_question),q=currentQuestion(room);
  if(!q)return json({ok:false,error:'question_missing'},500);
  const display=displayedQuestion(room,q),originalOption=display.order[raw];
  const correct=originalOption===q.a,duration=Math.max(1,deadline-started),remaining=Math.max(0,deadline-now),speed=Math.round(500*(remaining/duration));
  const newStreak=correct?Number(player.streak||0)+1:0,streakBonus=correct&&newStreak>=2?Math.min(300,(newStreak-1)*100):0,points=correct?1000+speed+streakBonus:0;
  const inserted=await env.DB.prepare(`INSERT OR IGNORE INTO history_live_answers
    (room_id,player_id,question_index,option_index,answered_at,is_correct,points) VALUES (?,?,?,?,?,?,?)`)
    .bind(room.id,player.id,qi,raw,nowIso(now),correct?1:0,points).run();
  if(!Number(inserted?.meta?.changes||0))return json({ok:false,error:'already_answered'},409);
  await env.DB.prepare('UPDATE history_live_players SET score=score+?,streak=?,last_seen_at=? WHERE id=?').bind(points,newStreak,nowIso(now),player.id).run();
  return json({ok:true,submitted:true});
}

export async function handleHistoryLiveRequest(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith(PREFIX))return null;
  try{
    await ensureSchema(env);
    if(request.method==='GET'&&url.pathname==='/api/history-live/health')return json({ok:true,database:'ready',questions:QUESTIONS.length,maxPlayers:MAX_PLAYERS});
    if(request.method==='POST'&&url.pathname==='/api/history-live/rooms')return createRoom(request,env);
    if(request.method==='POST'&&url.pathname==='/api/history-live/solo')return createSoloRoom(request,env);
    if(request.method==='POST'&&url.pathname==='/api/history-live/join')return joinRoom(request,env);
    if(request.method==='GET'&&url.pathname==='/api/history-live/state')return state(request,env);
    if(request.method==='POST'&&url.pathname==='/api/history-live/start')return hostAction(request,env,'start');
    if(request.method==='POST'&&url.pathname==='/api/history-live/next')return hostAction(request,env,'next');
    if(request.method==='POST'&&url.pathname==='/api/history-live/close')return hostAction(request,env,'close');
    if(request.method==='POST'&&url.pathname==='/api/history-live/answer')return answerQuestion(request,env);
    return json({ok:false,error:'not_found'},404);
  }catch(error){
    console.error('[history-live]',error);
    const msg=String(error?.message||'');
    if(/database-not-configured|no such table|SQLITE/i.test(msg))return json({ok:false,error:'history_live_database_not_ready'},503);
    return json({ok:false,error:'history_live_server_error'},500);
  }
}

export { QUESTIONS, MAX_PLAYERS };
