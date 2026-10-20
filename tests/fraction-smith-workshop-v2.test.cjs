'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const dir=path.resolve(__dirname,'../games/high_fraction_smith');
const E=require(path.join(dir,'fraction-engine.js'));
const M=require(path.join(dir,'metal-workbench.js'));
const V=require(path.join(dir,'workshop-art.js'));
const O=require(path.join(dir,'order-generator.js'));
const F=require(path.join(dir,'forge-minigame.js'));

test('Cutting a length preserves exact fractions and exposes both resulting pieces',()=>{
  const testCases=[['1',4,'1/4','3/4'],['3/4',2,'3/8','3/8'],['5/6',3,'5/18','5/9'],['1.2',4,'3/10','9/10']];
  for(const [start,parts,left,right] of testCases){
    const result=M.cut(E.parse(start),parts);
    assert.equal(result.ok,true,`${start} cut ${parts} ways`);
    assert.equal(E.toFraction(result.left),left);
    assert.equal(E.toFraction(result.right),right);
    assert.equal(E.eq(E.add(result.left,result.right),start),true);
  }
  assert.equal(M.cut(E.parse('1/40'),2).ok,false,'unreadable tiny cuts must be disabled');
  assert.equal(M.cut(E.parse('1/2'),1).ok,false,'only real cuts are supported');
  assert.equal(M.cut(E.parse('1/2'),4,4).ok,false,'cannot cut at outer edge');
});

test('Metal ruler visually preserves whole and partial units',()=>{
  const ruler=M.bar(E.parse('5/4'));
  assert.deepEqual(ruler.bars.map(x=>x.filled),[100,25]);
  assert.deepEqual(ruler.bars.map(x=>x.segments),[1,4]);
  const markup=M.markup(E.parse('3/8'));
  assert.match(markup,/--divisions:8/);
  assert.match(markup,/width:38%/);
  assert.doesNotMatch(markup,/emoji|[🔥🪓🔨]/u);
});

test('Every commission has its own silhouette and two distinct workshop parts',()=>{
  const art=new Set();
  for(const item of O.ITEMS){
    const parts=V.parts(item.id);
    assert.equal(parts.length,2,`two workshop parts for ${item.id}`);
    assert.notEqual(parts[0].name,parts[1].name);
    assert.ok(parts.every(p=>p.instruction.length>12));
    const unfinished=V.model(item.id,0),complete=V.model(item.id,2);
    assert.match(unfinished,/data-built="0"/);
    assert.match(complete,/data-built="2"/);
    assert.match(complete,/<svg/);
    assert.match(complete,/class="piece-primary"/);
    art.add(complete.replace(/data-built="2"/,''));
  }
  assert.equal(art.size,O.ITEMS.length,'every product silhouette must actually differ');
});

test('Local reusable art selects appropriate Kenney sprites and custom tools',()=>{
  assert.match(V.sprite('sword'),/sword-silver\.png$/);
  assert.match(V.sprite('shield'),/shield-bronze\.png$/);
  assert.equal(V.sprite('crown'),'','a sword asset must not masquerade as a crown');
  assert.match(V.customer(2),/p3-front\.png$/);
  assert.notEqual(V.customer(0),V.customer(1));
  const glyphs=['+','-','×','÷'].map(V.tool);
  assert.equal(new Set(glyphs).size,4);
  assert.ok(glyphs.every(g=>g.includes('<svg')&&g.includes('class="steel"')));
});

test('Solved metal length changes the finished item silhouette',()=>{
  const small=V.model('sword',2,[E.parse('1/2'),E.parse('3/4')]);
  const large=V.model('sword',2,[E.parse('3/2'),E.parse('3/4')]);
  assert.notEqual(small,large);
  assert.match(small,/--primary-size:0\.865/);
  assert.match(large,/--primary-size:1\.135/);
  assert.match(large,/--secondary-size:0\.9325/);
});

test('Shortened station actions preserve precision scoring and upgrades',()=>{
  const craft=F.create({basePumps:3,hammerCount:2,furnaceLevel:1,hammerLevel:2});
  assert.equal(craft.requiredPumps,2);
  assert.equal(craft.requiredHits,2);
  F.act(craft);F.act(craft);
  assert.equal(craft.stage,'hammer');
  F.act(craft,.75);F.act(craft,.75);
  assert.equal(craft.stage,'quench');
  F.act(craft);
  assert.equal(craft.done,true);
  assert.equal(craft.quality,100);
  assert.equal(F.qualityRank(craft.quality).id,'masterpiece');
});
