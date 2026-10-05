/* 촌장 시뮬레이터 v10 — 도시계획 UI/렌더러 */
((root) => {
  "use strict";
  const C = root.IslandCityCore;
  if (!C) return;

  let selectedTool = "road";
  let selectedOverlay = "none";

  const toolButtons = [
    ["road","🛣️","도로"],["residential","🏠","주거"],["commercial","🏪","상업"],["industrial","🏭","산업"],
    ["powerLine","⚡","전선"],["pipe","💧","수도관"],["powerPlant","🔋","발전소"],["waterTower","🚰","급수탑"],
    ["park","🌳","공원"],["school","🏫","학교"],["clinic","🏥","진료소"],["police","🚓","경찰서"],
    ["fire","🚒","소방서"],["repair","🛠️","복구"],["bulldoze","🧹","철거"]
  ];
  const overlayButtons = [
    ["none","일반"],["growth","성장"],["commute","통근"],["traffic","교통"],
    ["power","전력"],["water","수도"],["services","서비스"],["landValue","지가"],["pollution","오염"]
  ];

  function fmt(n) {
    const x = Number(n || 0);
    return x.toFixed(1).replace(/\.0$/,"");
  }

  function demandChip(label,value) {
    const sign=value>0?"+":"";
    const tone=value>=25?" hot":value<=-20?" cold":"";
    return '<span class="city-demand'+tone+'"><b>'+label+'</b> '+sign+value+'</span>';
  }

  function meter(label,value,note,tone="") {
    return '<span class="city-infra'+tone+'"><small>'+label+'</small><b>'+value+'</b><em>'+note+'</em></span>';
  }

  function panelHTML(city) {
    const s=C.summary(city);
    const net=s.netIncome>=0?"+"+fmt(s.netIncome):fmt(s.netIncome);
    const powerTone=s.poweredRate<70?" danger":s.poweredRate<90?" warn":"";
    const waterTone=s.wateredRate<70?" danger":s.wateredRate<90?" warn":"";
    const commuteTone=s.commuteSuccess<60?" danger":s.commuteSuccess<85?" warn":"";
    return '<div class="city-panel">' +
      '<h2>🗺️ 마을 도시계획</h2>' +
      '<p class="intro">도로를 따라 주민이 실제로 통근하고, 전선·수도관이 연결된 구역만 안정적으로 성장합니다. 공공시설은 도로망을 따라 주변을 지원하고 운영비가 듭니다.</p>' +
      '<div class="city-kpis">' +
        '<span><small>도시 예산</small><b>🪙 '+fmt(s.funds)+'</b><em>세입 '+fmt(s.taxIncome)+' · 유지비 '+fmt(s.maintenance)+' · 순 '+net+'/주</em></span>' +
        '<span><small>개발</small><b>'+s.developed+'칸</b><em>집 '+s.homes+' · 일자리 '+s.jobs+'</em></span>' +
        '<span><small>도로망</small><b>'+s.connectedRoads+'/'+s.roads+'</b><em>파손 '+s.damaged+'칸 · 평균 교통 '+s.avgTraffic+'</em></span>' +
      '</div>' +
      '<div class="city-budget-controls"><span><small>도시 세율</small><b id="cityTaxRate">'+s.taxRate+'%</b></span>' +
        '<button type="button" data-city-tax="-1" aria-label="도시 세율 1퍼센트포인트 낮추기">−</button>' +
        '<button type="button" data-city-tax="1" aria-label="도시 세율 1퍼센트포인트 높이기">+</button>' +
        '<em>세율이 높으면 세입은 늘지만 R/C/I 수요가 낮아질 수 있어요. 서비스 예산 충족 '+s.budgetRatio+'%</em></div>' +
      '<div class="city-demand-row">'+
        demandChip("R 주거",s.demand.residential)+
        demandChip("C 상업",s.demand.commercial)+
        demandChip("I 산업",s.demand.industrial)+
      '</div>' +
      '<div class="city-infra-grid">' +
        meter("⚡ 전력",s.poweredRate+"%",fmt(s.powerServed)+"/"+fmt(s.powerDemand)+" 공급",powerTone) +
        meter("💧 수도",s.wateredRate+"%",fmt(s.waterServed)+"/"+fmt(s.waterDemand)+" 공급",waterTone) +
        meter("🚗 통근",s.commuteSuccess+"%","평균 "+fmt(s.avgCommute)+"칸 · 실패 "+s.failedTrips,commuteTone) +
        meter("🏙️ 서비스",s.serviceScore,"치안 "+s.avgCrime+" · 오염 "+s.avgPollution) +
      '</div>' +
      '<div class="city-toolbar" aria-label="도시 건설 도구">' +
        toolButtons.map(([id,icon,label])=>'<button type="button" data-city-tool="'+id+'" aria-pressed="'+(selectedTool===id)+'">'+icon+'<span>'+label+'</span></button>').join("") +
      '</div>' +
      '<div class="city-overlaybar" aria-label="도시 정보 지도">' +
        overlayButtons.map(([id,label])=>'<button type="button" data-city-overlay="'+id+'" aria-pressed="'+(selectedOverlay===id)+'">'+label+'</button>').join("") +
      '</div>' +
      '<div class="city-canvas-wrap"><canvas id="cityCanvas" width="576" height="432" aria-label="도로, 구역, 전력, 수도와 공공서비스를 직접 배치하는 도시계획 지도"></canvas></div>' +
      '<div id="cityTileInfo" class="city-tile-info">타일을 가리키면 통근·전력·수도·서비스·피해 상태를 볼 수 있어요.</div>' +
      '<div class="city-explain"><span>평균 지가 <b>'+s.avgLandValue+'</b></span><span>통근 성공 <b>'+s.commuteSuccess+'%</b></span><span>평균 오염 <b>'+s.avgPollution+'</b></span></div>' +
      '<div class="locked-card">💡 성장 조건: <b>연결 도로 + 목적지까지 통근 + 전력 + 수도</b>. 홍수·폭풍으로 파손된 도로나 기반시설은 연결이 끊길 수 있으니 🛠️ 복구 도구로 고치세요.</div>' +
      '</div>';
  }

  function heat(value,positive) {
    const v=Math.max(0,Math.min(100,Number(value)||0))/100;
    if(positive)return 'rgba('+Math.round(70+70*(1-v))+','+Math.round(120+100*v)+',95,'+(.18+v*.48)+')';
    return 'rgba('+Math.round(130+100*v)+','+Math.round(170-80*v)+',70,'+(.16+v*.50)+')';
  }

  function civicStyle(type) {
    return ({
      park:["#2f7e4a","공"],school:["#ead9a3","학"],clinic:["#d5ece8","진"],
      police:["#b8d3ef","경"],fire:["#edc0a9","소"],powerPlant:["#e8d17a","전"],waterTower:["#9fd6e4","수"]
    })[type] || ["#d5ece8","?"];
  }

  function draw(rootNode,city) {
    const canvas=rootNode.querySelector("#cityCanvas");
    if(!canvas)return;
    const ctx=canvas.getContext("2d");
    if(!ctx)return;
    const tw=canvas.width/city.width,th=canvas.height/city.height;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.imageSmoothingEnabled=false;

    for(let y=0;y<city.height;y++)for(let x=0;x<city.width;x++){
      const t=C.cell(city,x,y),px=x*tw,py=y*th;
      ctx.fillStyle=t.terrain==="water"?"#4e91aa":t.terrain==="forest"?"#4d7750":"#82a96b";
      ctx.fillRect(px,py,tw,th);

      if(t.zone){
        ctx.globalAlpha=.32;
        ctx.fillStyle=t.zone==="residential"?"#7bcf8a":t.zone==="commercial"?"#65a9d8":"#d6bb63";
        ctx.fillRect(px+1,py+1,tw-2,th-2);ctx.globalAlpha=1;
      }
      if(t.road){
        ctx.fillStyle=t.damage>=3?"#6b4b49":t.connected?"#6d7072":"#494d50";
        ctx.fillRect(px,py,tw,th);
        ctx.fillStyle=t.connected?"#d2c77e":"#936b66";
        ctx.fillRect(px+tw*.45,py,Math.max(1,tw*.1),th);
      }

      if(t.powerLine){
        ctx.strokeStyle=t.powered?"#f7de74":"#9c744b";ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(px+2,py+th*.25);ctx.lineTo(px+tw-2,py+th*.25);ctx.stroke();
      }
      if(t.pipe){
        ctx.strokeStyle=t.watered?"#8ee4ef":"#557982";ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(px+tw*.25,py+2);ctx.lineTo(px+tw*.25,py+th-2);ctx.stroke();
      }

      if(t.civic){
        const [fill,label]=civicStyle(t.civic);
        ctx.fillStyle=fill;ctx.fillRect(px+3,py+3,tw-6,th-6);
        ctx.fillStyle="#263a36";ctx.font="800 "+Math.max(9,Math.floor(tw*.42))+"px sans-serif";
        ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(label,px+tw/2,py+th/2);
      }else if(t.density>0&&t.zone){
        const inset=Math.max(3,7-t.density);
        ctx.fillStyle=t.zone==="residential"?"#e9e2c3":t.zone==="commercial"?"#c8e5f2":"#d8c99a";
        ctx.fillRect(px+inset,py+inset,tw-inset*2,th-inset*2);
        ctx.fillStyle="#46524e";
        for(let n=0;n<t.density;n++)ctx.fillRect(px+5+n*4,py+5,2,Math.max(3,th-10));
      }

      if(selectedOverlay!=="none"){
        let fill=null;
        if(selectedOverlay==="growth")fill=t.growth>=0?heat(Math.abs(t.growth),true):heat(Math.abs(t.growth),false);
        if(selectedOverlay==="traffic")fill=heat(t.traffic,false);
        if(selectedOverlay==="landValue")fill=heat(t.landValue,true);
        if(selectedOverlay==="pollution")fill=heat(t.pollution,false);
        if(selectedOverlay==="services")fill=heat(Math.max(t.service,t.policeCoverage,t.fireCoverage),true);
        if(selectedOverlay==="commute"&&t.zone)fill=t.tripAccess?"rgba(72,190,117,.46)":"rgba(205,80,72,.48)";
        if(selectedOverlay==="power"&&(t.zone||t.civic||t.powerLine))fill=t.powered?"rgba(242,217,88,.45)":"rgba(196,76,68,.48)";
        if(selectedOverlay==="water"&&(t.zone||t.civic||t.pipe))fill=t.watered?"rgba(72,172,218,.46)":"rgba(201,111,65,.45)";
        if(fill){ctx.fillStyle=fill;ctx.fillRect(px,py,tw,th);}
      }

      if(t.damage>0){
        ctx.fillStyle=t.damage>=3?"rgba(156,50,49,.62)":"rgba(132,73,54,.35)";
        ctx.fillRect(px,py,tw,th);
        ctx.strokeStyle="#ffd5b0";ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(px+4,py+4);ctx.lineTo(px+tw-4,py+th-4);ctx.moveTo(px+tw-4,py+4);ctx.lineTo(px+4,py+th-4);ctx.stroke();
      }

      ctx.strokeStyle="rgba(25,45,42,.16)";ctx.lineWidth=1;
      ctx.strokeRect(Math.floor(px)+.5,Math.floor(py)+.5,Math.ceil(tw),Math.ceil(th));
    }
  }

  function tileFromPointer(canvas,city,event){
    const r=canvas.getBoundingClientRect();
    const x=Math.floor((event.clientX-r.left)/r.width*city.width);
    const y=Math.floor((event.clientY-r.top)/r.height*city.height);
    return {x:Math.max(0,Math.min(city.width-1,x)),y:Math.max(0,Math.min(city.height-1,y))};
  }

  function describe(rootNode,city,x,y){
    const info=C.tileInfo(city,x,y),box=rootNode.querySelector("#cityTileInfo");
    if(!info||!box)return;
    const utilities=(info.zone||info.civic||info.powerLine||info.pipe)?
      ' · 전력 '+(info.powered?'공급':'미공급')+' · 수도 '+(info.watered?'공급':'미공급'):'';
    const trip=info.zone?' · 통근 '+(info.tripAccess?'가능 '+info.tripLength+'칸':'실패'):'';
    const service=(info.zone||info.civic)?' · 치안 '+Math.round(info.policeCoverage)+' · 소방 '+Math.round(info.fireCoverage):'';
    const damage=info.damage?' · 피해 '+info.damage+'/3':'';
    box.innerHTML='<b>('+(x+1)+','+(y+1)+') '+info.status+'</b> · 도로 접근 '+(info.roadAccess?'가능':'없음')+
      utilities+trip+service+' · 지가 '+Math.round(info.landValue)+' · 오염 '+Math.round(info.pollution)+
      (info.zone?' · 성장 '+Math.round(info.growth):'')+damage;
  }

  function syncButtons(rootNode){
    rootNode.querySelectorAll("[data-city-tool]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.cityTool===selectedTool)));
    rootNode.querySelectorAll("[data-city-overlay]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.cityOverlay===selectedOverlay)));
  }

  function mount(rootNode,city,village,onChange){
    if(!rootNode||!city)return;
    const canvas=rootNode.querySelector("#cityCanvas");
    if(!canvas)return;
    draw(rootNode,city);syncButtons(rootNode);

    const rerender=()=>{
      const scroll=rootNode.scrollTop;
      rootNode.innerHTML=panelHTML(city);
      rootNode.scrollTop=scroll;
      mount(rootNode,city,village,onChange);
    };

    rootNode.querySelectorAll("[data-city-tool]").forEach(b=>b.addEventListener("click",()=>{
      selectedTool=b.dataset.cityTool;syncButtons(rootNode);
    }));
    rootNode.querySelectorAll("[data-city-overlay]").forEach(b=>b.addEventListener("click",()=>{
      selectedOverlay=b.dataset.cityOverlay;syncButtons(rootNode);draw(rootNode,city);
    }));
    rootNode.querySelectorAll("[data-city-tax]").forEach(b=>b.addEventListener("click",()=>{
      const result=C.changeTaxRate(city,Number(b.dataset.cityTax),village);
      if(result.ok){onChange?.(result);rerender();}
    }));

    let painting=false,last="";
    const paintAt=e=>{
      const p=tileFromPointer(canvas,city,e),k=p.x+","+p.y;
      describe(rootNode,city,p.x,p.y);
      if(!painting||k===last)return;
      last=k;
      const result=C.paint(city,selectedTool,p.x,p.y,village);
      if(result.ok){C.recompute(city,village);draw(rootNode,city);onChange?.(result);}
    };
    canvas.addEventListener("pointerdown",e=>{
      painting=true;last="";
      try{canvas.setPointerCapture(e.pointerId);}catch(_){}
      paintAt(e);
    });
    canvas.addEventListener("pointermove",e=>{const p=tileFromPointer(canvas,city,e);describe(rootNode,city,p.x,p.y);paintAt(e);});
    const stop=()=>{painting=false;last="";};
    canvas.addEventListener("pointerup",stop);canvas.addEventListener("pointercancel",stop);canvas.addEventListener("pointerleave",stop);
  }

  root.IslandCityView=Object.freeze({panelHTML,mount,draw});
})(window);