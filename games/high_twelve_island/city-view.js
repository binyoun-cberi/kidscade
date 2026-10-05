/* 촌장 시뮬레이터 v9 — 도시계획 UI/렌더러 */
((root) => {
  "use strict";
  const C = root.IslandCityCore;
  if (!C) return;

  let selectedTool = "road";
  let selectedOverlay = "none";

  const toolButtons = [
    ["road","🛣️","도로"],["residential","🏠","주거"],["commercial","🏪","상업"],
    ["industrial","🏭","산업"],["park","🌳","공원"],["school","🏫","학교"],
    ["clinic","🏥","진료소"],["bulldoze","🧹","철거"]
  ];
  const overlayButtons = [
    ["none","일반"],["growth","성장"],["traffic","교통"],["landValue","지가"],["pollution","오염"]
  ];

  function demandChip(key, label, value) {
    const sign = value > 0 ? "+" : "";
    const tone = value >= 25 ? " hot" : value <= -20 ? " cold" : "";
    return '<span class="city-demand' + tone + '"><b>' + label + '</b> ' + sign + value + '</span>';
  }

  function panelHTML(city) {
    const s = C.summary(city);
    return '<div class="city-panel">' +
      '<h2>🗺️ 마을 도시계획</h2>' +
      '<p class="intro">도로를 잇고 주거·상업·산업 구역을 정하면 조건이 맞는 땅이 스스로 성장합니다. 끊긴 도로 옆 구역은 성장하지 않아요.</p>' +
      '<div class="city-kpis"><span><small>도시 예산</small><b>🪙 ' + s.funds + '</b><em>+' + s.taxIncome + '/주</em></span>' +
      '<span><small>개발</small><b>' + s.developed + '칸</b><em>집 ' + s.homes + ' · 일자리 ' + s.jobs + '</em></span>' +
      '<span><small>도로망</small><b>' + s.connectedRoads + '/' + s.roads + '</b><em>연결된 도로</em></span></div>' +
      '<div class="city-demand-row">' +
        demandChip("residential","R 주거",s.demand.residential) +
        demandChip("commercial","C 상업",s.demand.commercial) +
        demandChip("industrial","I 산업",s.demand.industrial) +
      '</div>' +
      '<div class="city-toolbar" aria-label="도시 건설 도구">' +
        toolButtons.map(([id,icon,label]) => '<button type="button" data-city-tool="' + id + '" aria-pressed="' + (selectedTool===id) + '">' + icon + '<span>' + label + '</span></button>').join("") +
      '</div>' +
      '<div class="city-overlaybar" aria-label="도시 정보 지도">' +
        overlayButtons.map(([id,label]) => '<button type="button" data-city-overlay="' + id + '" aria-pressed="' + (selectedOverlay===id) + '">' + label + '</button>').join("") +
      '</div>' +
      '<div class="city-canvas-wrap"><canvas id="cityCanvas" width="576" height="432" aria-label="도로와 구역을 직접 배치하는 도시계획 지도"></canvas></div>' +
      '<div id="cityTileInfo" class="city-tile-info">타일을 가리키면 도로 접근·지가·오염·성장 압력을 볼 수 있어요.</div>' +
      '<div class="city-explain"><span>평균 지가 <b>' + s.avgLandValue + '</b></span><span>평균 교통 <b>' + s.avgTraffic + '</b></span><span>평균 오염 <b>' + s.avgPollution + '</b></span></div>' +
      '<div class="locked-card">💡 OpenSC2K식 핵심 흐름을 어린이용으로 단순화했습니다: <b>도로 연결 → 구역 지정 → 수요 → 지가·오염 → 자동 성장</b>. 원본 SimCity 그래픽은 사용하지 않습니다.</div>' +
      '</div>';
  }

  function heat(value, positive) {
    const v = Math.max(0, Math.min(100, Number(value) || 0)) / 100;
    if (positive) return 'rgba(' + Math.round(70 + 70*(1-v)) + ',' + Math.round(120 + 100*v) + ',95,' + (.18 + v*.48) + ')';
    return 'rgba(' + Math.round(130 + 100*v) + ',' + Math.round(170 - 80*v) + ',70,' + (.16 + v*.50) + ')';
  }

  function draw(rootNode, city) {
    const canvas = rootNode.querySelector("#cityCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const tw = canvas.width / city.width, th = canvas.height / city.height;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.imageSmoothingEnabled = false;

    for (let y=0;y<city.height;y++) for (let x=0;x<city.width;x++) {
      const t = C.cell(city,x,y);
      const px=x*tw, py=y*th;
      ctx.fillStyle = t.terrain==="water" ? "#4e91aa" : t.terrain==="forest" ? "#4d7750" : "#82a96b";
      ctx.fillRect(px,py,tw,th);

      if (t.zone) {
        ctx.globalAlpha=.32;
        ctx.fillStyle = t.zone==="residential" ? "#7bcf8a" : t.zone==="commercial" ? "#65a9d8" : "#d6bb63";
        ctx.fillRect(px+1,py+1,tw-2,th-2);
        ctx.globalAlpha=1;
      }
      if (t.road) {
        ctx.fillStyle=t.connected ? "#6d7072" : "#494d50";
        ctx.fillRect(px,py,tw,th);
        ctx.fillStyle=t.connected ? "#d2c77e" : "#936b66";
        ctx.fillRect(px+tw*.45,py,Math.max(1,tw*.1),th);
      }

      if (t.civic) {
        ctx.fillStyle = t.civic==="park" ? "#2f7e4a" : t.civic==="school" ? "#ead9a3" : "#d5ece8";
        ctx.fillRect(px+3,py+3,tw-6,th-6);
        ctx.fillStyle="#263a36";
        ctx.font=Math.max(9,Math.floor(tw*.48))+"px sans-serif";
        ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.fillText(t.civic==="park"?"P":t.civic==="school"?"S":"H",px+tw/2,py+th/2);
      } else if (t.density>0 && t.zone) {
        const inset = Math.max(3,7-t.density);
        ctx.fillStyle=t.zone==="residential" ? "#e9e2c3" : t.zone==="commercial" ? "#c8e5f2" : "#d8c99a";
        ctx.fillRect(px+inset,py+inset,tw-inset*2,th-inset*2);
        ctx.fillStyle="#46524e";
        for(let n=0;n<t.density;n++) ctx.fillRect(px+5+n*4,py+5,2,Math.max(3,th-10));
      }

      if (selectedOverlay!=="none") {
        let fill=null;
        if(selectedOverlay==="growth") fill=t.growth>=0?heat(Math.abs(t.growth),true):heat(Math.abs(t.growth),false);
        if(selectedOverlay==="traffic") fill=heat(t.traffic,false);
        if(selectedOverlay==="landValue") fill=heat(t.landValue,true);
        if(selectedOverlay==="pollution") fill=heat(t.pollution,false);
        if(fill){ctx.fillStyle=fill;ctx.fillRect(px,py,tw,th);}
      }

      ctx.strokeStyle="rgba(25,45,42,.16)";
      ctx.lineWidth=1;
      ctx.strokeRect(Math.floor(px)+.5,Math.floor(py)+.5,Math.ceil(tw),Math.ceil(th));
    }
  }

  function tileFromPointer(canvas, city, event) {
    const r=canvas.getBoundingClientRect();
    const x=Math.floor((event.clientX-r.left)/r.width*city.width);
    const y=Math.floor((event.clientY-r.top)/r.height*city.height);
    return {x:Math.max(0,Math.min(city.width-1,x)),y:Math.max(0,Math.min(city.height-1,y))};
  }

  function describe(rootNode, city, x, y) {
    const info=C.tileInfo(city,x,y), box=rootNode.querySelector("#cityTileInfo");
    if(!info||!box)return;
    box.innerHTML='<b>('+(x+1)+','+(y+1)+') '+info.status+'</b> · 도로 접근 ' + (info.roadAccess?'가능':'없음') +
      ' · 지가 '+Math.round(info.landValue)+' · 오염 '+Math.round(info.pollution)+' · 교통 '+Math.round(info.traffic) +
      (info.zone?' · 성장 압력 '+Math.round(info.growth):'');
  }

  function syncButtons(rootNode) {
    rootNode.querySelectorAll("[data-city-tool]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.cityTool===selectedTool)));
    rootNode.querySelectorAll("[data-city-overlay]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.cityOverlay===selectedOverlay)));
  }

  function mount(rootNode, city, village, onChange) {
    if(!rootNode||!city)return;
    const canvas=rootNode.querySelector("#cityCanvas");
    if(!canvas)return;
    draw(rootNode,city);
    syncButtons(rootNode);

    rootNode.querySelectorAll("[data-city-tool]").forEach(b=>b.addEventListener("click",()=>{
      selectedTool=b.dataset.cityTool;syncButtons(rootNode);
    }));
    rootNode.querySelectorAll("[data-city-overlay]").forEach(b=>b.addEventListener("click",()=>{
      selectedOverlay=b.dataset.cityOverlay;syncButtons(rootNode);draw(rootNode,city);
    }));

    let painting=false,last="";
    const paintAt=e=>{
      const p=tileFromPointer(canvas,city,e),key=p.x+","+p.y;
      describe(rootNode,city,p.x,p.y);
      if(!painting||key===last)return;
      last=key;
      const result=C.paint(city,selectedTool,p.x,p.y);
      if(result.ok){ C.recompute(city,village); draw(rootNode,city); onChange?.(result); }
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