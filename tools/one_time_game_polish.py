from pathlib import Path
import re


def once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, got {n}")
    return text.replace(old, new, 1)


# 1) Spelling Frog: landing must resolve on the animation-complete frame.
p = Path("스펠링 프로그.html")
s = p.read_text(encoding="utf-8")
s = once(s, "touchStart=null,audioCtx=null;", "touchStart=null,audioCtx=null,landingFrom=null;", "frog state")
s = once(s, "idle=0;deathLock=false;rowCounter=1;", "idle=0;deathLock=false;landingFrom=null;rowCounter=1;", "frog reset")
s = once(s, "}setTimeout(()=>afterLand(fromRow,fromCol),205);updateUI()}", "}landingFrom={row:fromRow,col:fromCol};updateUI()}", "frog landing timer")
s = once(s, "if(t>=1){hopping=false;frog.position.set(hopTo.x,.12,hopTo.z);frog.scale.set(1,1,1)}}shadowDisc.position.set", "if(t>=1){hopping=false;frog.position.set(hopTo.x,.12,hopTo.z);frog.scale.set(1,1,1);const landed=landingFrom;landingFrom=null;if(landed&&running&&!deathLock)afterLand(landed.row,landed.col)}}shadowDisc.position.set", "frog animation landing")
p.write_text(s, encoding="utf-8")

# 2) Arithmetic Spire: stronger impacts, card drag/drop, VICTORY/DEFEAT banner.
p = Path("학교의 탑.html")
s = p.read_text(encoding="utf-8")
polish_css = r'''
/* 2026-09 combat feel pass */
.card{touch-action:none;transition:transform .12s ease,filter .12s ease,opacity .12s ease;transform-origin:50% 100%}
.card:hover:not(:disabled){transform:translateY(-7px) rotate(-1deg) scale(1.035);filter:brightness(1.07)}
.card.dragging{opacity:.16;transform:translateY(-12px) scale(.95)}
.card-ghost{position:fixed!important;z-index:60!important;pointer-events:none!important;margin:0!important;transform:translate(-50%,-50%) rotate(-4deg) scale(1.08)!important;box-shadow:0 18px 28px #000a!important;transition:none!important}
.lane.drop-ready{border-color:#f5d37f!important;box-shadow:0 0 0 3px #ebc47755,0 0 26px #ebc47733!important;transform:translateY(-2px)}
#arena.impact-enemy{animation:impactEnemy .28s ease}#arena.impact-hero{animation:impactHero .28s ease}
.battle-result{position:fixed;left:50%;top:9%;transform:translateX(-50%);z-index:100;pointer-events:none;font-family:Georgia,serif;font-size:clamp(38px,8vw,78px);font-weight:950;letter-spacing:.12em;color:#f4dda1;text-shadow:0 3px #171827,0 0 18px #e9c16c,0 10px 28px #000;animation:battleResult .9s ease forwards}
.battle-result.defeat{color:#f1a0a0;text-shadow:0 3px #28151c,0 0 18px #d05e70,0 10px 28px #000}
@keyframes impactEnemy{0%,100%{transform:none;filter:none}18%{transform:translateX(9px);filter:brightness(1.7)}35%{transform:translateX(-7px)}52%{transform:translateX(5px)}70%{transform:translateX(-3px)}}
@keyframes impactHero{0%,100%{transform:none;filter:none}18%{transform:translateX(-9px);filter:brightness(1.55) saturate(.8)}35%{transform:translateX(7px)}52%{transform:translateX(-5px)}70%{transform:translateX(3px)}}
@keyframes battleResult{0%{opacity:0;transform:translate(-50%,-20px) scale(.75)}18%{opacity:1;transform:translate(-50%,0) scale(1.08)}35%{transform:translate(-50%,0) scale(1)}75%{opacity:1}100%{opacity:0;transform:translate(-50%,-8px) scale(1.05)}}
'''
s = once(s, "</style>\n</head>", polish_css + "</style>\n</head>", "spire css")

drag_js = r'''function installCardDrag(b,fn,kind){let st=null,ghost=null;const lanes=()=>['attack','defense'].map(k=>({k,e:$(k+'-lane')}));function laneAt(x,y){for(const q of lanes()){const r=q.e.getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return q}return null}function clear(){b.classList.remove('dragging');lanes().forEach(q=>q.e.classList.remove('drop-ready'));if(ghost){ghost.remove();ghost=null}}b.addEventListener('pointerdown',e=>{if(b.disabled||busy)return;st={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};b.setPointerCapture?.(e.pointerId)});b.addEventListener('pointermove',e=>{if(!st||st.id!==e.pointerId)return;let dist=Math.hypot(e.clientX-st.x,e.clientY-st.y);if(!st.moved&&dist>7){st.moved=true;ghost=b.cloneNode(true);ghost.classList.remove('dragging','chosen');ghost.classList.add('card-ghost');document.body.append(ghost);b.classList.add('dragging')}if(!st.moved)return;ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';let hit=laneAt(e.clientX,e.clientY);lanes().forEach(q=>q.e.classList.toggle('drop-ready',!!hit&&q.k===hit.k&&(kind==='op'||(pending&&active===q.k))))});function end(e){if(!st||st.id!==e.pointerId)return;let was=st.moved;st=null;if(!was){clear();return}b.dataset.dragged='1';let hit=laneAt(e.clientX,e.clientY);if(!hit){clear();return}if(kind!=='op'&&(!pending||hit.k!==active)){toast('먼저 연산 카드를 놓은 수식으로 숫자 카드를 끌어 주세요.');clear();return}let r=hit.e.getBoundingClientRect(),gx=e.clientX,gy=e.clientY;if(kind==='op'&&active!==hit.k)chooseLane(hit.k);lanes().forEach(q=>q.e.classList.remove('drop-ready'));if(ghost&&ghost.animate)ghost.animate([{left:gx+'px',top:gy+'px',transform:'translate(-50%,-50%) rotate(-4deg) scale(1.08)'},{left:(r.left+r.width/2)+'px',top:(r.top+r.height/2)+'px',transform:'translate(-50%,-50%) rotate(2deg) scale(.55)',opacity:.15}],{duration:170,easing:'cubic-bezier(.2,.8,.2,1)'});setTimeout(()=>{clear();fn()},165)}b.addEventListener('pointerup',end);b.addEventListener('pointercancel',()=>{st=null;clear()})}
'''
s = once(s, "function cardMarkup(c){", drag_js + "function cardMarkup(c){", "spire drag helper")
old = "function cardButton(c,fn,selected=false,disabled=false){let b=document.createElement('button');b.className='card '+(c.kind==='op'?'op':c.d!==1?'fraction':'')+(selected?' chosen':'');b.innerHTML=cardMarkup(c)+(c.kind==='op'?'<span class=\"cost\">'+cost(c.op)+' ◆</span>':'');b.disabled=disabled;b.onclick=fn;b.setAttribute('aria-label',c.kind==='op'?c.op+' 연산, '+cost(c.op)+' 마나':c.label+' 숫자 카드');return b}"
new = "function cardButton(c,fn,selected=false,disabled=false){let b=document.createElement('button');b.className='card '+(c.kind==='op'?'op':c.d!==1?'fraction':'')+(selected?' chosen':'');b.innerHTML=cardMarkup(c)+(c.kind==='op'?'<span class=\"cost\">'+cost(c.op)+' ◆</span>':'');b.disabled=disabled;b.onclick=()=>{if(b.dataset.dragged==='1'){b.dataset.dragged='0';return}fn()};installCardDrag(b,fn,c.kind);b.setAttribute('aria-label',c.kind==='op'?c.op+' 연산, '+cost(c.op)+' 마나':c.label+' 숫자 카드');return b}"
s = once(s, old, new, "spire card button")
impact_js = "function impact(side){let a=$('arena'),c='impact-'+side;a.classList.remove('impact-enemy','impact-hero');void a.offsetWidth;a.classList.add(c);setTimeout(()=>a.classList.remove(c),300)}function battleBanner(text){let e=document.createElement('div');e.className='battle-result '+(text==='DEFEAT'?'defeat':'');e.textContent=text;document.body.append(e);setTimeout(()=>e.remove(),950)}\n"
s = once(s, "function flash(kind,value){", impact_js + "function flash(kind,value){", "spire impact helpers")
s = once(s, "flash('enemyHit','−'+fmt(hit));playSfx('hit');renderStats();", "flash('enemyHit','−'+fmt(hit));impact('enemy');playSfx('hit');renderStats();", "spire enemy impact")
s = once(s, "flash('heroHit','−'+fmt(hurt));renderStats();", "flash('heroHit','−'+fmt(hurt));impact('hero');playSfx('hit');renderStats();", "spire hero impact")
s = once(s, "if(anim.kind==='enemyHit'&&a<.4)enemyX+=Math.sin(a*70)*3;if(anim.kind==='heroHit'&&a<.4)heroX+=Math.sin(a*70)*3;", "if(anim.kind==='enemyHit'&&a<.4)enemyX+=Math.sin(a*95)*9+Math.sin(a/.4*Math.PI)*18;if(anim.kind==='heroHit'&&a<.4)heroX+=Math.sin(a*95)*9-Math.sin(a/.4*Math.PI)*18;", "spire sprite recoil")
s = once(s, "function winBattle(exact){run.wins++;", "function winBattle(exact){battleBanner('VICTORY');run.wins++;", "spire victory")
s = once(s, "function finish(won){phase='over';", "function finish(won){battleBanner(won?'VICTORY':'DEFEAT');phase='over';", "spire defeat")
p.write_text(s, encoding="utf-8")

# 3) Correctness fixes in the reworked games.
p = Path("신비의양팔저울.html")
s = p.read_text(encoding="utf-8")
s = once(s, "{target:360,fixed:'toy',bonus:'book'}", "{target:380,fixed:'toy',bonus:'book'}", "scale 380g round")
s = once(s, "{target:300,fixed:'apple',bonus:'toy',bonus2:'block'}", "{target:320,fixed:'apple',bonus:'toy',bonus2:'block'}", "scale 320g round")
p.write_text(s, encoding="utf-8")

p = Path("프레디의 샌드위치 가게.html")
s = p.read_text(encoding="utf-8")
s = once(s, "let ing=$('ingredient');ing.className=", "let ing=$('ingredient');ing.innerHTML='';ing.className=", "sandwich reset cuts")
p.write_text(s, encoding="utf-8")

# 4) Remove Space Snack Draw and refresh index descriptions.
p = Path("index.html")
s = p.read_text(encoding="utf-8")
pattern = r'\s*<a href="우주 간식 뽑기 실험실\.html" class="game-card"[^>]*>.*?</a>'
s, n = re.subn(pattern, "", s, count=1, flags=re.S)
if n != 1:
    raise SystemExit(f"index snack card: expected 1 match, got {n}")
s = once(s, "사각형과 삼각형의 넓이를 계산하고 외계인 손님이 원하는 완벽한 샌드위치를 만드세요!", "자의 cm 눈금을 보고 재료를 직접 자른 뒤 샌드위치에 올리며 길이와 넓이를 익혀요!", "index sandwich desc")
s = once(s, "단위 변환! 추를 올려 양쪽 무게를 똑같이 맞추세요.", "과일과 생활 물건을 접시에 직접 올리며 g 단위와 무게 비교를 익혀요.", "index scale desc")
p.write_text(s, encoding="utf-8")
Path("우주 간식 뽑기 실험실.html").unlink()
print("one-time patches applied")
