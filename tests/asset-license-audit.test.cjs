const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

test('central asset credits are published and linked',()=>{
  const md=read('CREDITS.md');
  const html=read('credits.html');
  const index=read('index_base.html');
  assert.match(md,/Underwater Diving artwork/);
  assert.match(md,/Pixabay Content License/);
  assert.match(html,/Kidscade 에셋 · 라이선스 크레딧/);
  assert.match(index,/href="credits\.html"/);
});

test('asset manifests no longer claim every source pack is CC0',()=>{
  const json=JSON.parse(read('assets/game/asset-manifest.json'));
  const js=read('assets/game/asset-manifest.js');
  const pack=JSON.parse(read('PACK_INDEX.json'));
  assert.doesNotMatch(json.license_summary,/All source packs.*CC0/i);
  assert.doesNotMatch(js,/All source packs.*CC0/i);
  assert.match(json.license_summary,/CC-BY/);
  assert.match(pack.license,/Mixed library/);
});

test('newmusical is tracked as owner-confirmed Pixabay content',()=>{
  const manifest=JSON.parse(read('assets/audio/incoming/newmusical/manifest.json'));
  assert.equal(manifest.length,12);
  for(const item of manifest){
    assert.equal(item.license_status,'USER_CONFIRMED_PIXABAY');
    assert.equal(item.source,'Pixabay');
    assert.equal(item.license,'Pixabay Content License');
  }
  const sourcePacks=JSON.parse(read('assets/_library/SOURCE_PACKS.json'));
  const music=sourcePacks.find(item=>item.pack==='newmusical');
  assert.equal(music.license,'Pixabay Content License');
  assert.equal(music.provenance,'USER_CONFIRMED');
});

test('unverified seafloor tiles stay explicitly unverified',()=>{
  const credits=read('CREDITS.md');
  assert.match(credits,/seafloor-tiles\.png/);
  assert.match(credits,/seafloor-tiles-blue\.png/);
  assert.match(credits,/Unverified/);
});
