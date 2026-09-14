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

module.exports = function handler(req, res) {
  try {
    const files = [1, 2, 3, 4, 5].map(n => path.join(__dirname, '..', `cw_part_${n}.js`));
    const encoded = files.map((file, i) => extractPart(file, i)).join('');
    const html = zlib.gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8');

    if (!html || !/<html|<!doctype/i.test(html)) {
      throw new Error('원본 교실전쟁 HTML 복원 결과가 올바르지 않습니다.');
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.end(html);
  } catch (err) {
    console.error('[Classroom War server restore]', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.end(`<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;background:#08111d;color:white;padding:24px"><h2>교실전쟁 원본 복원 실패</h2><pre style="white-space:pre-wrap;color:#fca5a5">${String(err && err.message || err)}</pre></body>`);
  }
};
