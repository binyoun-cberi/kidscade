const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const RECOVERY_DIR = path.join(ROOT, 'recovery');
const RECOVERED = path.join(RECOVERY_DIR, 'classroom_war_3d.recovered.html');

function extractPart(n) {
  const file = path.join(ROOT, `cw_part_${n}.js`);
  const src = fs.readFileSync(file, 'utf8');
  const index = n - 1;
  const m = src.match(new RegExp(`window\\.__CW\\[${index}\\]='([^']+)'`));
  if (!m) throw new Error(`cw_part_${n}.js payload not found`);
  return m[1];
}

function inflateIgnoringGzipFooter(buffer) {
  if (buffer.length < 18 || buffer[0] !== 0x1f || buffer[1] !== 0x8b || buffer[2] !== 8) {
    throw new Error('invalid gzip header');
  }
  const flags = buffer[3];
  let offset = 10;
  const limit = buffer.length - 8;
  if (flags & 0x04) {
    if (offset + 2 > limit) throw new Error('invalid gzip extra field');
    const xlen = buffer.readUInt16LE(offset);
    offset += 2 + xlen;
  }
  if (flags & 0x08) while (offset < limit && buffer[offset++] !== 0) {}
  if (flags & 0x10) while (offset < limit && buffer[offset++] !== 0) {}
  if (flags & 0x02) offset += 2;
  if (offset >= limit) throw new Error('deflate body not found');
  const output = zlib.inflateRawSync(buffer.subarray(offset, limit));
  return {
    output,
    expectedSize: buffer.readUInt32LE(buffer.length - 4),
    actualSize: output.length >>> 0,
  };
}

function printSyntaxContext(code, err, index) {
  console.error(`\n--- inline script ${index} syntax diagnostic ---`);
  console.error(err.stack || err.message);
  const stack = String(err.stack || '');
  const m = stack.match(new RegExp(`inline-script-${index}\\.js:(\\d+)(?::(\\d+))?`));
  if (!m) return;
  const lineNo = Number(m[1]);
  const lines = code.split(/\r?\n/);
  const from = Math.max(1, lineNo - 5);
  const to = Math.min(lines.length, lineNo + 5);
  for (let n = from; n <= to; n++) console.error(`${String(n).padStart(5)} | ${lines[n - 1]}`);
}

function validateHtml(html) {
  const checks = {
    doctype: /<!doctype\s+html/i.test(html),
    htmlOpen: /<html[\s>]/i.test(html),
    htmlClose: /<\/html>\s*$/i.test(html.trim()),
    startText: html.includes('방어 시작'),
    canvas: /<canvas[\s>]/i.test(html),
  };
  console.log('Structural checks:', checks);
  for (const [name, ok] of Object.entries(checks)) if (!ok) throw new Error(`restored HTML validation failed: ${name}`);

  const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
  if (!scripts.length) throw new Error('no inline script found');
  let checked = 0;
  for (let i = 0; i < scripts.length; i++) {
    const [, attrs, code] = scripts[i];
    if (/\bsrc\s*=|type\s*=\s*["']module["']/i.test(attrs || '')) continue;
    if (!code.trim()) continue;
    try {
      new vm.Script(code, { filename: `inline-script-${i}.js` });
      console.log(`inline script ${i}: syntax OK (${Buffer.byteLength(code, 'utf8')} bytes)`);
      checked++;
    } catch (err) {
      printSyntaxContext(code, err, i);
      throw new Error(`inline script ${i} syntax error: ${err.message}`);
    }
  }
  if (!checked) throw new Error('no executable inline script validated');
  return { checks, scriptCount: scripts.length, checked };
}

const encoded = [1, 2, 3, 4, 5].map(extractPart).join('');
const packed = Buffer.from(encoded, 'base64');
let restored;
try {
  restored = { output: zlib.gunzipSync(packed), expectedSize: null, actualSize: null, method: 'gunzip' };
} catch (err) {
  restored = { ...inflateIgnoringGzipFooter(packed), method: 'raw-deflate' };
  console.warn(`gzip footer mismatch ignored: ${err.message}`);
}
const html = restored.output.toString('utf8');
fs.mkdirSync(RECOVERY_DIR, { recursive: true });
fs.writeFileSync(RECOVERED, html, 'utf8');
console.log(JSON.stringify({
  recoveredFile: path.relative(ROOT, RECOVERED),
  method: restored.method,
  actualBytes: Buffer.byteLength(html, 'utf8'),
  footerExpectedBytes: restored.expectedSize,
  footerMismatch: restored.expectedSize != null && restored.expectedSize !== restored.actualSize,
  beginsWith: html.slice(0, 80),
  endsWith: html.slice(-120),
}, null, 2));

const validation = validateHtml(html);
const out = path.join(ROOT, 'classroom_war_3d.html');
fs.writeFileSync(out, html, 'utf8');
console.log(JSON.stringify({ output: 'classroom_war_3d.html', inlineScriptsValidated: validation.checked, totalScriptTags: validation.scriptCount }, null, 2));
