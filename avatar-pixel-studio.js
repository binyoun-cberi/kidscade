  const fps=animationManifest?.frameSets?.[key]?.fps||(key==='walk'?6:3);
  const t=Number.isFinite(Number(time))?Math.max(0,Number(time)):performance.now()/1000;
  const index=Math.floor(t*fps)%frames.length;
  return frames[index]||previewData();
}

window.KidscadeAvatarShop={
  version:'pixel-v2-rig-haircatalog-1',
  stateKey:STATE_KEY,
  getPreviewDataURL:()=>previewData(),
  renderPreviewFrame:(mode='idle',time=0)=>previewFrame(mode,time),
  getRig:()=>renderer?.rig||null,
  getExtraParts:()=>extraParts.map(part=>({...part})),
  async setExtraParts(parts){
    extraParts=Array.isArray(parts)?parts.filter(Boolean):[];
    await renderAndPublish(false);
    return true;
  },
  setSeeds(value){
    seeds=Math.max(0,parseInt(value,10)||0);
    seedBadge.hidden=false;
    seedBadge.textContent='씨앗 '+seeds.toLocaleString('ko-KR');
  },
  getState:()=>({...state}),
  async setState(next){
    if(!next||typeof next!=='object')return false;
    state=loadStateFromObject({...state,...next});
    state.hairId=renderer?.normalizeConfig({hairId:state.hairId}).hairId||DEFAULT.hairId;
    renderOptions();
    await renderAndPublish(false);
    return true;
  }
};

(async function boot(){
  await ensureRenderer();
  renderOptions();
  await renderAndPublish(false);
  document.body.dataset.avatarReady='1';
  window.parent?.postMessage({type:'kidscade-avatar-ready',source:'pixel-v2-rig'},location.origin);
})().catch(err=>{
  console.error(err);
  document.body.dataset.avatarReady='error';
  flash('아바타를 불러오지 못했어요.');
});
})();