const fs=require('fs');
const path=require('path');
const zlib=require('zlib');
const vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
function extractPart(n){const src=fs.readFileSync(path.join(ROOT,`cw_part_${n}.js`),'utf8');const m=src.match(new RegExp(`window\\.__CW\\[${n-1}\\]='([^']+)'`));if(!m)throw new Error(`cw_part_${n}.js payload not found`);return m[1];}
function inflateIgnoringFooter(buffer){
  if(buffer.length<18||buffer[0]!==0x1f||buffer[1]!==0x8b||buffer[2]!==8)throw new Error('invalid gzip header');
  const flags=buffer[3];let offset=10,limit=buffer.length-8;
  if(flags&0x04){if(offset+2>limit)throw new Error('invalid gzip extra field');const xlen=buffer.readUInt16LE(offset);offset+=2+xlen;}
  if(flags&0x08)while(offset<limit&&buffer[offset++]!==0){}
  if(flags&0x10)while(offset<limit&&buffer[offset++]!==0){}
  if(flags&0x02)offset+=2;
  if(offset>=limit)throw new Error('deflate body not found');
  return zlib.inflateRawSync(buffer.subarray(offset,limit));
}
function validate(html){
  const required=['<!doctype html>','3D 교실 방어 시작','function createClassroom','function createGeneralStudent','const band=box(.62,.07,.50,0xf59e0b,.25,.18);','function spawnEnemy','function spawnGate','ui.startBtn.onclick=resetGame','</html>'];
  for(const token of required)if(!html.includes(token))throw new Error(`missing required token: ${token}`);
  if(html.includes('\uFFFD'))throw new Error('replacement character remains in repaired HTML');
  const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];let checked=0;
  scripts.forEach((m,i)=>{const attrs=m[1]||'',code=m[2];if(/\bsrc\s*=|type\s*=\s*["']module["']/i.test(attrs)||!code.trim())return;new vm.Script(code,{filename:`classroom-war-inline-${i}.js`});checked++;});
  if(checked<2)throw new Error('not enough executable scripts validated');
  return checked;
}
const encoded=[1,2,3,4,5].map(extractPart).join('');
const packed=Buffer.from(encoded,'base64');
let raw;try{raw=zlib.gunzipSync(packed);}catch(e){raw=inflateIgnoringFooter(packed);console.warn('damaged gzip used only as prefix source:',e.message);}
const damaged=raw.toString('utf8');
const lines=damaged.split(/\r?\n/);
if(lines.length<453)throw new Error(`damaged source too short: ${lines.length} lines`);
const prefix=lines.slice(0,453).join('\n')+'\n';
const expectedBoundary='  const cap=box(.68,.20,.48,0x0f172a,.30,.20);cap.position.set(0,1.65,.02);g.add(cap);\n';
if(!prefix.endsWith(expectedBoundary))throw new Error('intact prefix boundary does not match expected general cap source');
const repairedBoundary='  const band=box(.62,.07,.50,0xf59e0b,.25,.18);\n';
const tail=fs.readFileSync(path.join(ROOT,'scripts','classroom-war-repair-tail.txt'),'utf8');
const html=prefix+repairedBoundary+tail;
const checked=validate(html);
fs.writeFileSync(path.join(ROOT,'classroom_war_3d.html'),html,'utf8');
console.log(JSON.stringify({output:'classroom_war_3d.html',bytes:Buffer.byteLength(html),prefixLines:453,inlineScriptsValidated:checked,gzipRuntimeDependency:false},null,2));
