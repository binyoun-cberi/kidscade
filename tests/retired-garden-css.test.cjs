const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(ROOT,'garden.css'),'utf8');
const indexBase=fs.readFileSync(path.join(ROOT,'index_base.html'),'utf8');

test('garden stylesheet keeps only shared modal compatibility overrides',()=>{
  assert.match(indexBase,/<link rel="stylesheet" href="garden\.css">/);
  assert.doesNotMatch(css,/\.garden-|#garden-|\.kc-pet-card/);
  assert.match(css,/#pet-modal \.sook-coach-body \{ display:block; overflow:auto !important; \}/);
  assert.match(css,/@media\(max-width:720px\)\{#pet-modal \.sook-coach-body\{padding:0!important\}\}/);
});
