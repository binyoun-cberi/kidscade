const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'avatar-studio.html'),'utf8');
const js=fs.readFileSync(path.join(root,'avatar-pixel-studio.js'),'utf8');
const css=fs.readFileSync(path.join(root,'avatar-pixel-studio.css'),'utf8');

test('pixel avatar studio replaces the old packed loader on the main route',()=>{
  assert.match(html,/avatar-pixel-studio\.js\?v=7/);
  assert.match(html,/avatarCanvas/);
  assert.doesNotMatch(html,/avatar-pack-1\.js/);
});

test('pixel avatar studio uses split hair, face and animated clothes assets',()=>{
  assert.match(js,/hair\/\$\{layer\}\/\$\{set\}/);
  assert.match(js,/runtime\/face/);
  assert.match(js,/hairPath\('back'/);
  assert.match(js,/hairPath\('front'/);
  assert.match(js,/blue-star-zip-hoodie-01/);
  assert.match(js,/denim-cuffed-jeans-01/);
  assert.match(js,/eyes:8/);
  assert.match(js,/eyebrows:6/);
  assert.match(js,/noses:4/);
  assert.match(js,/mouths:8/);
  assert.match(js,/blush:4/);
});

test('pixel avatar studio renders real Idle and Walk frames for shared integrations',()=>{
  assert.match(js,/animation-manifest\.json/);
  assert.match(js,/refreshAnimationCache/);
  assert.match(js,/frame\.headTransform/);
  assert.match(js,/animationFrames=\{idle:\[\],walk:\[\]\}/);
  assert.match(js,/renderPreviewFrame:\(mode='idle',time=0\)=>previewFrame\(mode,time\)/);
  assert.match(js,/kidscade-pixel-avatar-v1/);
  assert.match(js,/kidscade-avatar-studio-preview/);
});

test('pixel avatar studio stays compatible with existing avatar integration',()=>{
  assert.match(js,/window\.KidscadeAvatarShop/);
  assert.match(js,/getPreviewDataURL/);
  assert.match(js,/renderPreviewFrame/);
  assert.match(js,/setSeeds/);
  assert.match(js,/kidscade-avatar-change/);
});

test('new users start with a complete outfit and legacy equipment can migrate',()=>{
  assert.match(js,/upper:1,lower:1/);
  assert.match(js,/kidscade_avatar_equipped/);
  assert.match(js,/legacyMigrationState/);
});

test('back hair is normalized while front hair stays in authored head coordinates',()=>{
  assert.match(js,/MASTER_HEAD_BBOX=\[40,20,91,67\]/);
  assert.match(js,/hairStyleFit/);
  assert.match(js,/hairBackTransform=hairTransform/);
  assert.match(js,/hairFrontTransform=headTransform/);
  assert.match(js,/drawLayer\(targetCtx,hairBack,hairBackTransform\)/);
  assert.match(js,/drawLayer\(targetCtx,hairFront,hairFrontTransform\)/);
  assert.doesNotMatch(js,/style="\$\{hairThumbStyle\(set,n\)\}" src="\$\{hairPath\('front'/);
});

test('pixel canvas keeps crisp scaling and responsive controls',()=>{
  assert.match(css,/image-rendering:pixelated/);
  assert.match(css,/@media\(max-width:720px\)/);
});
