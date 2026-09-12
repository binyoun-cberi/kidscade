from pathlib import Path

source_path = Path('outbreak_korea_source.html')
src = source_path.read_text(encoding='utf-8')
src = src.replace('🧬 진화 네트워크', '🧬 진화 트리')
src = src.replace('<h2 id="treeTitle">병원체 진화</h2>', '<h2 id="treeTitle">병원체 진화 트리</h2>')

mobile_css = r'''
/* v3.1 · mobile-first gameplay shell */
.mobileGameDock,.mobileSheetBackdrop{display:none}
@media(max-width:780px){
html,body{min-height:100%;overflow-x:hidden}body{padding-bottom:76px}#app{min-height:100dvh}
.topbar{position:sticky;top:0;z-index:32;padding:6px 7px;gap:5px;background:rgba(4,14,12,.98);box-shadow:0 4px 16px rgba(0,0,0,.22)}
.topbar .brand{display:none}.topbar .pill{padding:5px 7px;font-size:11px;gap:4px}.topbar .pill strong{font-size:12px}.topbar .grow{display:none}.topbar .mobile-optional{display:none!important}
.speed{margin-left:auto;gap:3px}.speed button{padding:5px 7px;min-width:34px;border-radius:8px;font-size:12px}
.objective{margin:6px 6px 0;padding:7px 9px;border-radius:11px;gap:6px}.objective strong{font-size:12px}.objective .objText{font-size:11px;line-height:1.35;min-width:0;width:100%;order:5}.objective .badge{font-size:9px;padding:2px 6px}
.layout{display:block;padding:6px}.center{min-height:0;height:calc(100dvh - 150px);border-radius:13px}.mapHeader{padding:7px 9px;min-height:44px}.mapHeader strong{font-size:14px}.mapHeader .tiny{display:none}.mapHeader .pill{padding:5px 7px;font-size:10px}.mapWrap{min-height:0;flex:1;height:auto}#koreaMap{width:100%;height:100%;max-height:none;min-height:0;padding:2px 0 4px}
.mapLegend{left:7px;bottom:7px;display:flex;max-width:185px;flex-wrap:wrap;gap:4px 7px;padding:5px 7px;border-radius:8px}.legendRow{font-size:9px;margin:0;gap:3px}.dot{width:7px;height:7px}.bottom{display:none}
.left,.right{display:flex;position:fixed;left:7px;right:7px;bottom:78px;z-index:66;max-height:min(70dvh,620px);min-height:0;border-radius:16px;opacity:0;pointer-events:none;transform:translateY(calc(100% + 30px));transition:transform .22s ease,opacity .18s ease;box-shadow:0 18px 60px rgba(0,0,0,.55)}
.left .panelBody,.right .panelBody{overflow:auto;max-height:calc(70dvh - 54px);padding:10px}.panelHead{padding:10px 12px 8px}.panelHead h2{font-size:18px}body.mobile-left-open .left,body.mobile-right-open .right{opacity:1;pointer-events:auto;transform:translateY(0)}
.statgrid{grid-template-columns:repeat(4,1fr);gap:5px;margin-top:8px}.stat{padding:7px 5px;text-align:center;border-radius:9px}.stat .tiny{font-size:9px}.stat .v{font-size:17px}.typeCard{margin-top:8px;padding:8px}.specialBtn{margin-top:7px;padding:8px;min-height:40px}.chartBox{margin-top:10px}.chartBox canvas{height:65px}.regionActionGrid{grid-template-columns:1fr 1fr}
.mobileSheetBackdrop{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.42);backdrop-filter:blur(2px)}body.mobile-left-open .mobileSheetBackdrop,body.mobile-right-open .mobileSheetBackdrop{display:block}
.mobileGameDock{display:grid;grid-template-columns:repeat(4,1fr);position:fixed;left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom));z-index:72;height:62px;padding:5px;border:1px solid #31584b;border-radius:17px;background:rgba(7,23,19,.96);box-shadow:0 12px 40px rgba(0,0,0,.5);backdrop-filter:blur(14px)}
.mobileGameDock button{position:relative;border:0;background:transparent;color:#a9c0b7;border-radius:12px;font-size:19px;font-weight:900;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-width:0}.mobileGameDock button span{font-size:9px;white-space:nowrap}.mobileGameDock button.active{background:#143329;color:#eafff7}.mobileGameDock button.evolve{color:#7ff0c2}.mobileGameDock .dockDna{position:absolute;right:10px;top:4px;min-width:18px;height:18px;padding:0 4px;border-radius:999px;background:#5df0b5;color:#06231a;font-size:9px;display:flex;align-items:center;justify-content:center}body.mobile-modal-open .mobileGameDock{display:none}
.overlay{z-index:200;padding:0;align-items:stretch}.overlay .modal{width:100vw;max-width:none;height:100dvh;max-height:100dvh;border:0;border-radius:0}.overlay .modalHead{padding:9px 10px;min-height:50px;position:relative;z-index:2;background:#0a1714}.overlay .modalHead h2{font-size:18px}.overlay .modalHead .tiny{font-size:10px}.overlay .modalBody{padding:8px 8px 14px}
#treeOverlay .tabs{flex-wrap:nowrap;overflow-x:auto;gap:5px;margin:0 -2px 8px;padding:0 2px 4px;scrollbar-width:none}#treeOverlay .tabs::-webkit-scrollbar{display:none}#treeOverlay .tab{flex:0 0 auto;padding:7px 10px;font-size:11px}.skillTreeLayout{grid-template-columns:1fr;gap:8px}.skillViewport{min-height:0;height:56dvh;border-radius:12px;overscroll-behavior:contain;touch-action:pan-x pan-y}.skillCanvas{width:760px;min-height:500px}.skillNode{width:150px;min-height:80px;padding:8px;border-radius:13px}.skillNode .skillName{font-size:12px}.skillNode .skillCost{font-size:10px}.skillNode .skillState{font-size:9px}.treeDetail{position:static;min-height:0;padding:10px;border-radius:12px}.treeDetail .detailIcon{font-size:24px}.treeDetail h3{font-size:17px}.treeDetail p{font-size:11px;margin:5px 0;line-height:1.4}.effectChips{margin:7px 0}.requireBox{margin:6px 0;padding:6px}.unlockBtn{min-height:42px}.treeHint{font-size:9px;gap:7px;margin-bottom:6px}.footerNote{display:none}
}
@media(max-width:430px){.topbar .pill{font-size:10px;padding:4px 6px}.topbar .pill strong{font-size:11px}.speed button{min-width:31px;padding:4px 5px}.objective .objText{font-size:10px}.center{height:calc(100dvh - 142px)}.mapLegend{max-width:160px}}
'''
if '/* v3.1 · mobile-first gameplay shell */' not in src:
    src = src.replace('</style>', mobile_css + '\n</style>', 1)

dock = r'''
<div class="mobileSheetBackdrop" id="mobileSheetBackdrop" aria-hidden="true"></div>
<nav class="mobileGameDock" id="mobileGameDock" aria-label="모바일 게임 메뉴">
<button type="button" data-mobile-panel="map" class="active">🗺️<span>지도</span></button>
<button type="button" data-mobile-panel="tree" class="evolve">🧬<span>진화 트리</span><b class="dockDna" id="mobileDna">0</b></button>
<button type="button" data-mobile-panel="pathogen">🦠<span>병원체</span></button>
<button type="button" data-mobile-panel="region">📍<span>지역·뉴스</span></button>
</nav>
<script>
(()=>{
const mq=window.matchMedia('(max-width:780px)'),body=document.body,dock=document.getElementById('mobileGameDock');if(!dock)return;
const season=document.getElementById('season');if(season&&season.closest('.pill'))season.closest('.pill').classList.add('mobile-optional');
const attention=document.getElementById('attentionPill');if(attention)attention.classList.add('mobile-optional');
const dna=document.getElementById('dna'),mobileDna=document.getElementById('mobileDna');const syncDna=()=>{if(dna&&mobileDna)mobileDna.textContent=dna.textContent||'0'};syncDna();if(dna)new MutationObserver(syncDna).observe(dna,{childList:true,subtree:true,characterData:true});
const buttons=[...dock.querySelectorAll('button[data-mobile-panel]')],setActive=n=>buttons.forEach(b=>b.classList.toggle('active',b.dataset.mobilePanel===n));
const closeSheets=()=>{body.classList.remove('mobile-left-open','mobile-right-open');setActive('map')};document.getElementById('mobileSheetBackdrop')?.addEventListener('click',closeSheets);
buttons.forEach(btn=>btn.addEventListener('click',()=>{const mode=btn.dataset.mobilePanel;if(mode==='map'){closeSheets();document.querySelector('.center')?.scrollIntoView({block:'start',behavior:'smooth'});return}if(mode==='tree'){body.classList.remove('mobile-left-open','mobile-right-open');body.classList.add('mobile-modal-open');document.getElementById('treeBtn')?.click();setTimeout(()=>{const v=document.querySelector('#treeOverlay .skillViewport');if(v)v.scrollLeft=Math.max(0,(v.scrollWidth-v.clientWidth)/2)},80);return}if(mode==='pathogen'){const open=!body.classList.contains('mobile-left-open');body.classList.toggle('mobile-left-open',open);body.classList.remove('mobile-right-open');setActive(open?'pathogen':'map');return}if(mode==='region'){const open=!body.classList.contains('mobile-right-open');body.classList.toggle('mobile-right-open',open);body.classList.remove('mobile-left-open');setActive(open?'region':'map')}}));
document.getElementById('treeClose')?.addEventListener('click',()=>body.classList.remove('mobile-modal-open'));document.getElementById('helpClose')?.addEventListener('click',()=>body.classList.remove('mobile-modal-open'));document.getElementById('infoBtn')?.addEventListener('click',()=>body.classList.add('mobile-modal-open'));
const treeOverlay=document.getElementById('treeOverlay');treeOverlay?.addEventListener('click',e=>{if(e.target===treeOverlay)body.classList.remove('mobile-modal-open')});const helpOverlay=document.getElementById('helpOverlay');helpOverlay?.addEventListener('click',e=>{if(e.target===helpOverlay)body.classList.remove('mobile-modal-open')});mq.addEventListener?.('change',e=>{if(!e.matches)body.classList.remove('mobile-left-open','mobile-right-open','mobile-modal-open')});
})();
</script>
'''
if 'id="mobileGameDock"' not in src:
    src = src.replace('</body>', dock + '\n</body>', 1)
Path('outbreak_korea_v3.html').write_text(src, encoding='utf-8')

index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')
shell_css = r'''
/* 2026-09 OUTBREAK/mobile game viewport polish */
@media(max-width:780px){#game-modal .modal-header{height:44px!important;min-height:44px!important;padding:0 8px!important;flex:0 0 44px!important}#game-modal .modal-title-text{font-size:.72em!important;max-width:46vw!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#game-modal .close-btn{font-size:.72em!important;padding:6px 9px!important;border-radius:7px!important;white-space:nowrap}#game-modal #game-iframe{min-height:0!important}}
'''
if '/* 2026-09 OUTBREAK/mobile game viewport polish */' not in index:
    index = index.replace('</style>', shell_css + '\n</style>', 1)
    index_path.write_text(index, encoding='utf-8')
