function move(to){
 if(!state.unlocked[to]){toast('ì•„ì§ ê°ˆ ìˆ˜ ì—†ëŠ” ê³³ì´ì—ìš”.');return}
 if(!LINKS[state.place].includes(to)){toast('í˜„ì¬ ìœ„ì¹˜ì™€ ë°”ë¡œ ì—°ê²°ë˜ì§€ ì•Šì•˜ì–´ìš”.');return}
 if(to==='cliff'&&!state.inv.rope){toast('ì ˆë²½ì€ ë°§ì¤„ì´ ìˆì–´ì•¼ ì•ˆì „í•˜ê²Œ ì˜¤ë¥¼ ìˆ˜ ìˆì–´ìš”.');return}
 state.place=to;advance(.5,5);log(`${PLACE[to].name}(ìœ¼)ë¡œ ì´ë™í–ˆë‹¤.`);render();
}
function scout(place){
 state.scouted[place]=(state.scouted[place]||0)+1;
 if(place==='beach'){state.unlocked.cove=true;addItem('metal',1);addItem('wood',1);state.knowledge.tide=true;log('í•´ë³€ì˜ ì –ì€ ì„ ì„ ë”°ë¼ ì¡°ì‚¬í•´ ë°”ìœ„ ë§Œìœ¼ë¡œ ê°€ëŠ” ê¸¸ê³¼ ì“¸ ë§Œí•œ ë¶€í’ˆì„ ì°¾ì•˜ë‹¤.')}
 if(place==='forest'){
  state.knowledge.forest=true;addItem('vine',2);addItem('wood',2);
  if(!state.unlocked.stream){state.unlocked.stream=true;log('ìˆ² ì•ˆìª½ì—ì„œ ë¬¼ì†Œë¦¬ë¥¼ ë“¤ì—ˆë‹¤. ì‘ì€ ê³„ê³¡ìœ¼ë¡œ ì´ì–´ì§€ëŠ” ê¸¸ì„ ì°¾ê³  ë§ˆë¥¸ ê°€ì§€ì™€ ë©êµ´ì„ ì±™ê²¼ë‹¤.')}
  else if(!state.unlocked.cliff){state.unlocked.cliff=true;log('ê³„ê³¡ ë„ˆë¨¸ ëŠ¥ì„ ì„ ë”°ë¼ê°€ ë°”ëŒ ì ˆë²½ìœ¼ë¡œ ì˜¤ë¥´ëŠ” ê¸¸ì„ ì°¾ì•˜ë‹¤. ê²½ì‚¬ê°€ ê°€íŒ”ë¼ ë°§ì¤„ì´ í•„ìš”í•´ ë³´ì¸ë‹¤.')}
  else log('ìˆ²ì„ ë‹¤ì‹œ ì‚´í´ ë§ˆë¥¸ ê°€ì§€ì™€ ë©êµ´ì„ ë” í™•ë³´í–ˆë‹¤.');
 }
 if(place==='cliff'){state.unlocked.lighthouse=true;state.wreck=true;state.knowledge.signal=true;log('ì ˆë²½ ìœ„ì—ì„œ ë‚¡ì€ ë“±ëŒ€ì™€ ë°”ë‹¤ ìª½ì— ë°˜ì¯¤ ì ê¸´ ì–´ì„ ì˜ ìœ„ì¹˜ë¥¼ í™•ì¸í–ˆë‹¤.')}
 advance(2,16);render();
}
function rest(){const gain=state.built.shelter?34:24;state.fatigue=clamp(state.fatigue-gain,0,100);advance(1.5,0);log(`ì•¼ì˜ì§€ì—ì„œ ì‰¬ì—ˆë‹¤. í”¼ë¡œ -${gain}.`);render()}
function drink(){if(state.water<.5)return toast('ë§ˆì‹¤ ë¬¼ì´ ë¶€ì¡±í•´ìš”.');state.water=round1(state.water-.5);state.hp=clamp(state.hp+6,0,100);state.fatigue=clamp(state.fatigue-6,0,100);advance(.25,0);log('ë¬¼ì„ ì¡°ê¸ˆ ë§ˆì‹œê³  ìˆ¨ì„ ëŒë ¸ë‹¤.');render()}
function eat(){if(state.food<.5)return toast('ë¨¹ì„ ê²ƒì´ ë¶€ì¡±í•´ìš”.');state.food=round1(state.food-.5);state.hp=clamp(state.hp+8,0,100);state.fatigue=clamp(state.fatigue-5,0,100);advance(.5,0);log('ê°„ë‹¨íˆ ì‹ì‚¬í–ˆë‹¤.');render()}
function collectWater(){state.knowledge.water=true;state.water=round1(state.water+2.5);advance(1.25,8);log('ê³„ê³¡ë¬¼ì„ ë“ì´ê±°ë‚˜ ì •ìˆ˜í•´ ì‹ìˆ˜ë¡œ ë³´ê´€í–ˆë‹¤. +ë¬¼ 2.5');render()}
function beachSearch(){const gain=state.scouted.beach%2?{cloth:1,wood:1}:{metal:1,wood:1};Object.entries(gain).forEach(([k,v])=>addItem(k,v));state.scouted.beach++;advance(1.25,9);log(`í•´ë³€ì„ ìˆ˜ìƒ‰í•´ ${Object.keys(gain).map(k=>ITEM[k][1]).join('Â·')}ì„ ì°¾ì•˜ë‹¤.`);render()}
function startGather(){
 openModal('ì±„ì§‘ ë¯¸ë‹ˆê²Œì„','FOREST CHOICE',`<p>ì„¸ ê³³ ì¤‘ <b>ë‘ ê³³</b>ë§Œ ì‚´í´ë³¼ ìˆ˜ ìˆì–´ìš”. ìì›ê³¼ ìƒíƒœ ì¤‘ ë¬´ì—‡ì„ ì±™ê¸¸ì§€ ì„ íƒí•˜ì„¸ìš”.</p><div class="cards" id="gatherCards">
 <button class="choice-card" data-g="fallen"><div class="big">ğŸªµ</div><b>ë°”ë‹¥ì˜ ë§ˆë¥¸ ê°€ì§€</b><small>ë‚˜ë¬´ +2 Â· ìƒíƒœ ì˜í–¥ ê±°ì˜ ì—†ìŒ</small></button>
 <button class="choice-card" data-g="vine"><div class="big">ğŸª¢</div><b>ë°”ìœ„ì˜ ë©êµ´</b><small>ë©êµ´ +2 Â· ë°§ì¤„ ì œì‘ ê°€ëŠ¥</small></button>
 <button class="choice-card" data-g="nest"><div class="big">ğŸªº</div><b>ìƒˆ ë‘¥ì§€ ì£¼ë³€</b><small>ìì›ì€ ë§ì•„ ë³´ì´ì§€ë§Œ ê±´ë“œë¦¬ì§€ ì•ŠëŠ” ê²Œ ì¢‹ì•„ìš”</small></button></div><div class="modal-actions"><button id="gatherDone" class="primary">ì„ íƒ ì™„ë£Œ</button></div>`);
 const picked=new Set();$$('#gatherCards button').forEach(b=>b.addEventListener('click',()=>{const v=b.dataset.g;if(picked.has(v)){picked.delete(v);b.classList.remove('selected')}else if(picked.size<2){picked.add(v);b.classList.add('selected')}}));
 $('#gatherDone').onclick=()=>{if(picked.size!==2)return toast('ë‘ ê³³ì„ ì„ íƒí•˜ì„¸ìš”.');let eco=0;if(picked.has('fallen'))addItem('wood',2);if(picked.has('vine'))addItem('vine',2);if(picked.has('nest')){addItem('wood',1);addItem('seed',1);eco=-8}else eco=2;state.eco=clamp(state.eco+eco,0,100);state.skills.gather++;state.knowledge.forest=true;advance(1.75,12);log(`ìˆ²ì—ì„œ ì±„ì§‘í–ˆë‹¤. ìƒíƒœ ì§€ìˆ˜ ${eco>=0?'+':''}${eco}.`);closeModal();render()}
}
function startFishing(){
 if(!state.tools.rod)return toast('ë‚šì‹¯ëŒ€ê°€ í•„ìš”í•´ìš”.');
 openModal('ë‚šì‹œ ë¯¸ë‹ˆê²Œì„','TIDE TIMING',`<p>í° í‘œì‹œê°€ <b>ì´ˆë¡ êµ¬ê°„</b>ì— ìˆì„ ë•Œ ì¤„ì„ ë‹¹ê¸°ì„¸ìš”. ë„ˆë¬´ ê¸‰í•˜ë©´ ë¬¼ê³ ê¸°ê°€ ë¹ ì ¸ë‚˜ê°‘ë‹ˆë‹¤.</p><div class="fish-track"><div id="fishMarker" class="fish-marker"></div></div><div class="modal-actions"><button id="reelBtn" class="primary">ğŸ£ ì§€ê¸ˆ ë‹¹ê¸°ê¸°</button></div>`);
 fishPos=5;fishDir=1;clearInterval(fishTimer);fishTimer=setInterval(()=>{fishPos+=fishDir*3;if(fishPos>=97||fishPos<=3)fishDir*=-1;const m=$('#fishMarker');if(m)m.style.left=fishPos+'%'},45);
 $('#reelBtn').onclick=()=>{clearInterval(fishTimer);const good=fishPos>=38&&fishPos<=62,okay=fishPos>=24&&fishPos<=76;let n=0;if(good)n=2;else if(okay)n=1;if(n){addItem('fish',n);state.food=round1(state.food+n*.6);state.skills.fish++;state.knowledge.fish=true;log(`ë‚šì‹œì— ì„±ê³µí–ˆë‹¤. ìƒì„  +${n}.`)}else log('ë‚šì‹¯ì¤„ì„ ë„ˆë¬´ ê¸‰í•˜ê²Œ ë‹¹ê²¨ ë¬¼ê³ ê¸°ë¥¼ ë†“ì³¤ë‹¤.');advance(1.75,15);closeModal();render();toast(n?'ë‚šì‹œ ì„±ê³µ!':'ë¬¼ê³ ê¸°ë¥¼ ë†“ì³¤ì–´ìš”.')}
}
function startRepair(kind){
 const info={rod:['ë‚šì‹¯ëŒ€','wood:1,vine:1,metal:1'],radio:['ë¬´ì „ê¸°','metal:2,battery:1'],lighthouse:['ë“±ëŒ€ ì¥ì¹˜','metal:3,wood:2'],boat:['ë‚¡ì€ ì–´ì„ ','metal:4,wood:4,cloth:1']}[kind];
 const order=[0,3,1,2];let step=0;
 openModal(`${info[0]} ìˆ˜ë¦¬`,'CIRCUIT REPAIR',`<p>ì „ì›ì´ íë¥´ë„ë¡ <b>ì˜¬ë°”ë¥¸ ìˆœì„œ</b>ë¡œ ì—°ê²°í•˜ì„¸ìš”. í‹€ë¦¬ë©´ ì²˜ìŒë¶€í„° ë‹¤ì‹œ ì—°ê²°í•©ë‹ˆë‹¤.</p><div class="repair-grid">${['ğŸ”‹','âš¡','ğŸ”§','ğŸ”Œ'].map((x,i)=>`<button class="wire" data-wire="${i}">${x}</button>`).join('')}</div><p id="repairHint" class="muted">ì‹œì‘ì ì€ ì „ì›ì…ë‹ˆë‹¤.</p>`);
 $$('.wire').forEach(b=>b.addEventListener('click',()=>{const n=+b.dataset.wire;if(n===order[step]){b.classList.add('on');step++;$('#repairHint').textContent=`${step}/4 ì—°ê²°`;if(step===4)setTimeout(()=>completeRepair(kind),250)}else{step=0;$$('.wire').forEach(x=>x.classList.remove('on'));$('#repairHint').textContent='ì—°ê²°ì´ ëŠê²¼ì–´ìš”. ì „ì›ë¶€í„° ë‹¤ì‹œ!'}}));
}
function completeRepair(kind){
 const costs={rod:{wood:1,vine:1,metal:1},radio:{metal:2,battery:1},lighthouse:{metal:3,wood:2},boat:{metal:4,wood:4,cloth:1}};
 if(!has(costs[kind])){closeModal();toast('í•„ìš”í•œ ì¬ë£Œê°€ ë¶€ì¡±í•´ìš”.');return}
 pay(costs[kind]);state.tools[kind]=true;state.skills.repair++;state.knowledge.circuit=true;advance(kind==='rod'?1.5:3,kind==='rod'?10:20);log(`${{rod:'ë‚šì‹¯ëŒ€',radio:'ë¬´ì „ê¸°',lighthouse:'ë“±ëŒ€ ì¥ì¹˜',boat:'ë‚¡ì€ ì–´ì„ '}[kind]} ìˆ˜ë¦¬ë¥¼ ë§ˆì³¤ë‹¤.`);closeModal();render();
 if(kind==='radio'){state.rescue=100;finish('radio')} if(kind==='lighthouse'){state.rescue=Math.max(state.rescue,85)}
}
function startFarm(){
 if(!state.built.field)return toast('ë¨¼ì € ì‘ì€ ë°­ì„ ë§Œë“¤ì–´ì•¼ í•´ìš”.');
 openModal('ë°­ ëŒë³´ê¸°','FARM MINI GAME',`<p>ë°°ìˆ˜ê°€ ì¢‹ê³  í–‡ë¹›ì´ ë“œëŠ” înŒú¬ìÏØ»'a:¬ê:ço;%*;%eû'a;"ë;'/;!.;&¥Ü]ˆÛ\ÜÏH™˜\›KYÜšYˆYH™˜\›QÜšY‰ÖÂˆÉø¦ ;î#ÉË	úéâ:én;gfI×KÉü'ä©ÉË	úë/;'m:¬è;'¡	×KÉü'ã);î#ÉË	û( zâî{eg;gfI×KÉü'ã$IË	ú­î:â¦	×KÉø¦ ;î#ÉË	úí :äç:çë;&­;gfI×KÉü'ä©‰Ë	û)á;gfI×WK›X\

JOO˜]ÛˆÛ\ÜÏHœİˆ]K\H‰Ú_H‰ŞÌ_OØÜ[‰ŞÌW_OÜÜ[Ø]Û˜
Kš›Ú[Š	ÉÊ_OÙ]]ˆÛ\ÜÏH›[Ù[XXİ[ÛœÈ]ÛˆYH™˜\›QÛ™HˆÛ\ÜÏHœš[X\H»"ë:®,Ø]ÛÙ]˜
NÂˆÛÛœİÛÛÙ[™]ÈÙ]
Ì‹JKXÚÏ[™]ÈÙ]

NÉ	
	Ëœİ	ÊK™›Ü‘XXÚ
O˜‹›Û˜ÛXÚÏJ
OOØÛÛœİJØ‹™]\Ù]œÚYŠXÚËš\ÊŠJ^ÜXÚË™[]JŠNØ‹˜Û\ÜÓ\İœ™[[İ™J	ÙÛÛÙ	Ê_Y[ÙHYŠXÚËœÚ^™OÊ^ÜXÚË˜Y
ŠNØ‹˜Û\ÜÓ\İ˜Y
	ÙÛÛÙ	Ê__JNÂˆ	
	ÈÙ˜\›QÛ™IÊK›Û˜ÛXÚÏJ
OOÚYŠXÚËœÚ^™HOOLÊ\™]\›ˆØ\İ
	û!.;.n;'a;!(;`ç{ef;!.;&¥‰ÊNØÛÛœİØÛÜ™OVË‹‹œXÚ×K™š[\ŠO™ÛÛÙš\ÊŠJK›[™İÚYŠİ]Kš[‹œÙYYL
^ØÛÜÙS[Ù[

NÜ™]\›ˆØ\İ
	û%*;%eû'm;%á»%­;&¥‰Ê_\İ]Kš[‹œÙYYKNÜİ]K™˜\›PØ\™O\ØÛÜ™OLÌŒNÜİ]KœÚÚ[Ë™˜\›JÊÎÜİ]KšÛ›İÛYÙK™˜\›O]YNØY˜[˜ÙJKKL
NÛÙÊ:ì+{'a:ãã:í):âéˆ;%c:éç»'`;'¤:é«	ÜØÛÜ™_KÌË˜
NØÛÜÙS[Ù[

NÜ™[™\Š
NİØ\İ
ØÛÜ™OOOLÏÉû%a;(ï;(¢û'`;'¤:é«;&";&¥IÎ‰úâé;'c;%ä:â¥:ì,;"&;&`;e¡úîfû'a:ãe; ­;c­:ìí;!.;&¥‰Ê_BŸB™[˜İ[ÛˆZ[
Ú[™
^ÂˆÛÛœİÙ™Ï^ÂˆÚ[\ØÛÜİİÛÛÙŒËš[™NŒ_K\ÙÎ‰ú¬l;,¦:éo:ìí:¬%{e¢:âéˆ:ì);'f;e/:èg;)§z¬ :¬ ;)!;%­:äè:âé‰ßK˜Z[ØÛÜİİÛÛÙŒ‹ÛİŒ_K\ÙÎ‰úîeúë/;( ;'©{a­{'a:éã:äé;%â:âéˆ:îa;&):â¥:à¨;'¤:ãæ{'/:èg:ë/;'m:êª;'n:âé‰ßKšY[ØÛÜİİÛÛÙŒ‹İÛ™NŒŸK\ÙÎ‰ú¬á:¬èH:¬ :®c;'m;%ä;'¤{'`:ì+{'a:éã:äé;%â:âé‰ßKZ[™ÎØÛÜİİÛÛÙŒËš[™NŒŸK\ÙÎ‰ú¬m;(l:ã :éo:éã:äé;%â:âéˆ; ç{!(:¬ï;"&;fezë/:ìí:­ ;'m;"k;&ã;(c:âé‰ßKÛÜÎØÛÜİİÛÛÙŒËİÛ™NŒßK\ÙÎ‰ûem:ìà;%ä;`lÓÔÈ;dg;"ç{'a:éã:äé;%â:âéˆ:­k;(l;"è;f.:¬ :â";%ä:ça:®,;"k;&ã;(c:âé‰ßKš\™NØÛÜİİÛÛÙŒ‹İÛ™NŒŸK\ÙÎ‰û%b;(!;eg;fe:ãe{'a:éã:äé;%â:âé‰ßBˆVÚÚ[™NÂˆYŠZ\ÊÙ™Ë˜ÛÜİ
J\™]\›ˆØ\İ
	û'«:èã:¬ :í ;(l{em;&¥‰ÊNÜ^JÙ™Ë˜ÛÜİ
NÚYŠÚ[™OOIÜÚ[\‰Ê\İ]K˜Z[œÚ[\SX]›Z[Š‹İ]K˜Z[œÚ[\ŠÌJNÙ[ÙHİ]K˜Z[ÚÚ[™O]YNÚYŠÚ[™OOIÜÛÜÉÊ\İ]Kœ™\ØİYOXÛ[\
İ]Kœ™\ØİYJÌKL
NØY˜[˜ÙJKKLJNÛÙÊÙ™Ë›\ÙÊNÜ™[™\Š
NÂŸB™[˜İ[ÛˆÜ˜Y
Ú[™
^ÂˆÛÛœİÏ^Ü›ÜNØÛÜİİš[™NŒŸKÎŠ
OO˜Y][J	Ü›ÜIËJK˜[YN‰úì)û)!	ßK›ÙØÛÜİİÛÛÙŒKš[™NŒKY][Œ_KÎŠ
OOØÛÜÙS[Ù[

NÜİ\™\Z\Š	Ü›Ù	ÊNÜ™]\›ˆ˜[Ù_K˜[YN‰úà¦»"ëúã 	ßKZ\œ›ÜØÛÜİÛY][Œ_KÎŠ
OOÜİ]KÛÛË›Z\œ›Ü]YNÜİ]Kœ™\ØİYJÏLLK˜[YN‰úì&; «;"è;f.;c$	ß_VÚÚ[™NÂˆYŠXßZ\ÊË˜ÛÜİ
J\™]\›ˆØ\İ
	û'«:èã:¬ :í ;(l{em;&¥‰ÊNÚYŠÚ[™OOIÜ›Ù	Ê\^JË˜ÛÜİ
NØÛÛœİÛÏXË™Ê
NÚYŠÛÈOOY˜[ÙJ^ØY˜[˜ÙJÍKJNÛÙÊ	ØË›˜[Y_{'a:éã:äé;%â:âé˜
NØÛÜÙS[Ù[

NÜ™[™\Š
_BŸB™[˜İ[ÛˆÜ[Ü˜Y

^ÛÜ[“[Ù[
	û ç{(m;(';'¤IË	Ô‘TÓÕTÑHÒRS‰Ë]ˆÛ\ÜÏH˜Ü˜Y[\İ‚ˆ	ØÜ˜Y›İÊ	ü'éíIË	úì)û)!	Ë	úãjz­mˆ8¡¤ˆ;(":ì¯H;'m:ãæH:¬ :â©IË	Ü›ÜIËİš[™NŒŸKİ]Kš[‹œ›ÜOŒ
_Bˆ	ØÜ˜Y›İÊ	ü'ã¨ÉË	úà¦»"ëúã 	Ë	úà¦:ë-H
È:ãjz­mH
È:®";!£HH8¡¤ˆ:à¦»"ç	Ë	Ü›Ù	ËİÛÛÙŒKš[™NŒKY][Œ_Kİ]KÛÛËœ›Ù
_Bˆ	ØÜ˜Y›İÊ	ø§*	Ë	úì&; «;"è;f.;c$	Ë	ú®";!£HH8¡¤ˆ:­k;(l;"è;f.
ÌL	Ë	ÛZ\œ›Ü‰ËÛY][Œ_Kİ]KÛÛË›Z\œ›ÜŠ_BˆÙ]˜
NÉ	
	ÖÙ]KXÜ˜YIÊK™›Ü‘XXÚ
O˜‹›Û˜ÛXÚÏJ
OO˜Ü˜Y
‹™]\Ù]˜Ü˜Y
J_B™[˜İ[ÛˆÜ˜Y›İÊXÛÛ‹˜[YK\ØËYÛÜİÛ™J^Ü™]\›ˆ]ˆÛ\ÜÏH˜Ü˜Y\›İÈÜ[ˆİ[OH™›Û\Ú^™NŒKÜ™[H‰ÚXÛÛŸOÜÜ[]‰Û˜[Y_OØ]ˆÛ\ÜÏH›]]Yˆİ[OH™›Û\Ú^™N‹Íœ™[NÛX\™Ú[‹]ÜŒÜ‰Ù\ØßOÙ]Ù]]ÛˆÛ\ÜÏH‰ÙÛ™OÉÜÙXÛÛ™\IÎ‰Üš[X\IßHˆ]KXÜ˜YH‰ÚYHˆ	ÙÛ™OÉÙ\ØX›Y	Î‰ÉßO‰ÙÛ™OÉû&a:èã	Î‰û(';'¤IßOØ]ÛÙ]˜B™[˜İ[ÛˆÚYÛ˜[

^ÚYŠİ]KÛÛË›YÚİ\ÙI‰œİ]Kœ™\ØİYONJ\™]\›ˆš[š\Ú
	ÛYÚİ\ÙIÊNÚYŠİ]K˜Z[œÛÜÊ^Üİ]Kœ™\ØİYOXÛ[\
İ]Kœ™\ØİYJÌL‹L
NØY˜[˜ÙJKÊNÛÙÊ	úá¤»'`:¬ìú¬ï;em:ìà;'fÓÔúéo;'m;&ª{em:­k;(l;"è;f.:éo:ì&:ìí{e¢:âé‰ÊNÚYŠİ]Kœ™\ØİYOLL
Yš[š\Ú
	ÛYÚİ\ÙIÊNÙ[ÙH™[™\Š
_Y[ÙHØ\İ
	úê/;( ;em:ìà;%äÓÔÈ;dg;"ç{'a:éã:äé;%­:ìí;!.;&¥‰Ê_B™[˜İ[ÛˆÙ]J
^ÚYŠİ]K™^O
\™]\›ˆØ\İ
	û(%{,*{'a:¬¬;(%{ef:®,;%å;%a;)àH;'m:én:¬ È:¬&{%a;&¥‰ÊNÙš[š\Ú
ÚÛÜÙTÙ][Y[

J_B™[˜İ[ÛˆÚÛÜÙTÙ][Y[

^ØÛÛœİÏ\İ]KœÚÚ[ÎÚYŠİ]KÛÛË›YÚİ\ÙI‰œËœ™\Z\LÉ‰œİ]K˜Z[œ˜Z[Š\™]\›‰ÚÙY\\‰ÎÚYŠİ]K˜Z[™šY[	‰œİ]K˜Z[™Z[™É‰œİ]K˜Z[œ˜Z[‰‰œİ]K˜Z[œÚ[\L‰‰œÙ[”İY™šXÚY[˜ŞJ
OMÍJ\™]\›‰İš[YÙIÎÚYŠØš™Xİ˜[Y\Êİ]KšÛ›İÛYÙJK™š[\Š›ÛÛX[ŠK›[™İMÉ‰œİ]K™XÛÏNŠ\™]\›‰Ü™\ÙX\˜Ú\‰ÎÚYŠË™˜\›OLÊ\™]\›‰Ù˜\›Y\‰ÎÚYŠË™š\ÚLÊ\™]\›‰Ùš\Ú\‰ÎÚYŠË™Ø]\LÉ‰œİ]K™XÛÏMÍJ\™]\›‰ÙØ]\™\‰ÎÜ™]\›‰Üİ\š]›Ü‰ßB™[˜İ[ÛˆÙ[”İY™šXÚY[˜ŞJ
^Ü™]\›ˆÛ[\
İ]K˜Z[œÚ[\ŠŒL
Êİ]K˜Z[œ˜Z[ÌLŒ
JÊİ]K˜Z[™šY[ÌMNŒ
JÊİ]K˜Z[™Z[™ÏÌLŒ
JÊİ]KÛÛËœ›ÙÎŒ
JÓX]›Z[ŠŒ
İ]KØ]\ŠÜİ]K™›ÛÙ
JŒŠJÓØš™Xİ˜[Y\Êİ]KœÚÚ[ÊKœ™YXÙJ
KŠOO˜JØ‹
JŒËL
_B™[˜İ[Ûˆš[š\Ú
Y
^ÚYŠİ]K™[™Y
\™]\›Üİ]K™[™Y]YNÜØ]™Q[™[™ÊY
NÜØ]™JYJNØÛÛœİOQS‘S‘ÔÖÚYNÛÜ[“[Ù[
VÌWK	ÑS‘S‘È	ÊÔİš[™ÊØš™XİšÙ^\ÊS‘S‘ÔÊKš[™^ÙŠY
JÌJKœYİ\
‹	Ì	ÊK]ˆÛ\ÜÏH™[™[™Ë\™]™X[]ˆÛ\ÜÏHšXÛÛˆ‰ÙVÌ_OÙ]‰ÙVÌW_OÚ‰ÙVÌ—_OÜ]ˆÛ\ÜÏH™[™[™Ë\][İH¸ '	ÙVÌ×_x 'OÙ]Û\ÜÏH›]]Y» ç{(m	Üİ]K™^_{'o0­È;'¤:®"zãá	ÜÙ[”İY™šXÚY[˜ŞJ
_H0­È; ç{`ç	Üİ]K™XÛßOÜ]ˆÛ\ÜÏH›[Ù[XXİ[ÛœÈ]ÛˆYH™[™[™ÒÛYHˆÛ\ÜÏHœÙXÛÛ™\H»%å:å*H:ãá:¬$:ìí:®,Ø]Û]ÛˆYH™[™[™ĞYØZ[ˆˆÛ\ÜÏHœš[X\Hºâé;"ç;dg:éf;ef:®,Ø]ÛÙ]Ù]˜
NÉ
	ÈÙ[™[™ĞYØZ[‰ÊK›Û˜ÛXÚÏJ
OOØÛÜÙS[Ù[

NÜÚİÔİ\

_NÉ
	ÈÙ[™[™ÒÛYIÊK›Û˜ÛXÚÏ\ÚİÑ[™[™ÜÎÜ™[™\Š
_B™[˜İ[ÛˆØ[YSİ™\Š
^Üİ]K™[™Y]YNÜØ]™JYJNÛÜ[“[Ù[
	ú­k;(l:éo:®,:âé:é«;)à:ê®ûe¢:âé	Ë	ÔÕT•’USRSQ	Ë]ˆÛ\ÜÏH™[™[™Ë\™]™X[]ˆÛ\ÜÏHšXÛÛˆ¼'ã$OÙ]» ç{(m;"é;c*Ú»%­:å©;'¤;&ä;'m:ê/;( :í ;(l{em;(c:â¥;)à;'o;)à:éo;fe{'n;em:ìí;!.;&¥ˆ:âé;'c;dg:éf;%ä;!/:â¥;ef:èê;%g»'a:à­:âé:ìí:â¥;!(;`ç{'m;ea;&¥;ejzââ:âéÜ]ˆÛ\ÜÏH›[Ù[XXİ[ÛœÈ]ÛˆYHœ™]PˆˆÛ\ÜÏHœš[X\Hºâé;"ç:ãá;(!Ø]ÛÙ]Ù]˜
NÉ
	ÈÜ™]P‰ÊK›Û˜ÛXÚÏJ
OOØÛÜÙS[Ù[

NÜİ\
Ù[XİYY™Š__B