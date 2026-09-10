import fs from 'node:fs';
import vm from 'node:vm';

const MODES = [
  { id:'engWords', file:'영단어 스피드 퀴즈.html', label:'영단어 스피드 퀴즈', lang:'영어', flag:'🇬🇧', level:'기초~중급', defaultTime:10, oldBest:'engSpeedQuizBestScore', accent:'#3b82f6', soft:'#eff6ff' },
  { id:'engSentences', file:'초등 영문장 테스트(심화).html', label:'심화 영문장 퀴즈', lang:'영어', flag:'📝', level:'중급~심화', defaultTime:15, oldBest:'engSentenceSpeedQuizBestScore', accent:'#6366f1', soft:'#eef2ff' },
  { id:'zhBasic', file:'중국어 퀴즈.html', label:'기초 중국어 퀴즈', lang:'중국어', flag:'🇨🇳', level:'HSK 1~3', defaultTime:20, oldBest:'chineseSpeedQuizBestScore', accent:'#ef4444', soft:'#fef2f2' },
  { id:'zhAdvanced', file:'고급 중국어 퀴즈.html', label:'고급 중국어 퀴즈', lang:'중국어', flag:'🐉', level:'HSK 4~6', defaultTime:25, oldBest:'advChineseSpeedQuizBestScore', accent:'#b91c1c', soft:'#fff1f2' },
  { id:'ja', file:'일본어 스피드 퀴즈.html', label:'일본어 스피드 퀴즈', lang:'일본어', flag:'🇯🇵', level:'JLPT N5~N4', defaultTime:20, oldBest:'japaneseSpeedQuizBestScore', accent:'#ec4899', soft:'#fdf2f8' }
];

function extractArrayLiteral(source, marker='const wordDictionary') {
  const markerAt = source.indexOf(marker);
  if (markerAt < 0) throw new Error(`데이터 배열을 찾지 못했습니다: ${marker}`);
  const start = source.indexOf('[', markerAt);
  if (start < 0) throw new Error('배열 시작점을 찾지 못했습니다.');
  let depth = 0, quote = null, escaped = false, lineComment = false, blockComment = false;
  for (let i=start; i<source.length; i++) {
    const c=source[i], n=source[i+1];
    if (lineComment) { if (c==='\n') lineComment=false; continue; }
    if (blockComment) { if (c==='*' && n==='/') { blockComment=false; i++; } continue; }
    if (quote) {
      if (escaped) { escaped=false; continue; }
      if (c==='\\') { escaped=true; continue; }
      if (c===quote) quote=null;
      continue;
    }
    if (c==='/' && n==='/') { lineComment=true; i++; continue; }
    if (c==='/' && n==='*') { blockComment=true; i++; continue; }
    if (c==='"' || c==="'" || c==='`') { quote=c; continue; }
    if (c==='[') depth++;
    if (c===']') {
      depth--;
      if (depth===0) return source.slice(start, i+1);
    }
  }
  throw new Error('배열 끝을 찾지 못했습니다.');
}

function readDictionary(file) {
  const source = fs.readFileSync(file, 'utf8');
  const literal = extractArrayLiteral(source);
  const data = vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 1000 });
  const clean = [];
  const seen = new Set();
  for (const item of data) {
    if (!item || typeof item.word !== 'string' || typeof item.desc !== 'string') continue;
    const word=item.word.trim(), desc=item.desc.trim();
    if (!word || !desc) continue;
    const key=word+'\u0000'+desc;
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push({word,desc});
  }
  if (clean.length < 20) throw new Error(`${file}: 유효 문제 수가 너무 적습니다 (${clean.length})`);
  return clean;
}

const datasets = {};
for (const mode of MODES) {
  datasets[mode.id] = readDictionary(mode.file);
  console.log(`${mode.label}: ${datasets[mode.id].length}개 통합`);
}

const publicModes = MODES.map(({file,...rest})=>rest);
const modesJson = JSON.stringify(publicModes).replace(/</g,'\\u003c');
const dataJson = JSON.stringify(datasets).replace(/</g,'\\u003c').replace(/<\/script/gi,'<\\/script');

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#f8fafc">
<title>월드 랭귀지 아케이드</title>
<style>
:root{--accent:#3b82f6;--soft:#eff6ff;--ink:#172033;--muted:#64748b;--good:#16a34a;--bad:#dc2626;--card:#fff;--line:#e2e8f0}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}body{margin:0;min-height:100vh;font-family:Pretendard,"Noto Sans KR",system-ui,sans-serif;color:var(--ink);background:radial-gradient(circle at 15% 10%,var(--soft),transparent 34%),linear-gradient(160deg,#f8fafc,#eef2ff);overflow-x:hidden}.app{width:min(980px,100%);margin:auto;padding:18px 16px 40px}.top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.brand{display:flex;gap:11px;align-items:center}.logo{width:52px;height:52px;border-radius:17px;background:var(--accent);color:white;display:grid;place-items:center;font-size:28px;box-shadow:0 9px 24px color-mix(in srgb,var(--accent) 28%,transparent)}h1{font-size:clamp(21px,4vw,31px);margin:0}.sub{color:var(--muted);font-size:13px;margin-top:3px}.ghost,.btn{border:0;border-radius:14px;font-weight:800;cursor:pointer;min-height:46px}.ghost{padding:10px 14px;background:#fff;border:1px solid var(--line);color:#475569}.screen{display:none}.screen.on{display:block}.hero{background:#fff;border:1px solid var(--line);border-radius:25px;padding:24px;box-shadow:0 14px 38px #64748b1c;margin-bottom:18px}.hero h2{font-size:clamp(25px,5vw,40px);margin:0 0 8px}.hero p{margin:0;color:var(--muted);line-height:1.6}.language-head{font-size:14px;font-weight:900;color:#475569;margin:23px 4px 10px}.mode-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.mode{position:relative;text-align:left;border:1px solid var(--line);background:#fff;border-radius:21px;padding:18px;cursor:pointer;box-shadow:0 8px 24px #64748b12;transition:.17s transform,.17s border}.mode:hover,.mode:active{transform:translateY(-2px);border-color:var(--accent)}.mode .flag{font-size:31px}.mode strong{display:block;font-size:18px;margin:9px 0 5px}.mode small{color:var(--muted);line-height:1.5}.mode .count{position:absolute;right:14px;top:14px;background:#f1f5f9;border-radius:999px;padding:5px 8px;font-size:11px;font-weight:900;color:#64748b}.setup{max-width:660px;margin:auto}.setup-card,.quiz-card,.result-card{background:#fff;border:1px solid var(--line);border-radius:25px;padding:22px;box-shadow:0 14px 38px #64748b1c}.mode-title{text-align:center}.mode-title .bigflag{font-size:48px}.mode-title h2{margin:7px 0 4px;font-size:27px}.mode-title p{margin:0;color:var(--muted)}.setting{margin-top:22px}.setting label.title{display:block;font-weight:900;margin-bottom:9px}.segments{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.segments.two{grid-template-columns:repeat(2,1fr)}.seg{border:1px solid var(--line);background:#f8fafc;border-radius:13px;padding:11px 6px;font-weight:800;color:#475569;cursor:pointer}.seg.sel{background:var(--soft);border-color:var(--accent);color:var(--accent)}.start-btn{width:100%;margin-top:22px;background:var(--accent);color:white;padding:14px;font-size:17px}.bestline{text-align:center;color:var(--muted);font-size:13px;margin-top:11px}.hud{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;margin-bottom:12px}.hud .left{font-size:13px;font-weight:900;color:#64748b}.hud .score{text-align:center;background:#fff;border:1px solid var(--line);border-radius:999px;padding:8px 13px;font-weight:900;color:var(--accent)}.hud .time{text-align:right;font-weight:1000;font-size:22px}.hud .time.danger{color:var(--bad);animation:pulse .6s infinite alternate}@keyframes pulse{to{transform:scale(1.08)}}.progress{height:7px;background:#e2e8f0;border-radius:99px;overflow:hidden;margin-bottom:13px}.progress>i{display:block;height:100%;width:0;background:var(--accent);transition:.2s}.quiz-card{min-height:470px;display:flex;flex-direction:column}.crumb{display:flex;justify-content:space-between;color:var(--muted);font-size:12px;font-weight:800}.question{margin:22px 0 18px;background:var(--soft);border:1px solid color-mix(in srgb,var(--accent) 25%,white);border-radius:21px;padding:28px 20px;min-height:128px;display:grid;place-items:center;text-align:center;font-size:clamp(19px,4vw,28px);font-weight:900;line-height:1.45;word-break:keep-all}.choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.choice{position:relative;border:1px solid var(--line);background:#fff;border-radius:16px;padding:15px 14px;min-height:66px;text-align:left;font-weight:800;font-size:15px;line-height:1.4;cursor:pointer;color:#334155}.choice .n{display:inline-grid;place-items:center;width:25px;height:25px;border-radius:8px;background:#f1f5f9;margin-right:7px;color:#64748b}.choice.correct{background:#f0fdf4;border-color:#22c55e;color:#166534}.choice.wrong{background:#fef2f2;border-color:#ef4444;color:#991b1b}.choice:disabled{cursor:default}.feedback{min-height:35px;text-align:center;font-weight:900;margin-top:13px}.feedback.good{color:var(--good)}.feedback.bad{color:var(--bad)}.combo{height:21px;text-align:center;color:#f59e0b;font-weight:1000}.result-card{text-align:center;max-width:680px;margin:auto}.result-icon{font-size:57px}.result-card h2{font-size:29px;margin:6px}.final-score{font-size:50px;font-weight:1000;color:var(--accent)}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:17px 0}.stat{background:#f8fafc;border-radius:15px;padding:12px 6px}.stat b{display:block;font-size:20px}.stat small{color:var(--muted)}.wrongbook{text-align:left;max-height:260px;overflow:auto;border-top:1px solid var(--line);margin-top:18px;padding-top:12px}.wrongitem{padding:10px 2px;border-bottom:1px dashed #e2e8f0;font-size:13px;line-height:1.5}.wrongitem b{color:var(--bad)}.actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:18px}.actions .btn{padding:12px;background:var(--accent);color:#fff}.actions .btn.alt{background:#eef2f7;color:#475569}.toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,20px);background:#172033;color:#fff;border-radius:999px;padding:10px 17px;font-size:13px;font-weight:800;opacity:0;pointer-events:none;transition:.2s;z-index:20}.toast.on{opacity:1;transform:translate(-50%,0)}
@media(max-width:620px){.app{padding:12px 10px 28px}.mode-grid,.choices{grid-template-columns:1fr}.hero{padding:19px}.quiz-card{padding:15px;min-height:0}.question{margin:14px 0;padding:21px 13px;min-height:100px}.choice{min-height:58px;padding:12px}.top .sub{display:none}.stats{gap:5px}.stat{padding:9px 3px}.segments{gap:5px}.seg{font-size:13px}.hud{grid-template-columns:1fr auto 1fr}}
</style>
</head>
<body>
<div class="app">
 <header class="top"><div class="brand"><div class="logo">🌏</div><div><h1>월드 랭귀지 아케이드</h1><div class="sub">영어 · 중국어 · 일본어를 한 곳에서 스피드 퀴즈로!</div></div></div><button id="homeBtn" class="ghost">Kidscade ↩</button></header>
 <main>
  <section id="menu" class="screen on"><div class="hero"><h2>오늘은 어떤 언어로 달릴까?</h2><p>기존 5개의 언어 퀴즈를 하나로 합쳤어요. 실력에 맞는 코스를 고르고 20문제 연속 콤보에 도전하세요.</p></div><div id="modeList"></div></section>
  <section id="setup" class="screen setup"><div class="setup-card"><div class="mode-title"><div id="setupFlag" class="bigflag"></div><h2 id="setupTitle"></h2><p id="setupInfo"></p></div><div class="setting"><label class="title">문제 방향</label><div class="segments two" id="directionSeg"><button class="seg sel" data-v="forward">외국어 → 한국어</button><button class="seg" data-v="reverse">한국어 → 외국어</button></div></div><div class="setting"><label class="title">한 문제 제한 시간</label><div class="segments" id="timeSeg"><button class="seg" data-v="5">5초</button><button class="seg" data-v="10">10초</button><button class="seg" data-v="20">20초</button></div></div><button id="startBtn" class="btn start-btn">20문제 시작!</button><div id="bestLine" class="bestline"></div></div></section>
  <section id="game" class="screen"><div class="hud"><div id="counter" class="left">1 / 20</div><div id="score" class="score">0점</div><div id="time" class="time">10.0</div></div><div class="progress"><i id="progressBar"></i></div><div class="quiz-card"><div class="crumb"><span id="crumbMode"></span><span>숫자키 1~4 가능</span></div><div id="question" class="question"></div><div id="choices" class="choices"></div><div id="feedback" class="feedback"></div><div id="combo" class="combo"></div></div></section>
  <section id="result" class="screen"><div class="result-card"><div class="result-icon">🏁</div><h2 id="resultTitle">완주!</h2><div id="finalScore" class="final-score">0</div><div id="rankText"></div><div class="stats"><div class="stat"><b id="correctStat">0</b><small>정답</small></div><div class="stat"><b id="accuracyStat">0%</b><small>정확도</small></div><div class="stat"><b id="comboStat">0</b><small>최고 콤보</small></div></div><div id="wrongBook" class="wrongbook"></div><div class="actions"><button id="againBtn" class="btn">같은 코스 다시</button><button id="menuBtn" class="btn alt">다른 언어 고르기</button></div></div></section>
 </main>
</div><div id="toast" class="toast"></div>
<script>
const MODES=${modesJson};
const DATA=${dataJson};
const $=id=>document.getElementById(id),screens=['menu','setup','game','result'];
let selected=null,direction='forward',limit=10,round=[],idx=0,score=0,combo=0,bestCombo=0,correct=0,wrongs=[],remaining=0,timer=null,locked=false,ac=null;
function show(id){screens.forEach(s=>$(s).classList.toggle('on',s===id))}
function mode(){return MODES.find(m=>m.id===selected)}
function theme(){const m=mode();document.documentElement.style.setProperty('--accent',m?.accent||'#3b82f6');document.documentElement.style.setProperty('--soft',m?.soft||'#eff6ff')}
function bestKey(id){return 'languageArcadeBest_'+id}
function getBest(id){let b=Number(localStorage.getItem(bestKey(id))||0);const old=MODES.find(m=>m.id===id)?.oldBest;if(old)b=Math.max(b,Number(localStorage.getItem(old)||0));return b}
function setBest(id,v){if(v>getBest(id))localStorage.setItem(bestKey(id),String(v));const overall=Math.max(Number(localStorage.getItem('languageArcadeBest')||0),v);localStorage.setItem('languageArcadeBest',String(overall))}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderMenu(){const groups=[['영어','🇬🇧'],['중국어','🇨🇳'],['일본어','🇯🇵']];$('modeList').innerHTML=groups.map(([g,f])=>{const list=MODES.filter(m=>m.lang===g);return '<div class="language-head">'+f+' '+g+'</div><div class="mode-grid">'+list.map(m=>'<button class="mode" data-mode="'+m.id+'"><span class="count">'+DATA[m.id].length+'문제</span><span class="flag">'+m.flag+'</span><strong>'+m.label+'</strong><small>'+m.level+' · 최고 '+getBest(m.id)+'점<br>기존 문제 데이터를 그대로 통합했어요.</small></button>').join('')+'</div>'}).join('');document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>chooseMode(b.dataset.mode))}
function chooseMode(id){selected=id;theme();const m=mode();$('setupFlag').textContent=m.flag;$('setupTitle').textContent=m.label;$('setupInfo').textContent=m.level+' · 총 '+DATA[id].length+'개의 문제 데이터';direction='forward';limit=m.defaultTime;renderSegments();$('bestLine').textContent='이 코스 최고 기록 '+getBest(id)+'점';show('setup')}
function renderSegments(){document.querySelectorAll('#directionSeg .seg').forEach(b=>b.classList.toggle('sel',b.dataset.v===direction));const base=mode().defaultTime;const times=[Math.max(5,Math.round(base/2)),base,Math.min(60,base*2)];$('timeSeg').innerHTML=[...new Set(times)].map(t=>'<button class="seg '+(t===limit?'sel':'')+'" data-v="'+t+'">'+t+'초</button>').join('');document.querySelectorAll('#timeSeg .seg').forEach(b=>b.onclick=()=>{limit=Number(b.dataset.v);renderSegments()})}
document.querySelectorAll('#directionSeg .seg').forEach(b=>b.onclick=()=>{direction=b.dataset.v;renderSegments()});
function audio(){try{ac??=new(window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume()}catch{}}
function tone(f,d=.1,type='sine',v=.05){audio();if(!ac)return;const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;o.type=type;o.frequency.value=f;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(ac.destination);o.start();o.stop(t+d)}
function sfx(ok){if(ok){tone(660,.08,'square',.035);setTimeout(()=>tone(880,.12,'square',.04),55)}else tone(145,.18,'sawtooth',.035)}
function makeQuestion(item){const data=DATA[selected],q=direction==='forward'?item.word:item.desc,answer=direction==='forward'?item.desc:item.word,targetKey=direction==='forward'?'desc':'word';let pool=shuffle(data).map(x=>x[targetKey]).filter(x=>x!==answer);const options=[answer];for(const x of pool){if(!options.includes(x))options.push(x);if(options.length===4)break}return{item,q,answer,options:shuffle(options)}}
function startGame(){audio();const base=shuffle(DATA[selected]).slice(0,Math.min(20,DATA[selected].length));round=base.map(makeQuestion);idx=0;score=0;combo=0;bestCombo=0;correct=0;wrongs=[];locked=false;show('game');nextQuestion()}
function nextQuestion(){clearInterval(timer);if(idx>=round.length)return finish();locked=false;const q=round[idx];$('counter').textContent=(idx+1)+' / '+round.length;$('score').textContent=score+'점';$('crumbMode').textContent=mode().flag+' '+mode().label;$('question').textContent=q.q;$('feedback').textContent='';$('feedback').className='feedback';$('combo').textContent=combo>=2?'🔥 '+combo+' COMBO':'';$('progressBar').style.width=(idx/round.length*100)+'%';$('choices').innerHTML=q.options.map((o,i)=>'<button class="choice" data-answer="'+esc(o)+'"><span class="n">'+(i+1)+'</span>'+esc(o)+'</button>').join('');document.querySelectorAll('.choice').forEach((b,i)=>b.onclick=()=>answer(i));remaining=limit;renderTime();const started=performance.now();timer=setInterval(()=>{remaining=limit-(performance.now()-started)/1000;if(remaining<=0){remaining=0;renderTime();clearInterval(timer);timeoutAnswer();return}renderTime()},100)}
function renderTime(){$('time').textContent=Math.max(0,remaining).toFixed(1);$('time').classList.toggle('danger',remaining<=Math.min(3,limit*.25))}
function answer(i){if(locked)return;locked=true;clearInterval(timer);const q=round[idx],buttons=[...document.querySelectorAll('.choice')],chosen=q.options[i],ok=chosen===q.answer;buttons.forEach((b,j)=>{b.disabled=true;if(q.options[j]===q.answer)b.classList.add('correct')});if(ok){combo++;bestCombo=Math.max(bestCombo,combo);correct++;const gain=100+combo*8+Math.round(remaining/limit*70);score+=gain;$('feedback').textContent='정답! +'+gain+'점';$('feedback').className='feedback good';sfx(true)}else{buttons[i]?.classList.add('wrong');wrongs.push({q:q.q,user:chosen,answer:q.answer});combo=0;$('feedback').textContent='정답은 「'+q.answer+'」';$('feedback').className='feedback bad';sfx(false)}$('score').textContent=score+'점';$('combo').textContent=combo>=2?'🔥 '+combo+' COMBO':'';setTimeout(()=>{idx++;nextQuestion()},ok?700:1100)}
function timeoutAnswer(){if(locked)return;locked=true;const q=round[idx];wrongs.push({q:q.q,user:'시간 초과',answer:q.answer});combo=0;[...document.querySelectorAll('.choice')].forEach((b,j)=>{b.disabled=true;if(q.options[j]===q.answer)b.classList.add('correct')});$('feedback').textContent='시간 초과! 정답은 「'+q.answer+'」';$('feedback').className='feedback bad';sfx(false);setTimeout(()=>{idx++;nextQuestion()},1100)}
function finish(){clearInterval(timer);setBest(selected,score);$('progressBar').style.width='100%';const acc=Math.round(correct/round.length*100);$('finalScore').textContent=score+'점';$('correctStat').textContent=correct+'/'+round.length;$('accuracyStat').textContent=acc+'%';$('comboStat').textContent=bestCombo;let rank=acc===100?'🏆 퍼펙트 마스터':acc>=90?'💎 다이아몬드':acc>=75?'🥇 골드':acc>=60?'🥈 실버':'🥉 다시 도전';$('rankText').textContent=rank+' · 최고 기록 '+getBest(selected)+'점';$('wrongBook').innerHTML=wrongs.length?'<b>오답 노트</b>'+wrongs.map(w=>'<div class="wrongitem">'+esc(w.q)+'<br><b>'+esc(w.user)+'</b> → '+esc(w.answer)+'</div>').join(''):'🎉 틀린 문제가 없어요!';show('result');renderMenu()}
function goMenu(){clearInterval(timer);renderMenu();show('menu');selected=null;theme()}
$('startBtn').onclick=startGame;$('againBtn').onclick=startGame;$('menuBtn').onclick=goMenu;$('homeBtn').onclick=()=>{if(location.pathname.endsWith('index.html'))history.back();else location.href='index.html'};
document.addEventListener('keydown',e=>{if(!$('game').classList.contains('on'))return;const n=Number(e.key);if(n>=1&&n<=4)answer(n-1)});
renderMenu();
const qp=new URLSearchParams(location.search).get('mode');if(MODES.some(m=>m.id===qp))chooseMode(qp);
</script>
</body>
</html>`;

fs.writeFileSync('외국어 스피드 퀴즈.html', html, 'utf8');
console.log(`통합 파일 생성 완료: ${html.length.toLocaleString()} bytes`);

const redirects = {
  '영단어 스피드 퀴즈.html':'engWords',
  '초등 영문장 테스트(심화).html':'engSentences',
  '중국어 퀴즈.html':'zhBasic',
  '고급 중국어 퀴즈.html':'zhAdvanced',
  '일본어 스피드 퀴즈.html':'ja'
};
for (const [file,id] of Object.entries(redirects)) {
  const target='외국어%20스피드%20퀴즈.html?mode='+id;
  const stub=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>월드 랭귀지 아케이드로 이동</title><meta http-equiv="refresh" content="0;url=${target}"><script>location.replace('${target}'+location.hash)<\/script></head><body><p><a href="${target}">월드 랭귀지 아케이드 열기</a></p></body></html>`;
  fs.writeFileSync(file,stub,'utf8');
}

let index=fs.readFileSync('index.html','utf8');
const unifiedCard=`            <a href="외국어 스피드 퀴즈.html" class="game-card" data-category="lang" data-age="high" data-id="language_arcade" data-scorekey="languageArcadeBest">
                <span class="fav-star">☆</span><div class="game-icon">🌏</div><div class="game-title">월드 랭귀지 아케이드</div>
                <div class="game-desc">영단어·영문장·기초/고급 중국어·일본어 퀴즈를 한 곳에서 골라 즐겨요. 기존 문제 데이터를 그대로 모은 외국어 스피드 퀴즈 컬렉션!</div>
            </a>`;
function escapeRegExp(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function cardRx(href){return new RegExp('\\s*<a\\s+href=["\']'+escapeRegExp(href)+'["\'][\\s\\S]*?<\\/a>\\s*','m')}
const primary='영단어 스피드 퀴즈.html';
const rxPrimary=cardRx(primary);
if(!rxPrimary.test(index))throw new Error('index.html에서 영단어 카드를 찾지 못했습니다.');
index=index.replace(rxPrimary,'\n'+unifiedCard+'\n');
for(const file of Object.keys(redirects).filter(f=>f!==primary)){
  const rx=cardRx(file);
  if(!rx.test(index))throw new Error(`index.html에서 기존 카드를 찾지 못했습니다: ${file}`);
  index=index.replace(rx,'\n');
}
fs.writeFileSync('index.html',index,'utf8');
console.log('index.html 기존 5개 카드 → 통합 카드 1개로 정리 완료');
