#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const STRICT = process.argv.includes('--strict');
const ROOT_HTML_BASELINE = 114;
const TEXT_EXTENSIONS = new Set(['.html', '.htm', '.js', '.cjs', '.mjs', '.css', '.json', '.md']);
const RUNTIME_EXTENSIONS = new Set(['.html', '.htm', '.js', '.mjs', '.css']);
const SKIP_DIRS = new Set(['.git', 'node_modules']);
const NON_RUNTIME_TOP_DIRS = new Set(['docs', 'tests', 'scripts', '.github']);
const TAG_RE = /<([a-z][^<>]*?)>/gi;
const LOCAL_ATTR_RE = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
const CSS_URL_RE = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
const JS_STATIC_REF_RES = [
  /\bfetch\(\s*["']([^"']+)["']/gi,
  /\bimportScripts\(\s*["']([^"']+)["']/gi,
  /\bnew\s+Audio\(\s*["']([^"']+)["']/gi,
  /\.src\s*=\s*["']([^"']+)["']/gi
];
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

function topDir(file) {
  const relative = path.relative(ROOT, file);
  return relative.split(path.sep)[0] || '';
}

function isRuntimeFile(file) {
  return RUNTIME_EXTENSIONS.has(path.extname(file).toLowerCase()) && !NON_RUNTIME_TOP_DIRS.has(topDir(file));
}

function stripQueryHash(value) {
  return String(value || '').split('#')[0].split('?')[0];
}

function isExternal(value) {
  return /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//');
}

function isDynamic(value) {
  const v = String(value || '');
  return v.includes('${') || v.includes('{{') || v.includes('<%') || v.includes('`');
}

function isIgnorable(value) {
  const v = String(value || '').trim();
  const lower = v.toLowerCase();
  return !v ||
    v === '#' || v.startsWith('#') || lower.startsWith('%23') ||
    lower.startsWith('data:') || lower.startsWith('blob:') ||
    lower.startsWith('javascript:') || lower.startsWith('mailto:') || lower.startsWith('tel:') ||
    isDynamic(v);
}

function resolveLocalTarget(fromFile, raw) {
  const cleaned = stripQueryHash(raw);
  if (!cleaned) return null;
  let decoded = cleaned;
  try { decoded = decodeURIComponent(cleaned); } catch (_) {}
  if (decoded.startsWith('/')) return path.join(ROOT, decoded.replace(/^\/+/, ''));
  return path.resolve(path.dirname(fromFile), decoded);
}

function inspectReference(file, raw, errors, externals) {
  const value = String(raw || '').trim();
  if (isIgnorable(value)) return;
  if (value.startsWith('/_vercel/')) return;
  if (isExternal(value)) {
    if (/^https?:/i.test(value)) externals.set(value, (externals.get(value) || 0) + 1);
    return;
  }

  const target = resolveLocalTarget(file, value);
  if (!target) return;
  const name = rel(file);
  if (!target.startsWith(ROOT + path.sep) && target !== ROOT) {
    errors.push(`${name}: 저장소 밖을 가리키는 경로 ${value}`);
    return;
  }
  if (!fs.existsSync(target)) errors.push(`${name}: 존재하지 않는 로컬 경로 ${value}`);
}

function staticHtmlMarkup(source) {
  return source.replace(/(<script\b[^>]*>)[\s\S]*?<\/script\s*>/gi, '$1</script>');
}

function inspectHtml(file, source, errors, externals) {
  const markup = staticHtmlMarkup(source);
  TAG_RE.lastIndex = 0;
  let tag;
  while ((tag = TAG_RE.exec(markup))) {
    LOCAL_ATTR_RE.lastIndex = 0;
    let attr;
    while ((attr = LOCAL_ATTR_RE.exec(tag[0]))) inspectReference(file, attr[1], errors, externals);
  }

  const styleBlockRe = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;
  let style;
  while ((style = styleBlockRe.exec(source))) {
    CSS_URL_RE.lastIndex = 0;
    let match;
    while ((match = CSS_URL_RE.exec(style[1]))) inspectReference(file, match[1], errors, externals);
  }
}

function inspectCss(file, source, errors, externals) {
  CSS_URL_RE.lastIndex = 0;
  let match;
  while ((match = CSS_URL_RE.exec(source))) inspectReference(file, match[1], errors, externals);
}

function inspectJsStaticRefs(file, source, errors, externals) {
  for (const pattern of JS_STATIC_REF_RES) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(source))) inspectReference(file, match[1], errors, externals);
  }
}

function collect() {
  const errors = [];
  const warnings = [];
  const externals = new Map();
  const files = walk(ROOT);
  const textFiles = files.filter(file => TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()));
  const runtimeFiles = files.filter(isRuntimeFile);
  const rootHtml = files.filter(file => path.dirname(file) === ROOT && /\.html?$/i.test(file));

  for (const file of runtimeFiles) {
    const source = fs.readFileSync(file, 'utf8');
    const name = rel(file);
    const ext = path.extname(file).toLowerCase();

    if (FILE_URL_RE.test(source)) errors.push(`${name}: file:// 로컬 경로 사용`);
    if (WINDOWS_ABS_RE.test(source)) errors.push(`${name}: Windows 절대 경로 사용`);
    if (LOCALHOST_RE.test(source)) errors.push(`${name}: localhost 주소 사용`);
    if (VERCEL_RE.test(source)) warnings.push(`${name}: Vercel 전용 /_vercel/ 경로가 남아 있습니다. Cloudflare 전환 때 제거하세요.`);

    if (ext === '.html' || ext === '.htm') {
      inspectHtml(file, source, errors, externals);
      inspectJsStaticRefs(file, source, errors, externals);
    } else if (ext === '.css') {
      inspectCss(file, source, errors, externals);
    } else if (ext === '.js' || ext === '.mjs') {
      inspectJsStaticRefs(file, source, errors, externals);
    }
  }

  if (rootHtml.length > ROOT_HTML_BASELINE) {
    errors.push(`루트 HTML 파일이 기준선 ${ROOT_HTML_BASELINE}개를 넘어 ${rootHtml.length}개가 되었습니다. 새 게임은 games/<game-id>/index.html 구조를 사용하세요.`);
  } else if (rootHtml.length > 40) {
    warnings.push(`루트 HTML 파일이 ${rootHtml.length}개입니다. 현재 기준선을 넘기지 말고 기존 게임은 단계적으로 games/ 아래로 이동하세요.`);
  }

  return {
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    externals: [...externals.entries()].sort((a, b) => b[1] - a[1]),
    rootHtmlCount: rootHtml.length,
    rootHtmlBaseline: ROOT_HTML_BASELINE,
    textFileCount: textFiles.length,
    runtimeFileCount: runtimeFiles.length
  };
}

function printReport(report) {
  console.log('Kidscade deployment audit');
  console.log(`- text files inventoried: ${report.textFileCount}`);
  console.log(`- deployable runtime files checked: ${report.runtimeFileCount}`);
  console.log(`- root HTML files: ${report.rootHtmlCount}/${report.rootHtmlBaseline} baseline`);
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
    if (STRICT) process.exitCode = 1;
    else console.error('\nReport-only mode: use --strict to fail on blocking issues.');
  } else {
    console.log('\nNo blocking deployment path issues found.');
  }
}

const report = collect();
printReport(report);

module.exports = {
  collect,
  stripQueryHash,
  resolveLocalTarget,
  isRuntimeFile,
  isDynamic,
  staticHtmlMarkup
};
