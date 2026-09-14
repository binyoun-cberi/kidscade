const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function extractPart(file, index) {
  const src = fs.readFileSync(file, 'utf8');
  const re = new RegExp(`window\\.__CW\\[${index}\\]='([^']+)'`);
  const m = src.match(re);
  if (!m) throw new Error(`cw_part_${index + 1}.js 데이터 형식 오류`);
  return m[1];
}

function inflateGzipIgnoringFooter(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 18) throw new Error('gzip 데이터가 너무 짧습니다.');
  if (buffer[0] !== 0x1f || buffer[1] !== 0x8b || buffer[2] !== 8) throw new Error('gzip 헤더가 올바르지 않습니다.');

  const flags = buffer[3];
  let offset = 10;
  const limit = buffer.length - 8;
  if (flags & 0x04) {
    if (offset + 2 > limit) throw new Error('gzip extra 헤더가 손상됐습니다.');
    const xlen = buffer.readUInt16LE(offset);
    offset += 2 + xlen;
  }
  if (flags & 0x08) while (offset < limit && buffer[offset++] !== 0) {}
  if (flags & 0x10) while (offset < limit && buffer[offset++] !== 0) {}
  if (flags & 0x02) offset += 2;
  if (offset >= limit) throw new Error('gzip 본문 위치를 찾지 못했습니다.');

  const output = zlib.inflateRawSync(buffer.subarray(offset, limit));
  const expectedSize = buffer.readUInt32LE(buffer.length - 4);
  const actualSize = output.length >>> 0;
  return { output, expectedSize, actualSize };
}

module.exports = function handler(req, res) {
  try {
    const files = [1, 2, 3, 4, 5].map(n => path.join(__dirname, '..', `cw_part_${n}.js`));
    const encoded = files.map((file, i) => extractPart(file, i)).join('');
    const packed = Buffer.from(encoded, 'base64');

    let restored, recovery = 'normal-gzip';
    try {
      restored = zlib.gunzipSync(packed);
    } catch (gzipError) {
      const raw = inflateGzipIgnoringFooter(packed);
      restored = raw.output;
      recovery = `raw-deflate footer-mismatch ${raw.actualSize}/${raw.expectedSize}`;
      console.warn('[Classroom War restore]', recovery, gzipError.message);
    }

    const html = restored.toString('utf8');
    const hasDoctype = /<html|<!doctype/i.test(html);
    const hasCloseHtml = /<\/html>\s*$/i.test(html.trim());
    const hasStart = html.includes('방어 시작');
    const hasScriptClose = /<\/script>/i.test(html);
    if (!hasDoctype || !hasCloseHtml || !hasStart || !hasScriptClose) {
      throw new Error(`복원 HTML 구조 불완전: html=${hasDoctype}, close=${hasCloseHtml}, start=${hasStart}, script=${hasScriptClose}, bytes=${restored.length}`);
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Classroom-War-Restore', recovery);
    res.end(html);
  } catch (err) {
    console.error('[Classroom War server restore]', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.end(`<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;background:#08111d;color:white;padding:24px"><h2>교실전쟁 원본 복원 실패</h2><pre style="white-space:pre-wrap;color:#fca5a5">${String(err && err.message || err)}</pre></body>`);
  }
};
