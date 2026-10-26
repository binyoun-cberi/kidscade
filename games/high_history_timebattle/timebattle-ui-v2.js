/* Progressive UI enhancement for History Timebattle; existing select IDs remain source of truth. */
(function(){
  'use strict';
  const byId=id=>document.getElementById(id);
  const DESCRIPTIONS={
    choice:{title:'전체 한국사',detail:'사건·유물·제도 종합'},
    ox:{title:'OX 번개',detail:'빠르게 사실 판단하기'},
    mixed:{title:'객관식 + OX',detail:'두 가지 유형 번갈아'},
    people:{title:'역사 인물',detail:'업적을 보고 이름 맞히기'},
    heritage:{title:'문화유산',detail:'특징을 보고 이름 맞히기'},
    'choice-short':{title:'직접 답하기',detail:'객관식 + 주관식 섞기'},
    short:{title:'단답형',detail:'정답을 키보드로 직접 입력'},
    'figure-sort':{title:'시대별 인물 모으기',detail:'인물 카드를 시대별로 끌어다 놓기'}
  };
  const SETTINGS=[
    {section:'hostSetup',mode:'questionMode',era:'hostEraPicker',order:'orderMode',count:'questionCount',custom:['checkpointMode','checkpointCustom'],preset:true},
    {section:'soloSetup',mode:'soloQuestionMode',era:'soloEraPicker',order:'soloOrderMode',count:'soloQuestionCount',preset:false},
    {section:'roundSetup',mode:'roundQuestionMode',era:'roundEraPicker',order:'roundOrderMode',count:'roundQuestionCount',custom:['roundCheckpointMode','roundCheckpointCustom'],score:'roundScoreMode',preset:true}
  ];
  const panels=[];
  function make(tag,className,text){
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=text;
    return node;
  }
  function fold(label){
    const wrapper=make('details','setup-details');
    const summary=make('summary');
    const title=make('span','summary-label',label);
    const value=make('span','summary-value');
    summary.append(title,value);
    const body=make('div','details-body');
    wrapper.append(summary,body);
    return {wrapper,body,value};
  }
  function build(section){
    const node=byId(section.section),select=byId(section.mode),grid=select?.closest('.grid');
    if(!node||!select||!grid||node.classList.contains('enhanced'))return;
    const field=select.closest('.field');
    const modePanel=make('section','setup-mode-panel');
    modePanel.setAttribute('aria-label','문제 유형');
    modePanel.append(make('div','setup-kicker','문제 유형 선택'),make('h3','','오늘은 무엇을 풀까요?'));
    grid.before(modePanel);
    modePanel.append(field);
    field.classList.add('mode-selector');
    const cards=make('div','mode-grid');
    cards.setAttribute('role','group');cards.setAttribute('aria-label','문제 유형 선택');
    field.append(cards);
    // Mode cards become the keyboard and screen-reader controls; keep the select for the existing game logic.
    select.tabIndex=-1;
    select.setAttribute('aria-hidden','true');
    const buttons=[];
    for(const option of select.options){
      const info=DESCRIPTIONS[option.value]||{title:option.textContent,detail:'문제 유형'};
      const button=make('button','mode-card');
      button.type='button';button.dataset.mode=option.value;
      button.setAttribute('aria-pressed','false');
      button.append(make('b','',info.title),make('small','',info.detail));
      button.addEventListener('click',()=>{
        select.value=option.value;
        select.dispatchEvent(new Event('change',{bubbles:true}));
      });
      cards.append(button);buttons.push(button);
    }
    grid.classList.add('setup-essentials');
    if(section.section==='soloSetup'){
      const name=byId('soloNickname')?.closest('.field');
      if(name)modePanel.after(name);
    }
    if(section.preset){
      const presets=node.querySelector(':scope > .preset-row');
      if(presets){
        const item=fold('추천 설정 바로 적용');
        item.value.textContent='선택 사항';
        modePanel.after(item.wrapper);
        item.body.append(presets);
        presets.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
          item.wrapper.open=false;
          refresh();
        }));
      }
    }
    const eraField=byId(section.era)?.closest('.field');
    let eraFold=null;
    if(eraField){
      eraFold=fold('학습 시대 고르기');
      eraFold.wrapper.classList.add('era-details');
      grid.after(eraFold.wrapper);
      eraFold.body.append(eraField);
      byId(section.era).querySelectorAll('input[type="checkbox"]').forEach(input=>input.addEventListener('change',refresh));
      eraField.querySelectorAll('.era-tools button').forEach(button=>button.addEventListener('click',refresh));
    }
    const advanced=fold('세부 설정');
    advanced.value.textContent='출제 순서 · 순위 설정';
    (eraFold?.wrapper||grid).after(advanced.wrapper);
    const fields=make('div','advanced-fields');
    advanced.body.append(fields);
    const orderField=byId(section.order)?.closest('.field');
    if(orderField)fields.append(orderField);
    if(section.custom){
      const checkpoint=byId(section.custom[0])?.closest('.field');
      const extra=byId(section.custom[1]);
      if(checkpoint)fields.append(checkpoint);
      if(extra)advanced.body.append(extra);
    }
    if(section.score){
      const scoreField=byId(section.score)?.closest('.field');
      if(scoreField)fields.append(scoreField);
    }
    node.querySelectorAll(':scope > .grid').forEach(unused=>{if(!unused.children.length)unused.remove();});
    select.addEventListener('change',()=>{
      if(select.value==='short'){
        const secondsId=section.section==='hostSetup'?'seconds':section.section==='soloSetup'?'soloSeconds':'roundSeconds';
        const time=byId(secondsId);
        if(time&&Number(time.value)<20)time.value='20';
      }
      refresh();
    });
    byId(section.count)?.addEventListener('change',refresh);
    panels.push({section,select,buttons,eraFold,advanced});
    node.classList.add('enhanced');
  }
  function refresh(){
    for(const {section,select,buttons,eraFold,advanced} of panels){
      const selected=select.value;
      for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.mode===selected));
      if(section.section==='soloSetup'){
        const sorting=selected==='figure-sort';
        byId('soloSetup').classList.toggle('sort-mode-selected',sorting);
        byId('sortSoloOptions')?.classList.toggle('hidden',!sorting);
        byId('soloModeIntro').textContent=sorting
          ?'인물 카드를 알맞은 시대에 모으는 놀이예요. 시대 구간과 카드 수를 고른 뒤 시작해요.'
          :'방 코드 없이 바로 시작해요. 정답과 해설을 확인한 뒤 원하는 때 다음 문제로 넘어갈 수 있어요.';
        if(sorting)window.HistoryFigureSortUI?.renderStages();
      }
      if(eraFold){
        const chosen=[...byId(section.era).querySelectorAll('input[type="checkbox"]:checked')].map(input=>input.value);
        const total=byId(section.era).querySelectorAll('input[type="checkbox"]').length;
        const label=chosen.length===total?'전체 시대 · '+total+'개':chosen.length===0?'시대를 선택해 주세요':chosen.length<=2?chosen.join(' · '):chosen.length+'개 시대 선택';
        eraFold.value.textContent=label;
        eraFold.wrapper.classList.toggle('needs-attention',!chosen.length);
      }
      if(section.custom){
        const cp=byId(section.custom[0]);
        if(cp?.value==='custom'&&byId(section.custom[1])?.classList.contains('hidden')===false)advanced.wrapper.open=true;
      }
    }
  }
  function init(){
    SETTINGS.forEach(build);refresh();
  }
  window.TimebattleUI={init,refresh,openEra(id){
    const item=panels.find(panel=>panel.section.era===id);
    if(item?.eraFold)item.eraFold.wrapper.open=true;
  }};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
