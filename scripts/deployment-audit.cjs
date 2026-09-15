#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TEXT_EXTENSIONS = new Set(['.html', '.htm', '.js', '.cjs', '.mjs', '.css', '.json', '.md']);
const SKIP_DIRS = new Set(['.git', 'node_modules']);
const LOCAL_ATTR_RE = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
const WINDOWS_ABS_RE = /(?:^|["'\s=(])(?:[a-zA-Z]:\\|[a-zA-Z]:\/)/;
const FILE_URL_RE = /file:\/\//i;
const LOCALHOST_RE = /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i;
const VERCEL_RE = /(?:^|["'])\/_vercel\//i;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function stripQueryHash(value) {
  return String(value || '').split('#')[0].split('?')[0];
}

function isExternal(value) {
  return /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//');
}

function isIgnorable(value) {
  const v = String(value || '').trim();
  return !v || v === '#' || v.startsWith('data:') || v.startsWith('blob:') || v.startsWith('javascript:') || v.startsWith('mailto:') || v.startsWith('tel:');
}

function resolveLocalTarget(fromFile, raw) {
  const cleaned = stripQueryHash(raw);
  if (!cleaned) return null;
  let decoded = cleaned;
  try { decoded = decodeURIComponent(cleaned); } catch (_) {}
  if (decoded.startsWith('/')) return path.join(ROOT, decoded.replace(/^\/+/, ''));
  return path.resolve(path.dirname(fromFile), decoded);
}

function collect() {
  const errors = [];
  const warnings = [];
  const externals = new Map();
  const files = walk(ROOT);
  const textFiles = files.filter(file => TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()));
  const rootHtml = files.filter(file => path.dirname(file) === ROOT && /\.html?$/i.test(file));

  for (const file of textFiles) {
    const source = fs.readFileSync(file, 'utf8');
    const name = rel(file);

    if (FILE_URL_RE.test(source)) errors.push(`${name}: file:// 로컬 경로 사용`);
    if (WINDOWS_ABS_RE.test(source)) errors.push(`${name}: Windows 절대 경로 사용`);
    if (LOCALHOST_RE.test(source)) errors.push(`${name}: localhost 주소 사용`);
    if (VERCEL_RE.test(source)) errors.push(`${name}: Vercel 전용 /_vercel/ 경로 사용`);

    let match;
    while ((match = LOCAL_ATTR_RE.exec(source))) {
      const raw = match[1].trim();
      if (isIgnorable(raw)) continue;
      if (isExternal(raw)) {
        if (/^https?:/i.test(raw)) externals.set(raw, (externals.get(raw) || 0) + 1);
        continue;
      }
      const target = resolveLocalTarget(file, raw);
      if (!target) continue;
      if (!target.startsWith(ROOT + path.sep) && target !== ROOT) {
        errors.push(`${name}: 저장소 밖을 가리키는 경로 ${raw}`);
        continue;
      }
      if (!fs.existsSync(target)) errors.push(`${name}: 존재하지 않는 로컬 경로 ${raw}`);
    }
  }

  if (rootHtml.length > 40) {
    warnings.push(`루트 HTML 파일이 ${rootHtml.length}개입니다. 게임 폴더 이동은 링크 호환성 계층을 만든 뒤 단계적으로 진행하세요.`);
  }

  return { errors, warnings, externals: [...externals.entries()].sort((a, b) => b[1] - a[1]), rootHtmlCount: rootHtml.length, textFileCount: textFiles.length };
}

function printReport(report) {
  console.log('Kidscade deployment audit');
  console.log(`- text files checked: ${report.textFileCount}`);
  console.log(`- root HTML files: ${report.rootHtmlCount}`);
  console.log(`- external HTTP(S) dependencies: ${report.externals.length}`);

  if (report.externals.length) {
    console.log('\nExternal dependencies (informational):');
    report.externals.slice(0, 20).forEach(([url, count]) => console.log(`  ${count}x ${url}`));
  }
  if (report.warnings.length) {
    console.log('\nWarnings:');
    report.warnings.forEach(item => console.log(`  WARN ${item}`));
  }
  if (report.errors.length) {
    console.error('\nBlocking issues:');
    report.errors.forEach(item => console.error(`  ERROR ${item}`));
    process.exitCode = 1;
  } else {
    console.log('\nNo blocking deployment path issues found.');
  }
}

const report = collect();
printReport(report);

module.exports = { collect, stripQueryHash, resolveLocalTarget };
