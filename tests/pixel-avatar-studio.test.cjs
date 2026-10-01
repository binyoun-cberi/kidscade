const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'avatar-studio.html'),'utf8');
const js=fs.readFileSync(path.join(root,'avatar-pixel-studio.js'),'utf8');
const css=fs.readFileSync(path.join(root,'avatar-pixel-studio.css'),'utf8');

test('pixel avatar studio replaces the old packed loader on the main route',()=>{
  assert.match(html,/avatar-pixel-studio\.js/);
  assert.match(html,/avatarCanvas/);
  assert.doesNotMatch(html,/avatar-pack-1\.js/);
});

test('pixel avatar studio uses split hair and runtime face assets',()=>{
  assert.match(js,/hair\/\$\{layer\}\/\$\{set\}/);
  assert.match(js,/runtime\/face/);
  assert.match(js,/hairPath\('back'/);
  assert.match(js,/hairPath\('front'/);
  assert.match(js,/eyes:8/);
  assert.match(js,/eyebrows:6/);
  assert.match(js,/noses:4/);
  assert.match(js,/mouths:8/);
  assert.match(js,/blush:4/);
});

test('pixel avatar studio stays compatible with existing avatar integration',()=>{
  assert.match(js,/window\.KidscadeAvatarShop/);
  assert.match(js,/getPreviewDataURL/);
  assert.match(js,/renderPreviewFrame/);
  assert.match(js,/setSeeds/);
  assert.match(js,/kidscade-avatar-studio-preview/);
  assert.match(js,/kidscade-avatar-change/);
});

test('pixel canvas keeps crisp scaling and responsive controls',()=>{
  assert.match(css,/image-rendering:pixelated/);
  assert.match(css,/@media\(max-width:720px\)/);
});
