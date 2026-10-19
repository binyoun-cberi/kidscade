/* DOM-only historical view. All text is assigned through textContent. */
(function(root){
'use strict';
const G=root.OneLifeGoryeo343,$=id=>document.getElementById(id);
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function certificate(l){const g=G.ensure(l),values={birthName:l.profile.name,birthPlace:g.region,birthGender:l.gender,birthDate:l.birthYear+'년 출생',birthFamily:l.familyLevel+' · '+g.origin,birthMother:'어머니 · 농사와 길쌈',birthFather:'아버지 · '+l.profile.fatherJob,birthSiblings:'집안의 식구들과 함께 자란다',birthHome:'곡식과 옷감을 마련하며 꾸리는 살림',birthContext:'고려 후기 · '+G.period(l),birthEraNote:'출신·지역·성별에 따라 배움과 생업의 여건이 다릅니다. 자원과 사건의 확률은 게임용으로 구성했습니다.',birthCountry:'고려의 한반도',certificateTitle:'고려에서 시작하는 한 생',birthTicketMark:'生',birthTicketKind:'고려 후기 출생 기록',birthTicketFoot:'1200–1391년 출생 · 가상의 인물',birthTagline:'전란과 변화 속에서도 한 집의 삶은 이어집니다.',birthHeading:'고려의 어느 집, 한 아이가 태어납니다.',birthFlag:'生'};
 for(const [id,text]of Object.entries(values))if($(id))$(id).textContent=text;
 $('birthCertificate').classList.remove('hidden');
 $('birthLineage').classList.add('hidden');$('hopaDisplay').classList.add('hidden');
}
function scene(canvas,l,g){const c=canvas.getContext('2d');canvas.width=720;canvas.height=220;c.fillStyle='#d7dfc6';c.fillRect(0,0,720,220);c.fillStyle='#93a28b';c.beginPath();c.moveTo(0,145);c.lineTo(120,30);c.lineTo(240,145);c.lineTo(390,47);c.lineTo(550,145);c.lineTo(660,63);c.lineTo(720,130);c.fill();c.fillStyle='#adbb8a';c.fillRect(0,140,720,80);
 c.fillStyle='#79999c';c.fillRect(0,180,720,40);c.fillStyle='#e0cb9c';c.fillRect(200,161,400,34);
 for(let n=0;n<3;n++){const x=50+n*220;c.fillStyle='#e8d7ad';c.fillRect(x,116,120,54);c.fillStyle='#6c7366';c.beginPath();c.moveTo(x-18,118);c.lineTo(x+60,81);c.lineTo(x+138,118);c.fill();c.fillStyle='#725e47';c.fillRect(x+46,138,25,32);}
 if(g.refuge){c.fillStyle='#9b805b';c.beginPath();c.moveTo(285,179);c.lineTo(335,112);c.lineTo(385,179);c.fill();}
 for(let i=0;i<4;i++){const x=245+i*36;c.fillStyle='#b69a75';c.fillRect(x,154,9,10);c.fillStyle=i===0?'#365e58':'#8a6658';c.fillRect(x-3,164,15,20);c.fillStyle='#423f36';c.fillRect(x,151,9,4);}

}
function paint(l,handlers){
 const g=G.ensure(l),host=$('goryeoPlay');host.hidden=false;host.replaceChildren();
 const head=el('header',undefined,'goryeo-head');head.append(el('span',l.year<1392?'高麗 · 고려 후기':'朝鮮 · 이어지는 삶','goryeo-kicker'),el('h1',l.profile.name+'의 한 생'),el('p',l.year+'년 · '+l.age+'세 · '+g.region+' · '+G.period(l)));host.append(head);
 const controls=el('div',undefined,'goryeo-controls');for(const [label,fn,disabled]of [[handlers.paused?'시간 이어가기':'잠시 멈추기',handlers.pause,false],['한 해 보내기',handlers.next,!!l.pending]]){const b=el('button',label);b.disabled=disabled;b.onclick=fn;controls.append(b);}controls.append(el('small',l.pending?'선택을 기다리고 있습니다.':handlers.paused?'시간이 멈춰 있습니다.':'시간이 흐르고 있습니다.'));host.append(controls);
 const canvas=el('canvas');canvas.setAttribute('aria-label',g.region+'의 마을과 식구들');canvas.setAttribute('role','img');scene(canvas,l,g);host.append(canvas);
 const state=el('div',undefined,'goryeo-resources');for(const [a,b]of [['건강',l.stats.health+' / 100'],['곡식',g.grain+'몫'],['옷감',g.cloth+'필'],['내 몫',g.pocket+'몫']]){const box=el('div');box.append(el('small',a),el('strong',b));state.append(box);}host.append(state);
 const choice=l.getChoice();if(choice){const panel=el('section',undefined,'goryeo-decision');panel.setAttribute('aria-live','polite');panel.append(el('small','삶의 갈림길'),el('h2',choice.title),el('p',choice.description));choice.options.forEach((o,i)=>{const b=el('button',o.label);b.onclick=()=>handlers.choose(i);panel.append(b);});host.append(panel);}
 const grid=el('div',undefined,'goryeo-grid');const family=el('section');family.append(el('h2','함께 꾸리는 살림'),el('p',g.origin+' · '+(g.bound?'예속된 처지':g.job)+' · '+g.belief));if(g.away)family.append(el('p','집을 떠나 있는 중 · 남은 식구들이 생업을 맡습니다.'));
 for(const p of g.people){const row=el('div',undefined,'goryeo-person');row.append(el('strong',p.name),el('small',(l.year-p.birthYear)+'세 · '+(p.alive?'건강 '+Math.round(p.health):'세상을 떠남')));
  if(p.alive){const select=el('select');select.setAttribute('aria-label',p.name+'의 올해 일');const age=l.year-p.birthYear;
   for(const plan of G.plans){if(plan==='솜이불 만들기'&&!G.cottonAvailable(l))continue;if(age<14&&!['배움','돌봄','휴식'].includes(plan))continue;if(g.bound&&!['농사','돌봄','휴식'].includes(plan))continue;const o=el('option',plan);o.value=plan;select.append(o);}select.value=p.plan;select.disabled=l.age<14||age<6||!!g.away||!!l.pending;select.onchange=()=>handlers.action('plan',p.id,select.value);row.append(select);}
  family.append(row);
 }
 family.append(el('small','어린 식구는 배움·돌봄·휴식에 품을 씁니다. 생업에 품을 쓰면 소출과 피로가 함께 쌓입니다.'));
 const work=el('section');work.append(el('h2','생업과 살림'),el('p','올해 마련한 곡식 '+g.lastIncome+'몫 · 쓴 곡식 '+g.lastExpense+'몫'),el('p','경작 기반 '+g.land+' · 익힌 기술 '+Math.floor(g.skill)),el('p',g.refuge?'피란 중이라 소출이 줄어듭니다.':'친족의 왕래와 일손으로 살림을 이어 갑니다.'));
 for(const [id,label]of [['cloth','옷감'],['clothes','옷'],['quilts','솜이불']]){const b=el('button',label+' '+g[id]+'개 · 장에 팔기');b.disabled=!g[id]||l.age<14||!!g.away||g.bound||!!l.pending;b.onclick=()=>handlers.action('sell',id);work.append(b);}
 const crops=el('select');crops.setAttribute('aria-label','집안의 작물');for(const crop of ['곡식',...(G.cottonAvailable(l)?['목화']:[])]){const o=el('option',crop);o.value=crop;crops.append(o);}crops.value=g.crop;crops.disabled=l.age<14||g.bound||!!g.away||!!l.pending;crops.onchange=()=>handlers.action('crop','',crops.value);work.append(crops,el('p',g.cottonTrial?'목화 재배를 시험하는 중입니다. 여러 해를 기다려야 합니다.':G.cottonAvailable(l)?'목화를 기르고 실을 뽑을 길이 열렸습니다.':'삼베와 모시를 마련합니다. 목화는 재배법과 씨앗을 구한 뒤에 이용할 수 있습니다.'),el('small','곡식·옷감·경작 기반은 실제 가격이나 토지 면적을 재현한 수치가 아닙니다.'));
 grid.append(family,work);host.append(grid);
 if(g.history.length){const history=el('section',undefined,'goryeo-history');history.append(el('h2','이 시대에 일어난 일'));for(const f of g.history.slice(-3)){history.append(el('strong',f.year+' · '+f.title),el('p',f.text));}host.append(history);}
 const records=el('section',undefined,'goryeo-records');records.append(el('h2','살아온 기록'));for(const e of l.log.slice(-18).reverse())records.append(el('p',e.year+'년 · '+e.age+'세 — '+e.text));host.append(records);
}
root.OneLifeGoryeoView343={paint,certificate};
})(window);
