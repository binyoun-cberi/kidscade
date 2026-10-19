#!/usr/bin/env node
// Verify every cached photo against the heritage portal's item-level KOGL license.
import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { HERITAGE_MEDIA } from '../data/history-heritage-media.mjs';

const exec = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(await readFile(join(root, 'data/history-heritage-images.json'), 'utf8'));
const cachedNames = Object.keys(HERITAGE_MEDIA);
const byTerm = new Map(catalog.records.map(record => [record.term, record]));
const requests = new Map();

async function curl(url) {
  const { stdout } = await exec('curl', ['--location', '--fail', '--silent', '--show-error', '--max-time', '25', '--retry', '2', url], { timeout: 80000, maxBuffer: 2 * 1024 * 1024, encoding: 'utf8' });
  return stdout;
}

async function listFor(record) {
  const parsed = new URL(record.sourceApi);
  const params = new URLSearchParams(parsed.search);
  const url = `https://www.heritage.go.kr/heri/cul/selectCulImageList.do?${params}`;
  if (!requests.has(url)) requests.set(url, curl(url).then(JSON.parse));
  return { images: await requests.get(url), params };
}

let next = 0;
const results = Array(cachedNames.length);
const workers = Array.from({length: 6}, async () => {
  while (next < cachedNames.length) {
    const i = next++;
    const term = cachedNames[i];
    const record = byTerm.get(term);
    try {
      if (!record || record.rightsCode !== 'A') throw new Error('Missing candidate rightsCode=A');
      const { images, params } = await listFor(record);
      const sourcePath = new URL(record.sourceUrl).pathname;
      const photo = images.list?.find(item => item.imageUrl === sourcePath);
      if (!photo) throw new Error('Original image missing from official photo list');
      const licenseUrl = `https://www.heritage.go.kr/heri/cul/imgHeritage.do?ccimId=${encodeURIComponent(photo.id)}&${params}`;
      const html = await curl(licenseUrl);
      const type = html.match(/kogl\.or\.kr\/info\/licenseType(\d)\.do/)?.[1];
      const verified = photo.open === 'A' && type === '1' && html.includes(sourcePath);
      results[i] = { term, rightsCode: photo.open, licenseType: type ?? null, licenseUrl, caption: photo.desc, ok: verified };
      if (!verified) results[i].error = 'Not verified as KOGL type 1 for the exact source image';
    } catch (error) {
      results[i] = { term, ok: false, error: String(error?.message || error) };
    }
    process.stderr.write(`Checked ${i + 1}/${cachedNames.length}: ${term} ${results[i].ok ? 'KOGL-1' : 'FAILED'}\n`);
  }
});
await Promise.all(workers);
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), total: results.length, verified: results.filter(result => result.ok).length, results }, null, 2));
if (results.some(result => !result.ok)) process.exitCode = 1;
else if (process.argv.includes('--write')) {
  const verifiedAt = new Date().toISOString();
  const verified = new Map(results.map(result => [result.term, result]));
  const nextCatalog = {
    ...catalog,
    licenseReview: 'published-photos-verified',
    licenseVerifiedAt: verifiedAt,
    licenseVerifiedCount: cachedNames.length,
    records: catalog.records.map(record => {
      const proof = verified.get(record.term);
      if (!proof) return record;
      return { ...record, licenseType: 'KOGL-1', licenseVerifiedUrl: proof.licenseUrl, licenseVerifiedAt: verifiedAt };
    })
  };
  const nextMedia = Object.fromEntries(Object.entries(HERITAGE_MEDIA).map(([term, item]) => {
    const proof = verified.get(term);
    return [term, {
      ...item,
      credit: '사진: 국가유산청 · 공공누리 제1유형 (크기 조정)',
      license: '공공누리 제1유형',
      sourceUrl: proof.licenseUrl
    }];
  }));
  await writeFile(join(root, 'data/history-heritage-images.json'), JSON.stringify(nextCatalog, null, 2) + '\n');
  await writeFile(join(root, 'data/history-heritage-media.mjs'),
    '// National Heritage Service photographs; each original and KOGL-1 license verified on its source page.\n' +
    '// See history-heritage-images.json for the original image URL and dated license evidence.\n' +
    'export const HERITAGE_MEDIA = Object.freeze(' + JSON.stringify(nextMedia, null, 2) + ');\n');
  console.error('Saved individually verified KOGL-1 metadata for ' + cachedNames.length + ' photos');
}
