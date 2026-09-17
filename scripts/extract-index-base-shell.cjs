const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index_base.html');
const cssPath = path.join(root, 'main-shell.css');
const bootstrapPath = path.join(root, 'main-bootstrap.js');

function fail(message) {
  throw new Error(`[extract-index-base-shell] ${message}`);
}

let html = fs.readFileSync(indexPath, 'utf8');

if (!html.includes('href="main-shell.css"')) {
  const styleStart = html.indexOf('<style>');
  const styleEnd = html.indexOf('</style>', styleStart + 7);
  if (styleStart < 0 || styleEnd < 0) fail('index_base.html의 메인 <style> 블록을 찾지 못했습니다.');

  const css = html.slice(styleStart + 7, styleEnd).replace(/^\n/, '').replace(/\s+$/, '') + '\n';
  if (css.length < 50000) fail(`추출할 CSS가 예상보다 작습니다: ${css.length} bytes`);
  if (!css.includes('#age-selection-screen') || !css.includes('#game-list') || !css.includes('#pet-widget')) {
    fail('핵심 UI 스타일 셀렉터가 누락되어 추출을 중단합니다.');
  }

  fs.writeFileSync(cssPath, css);
  html = html.slice(0, styleStart) + '<link rel="stylesheet" href="main-shell.css">\n' + html.slice(styleEnd + '</style>'.length);
  fs.writeFileSync(indexPath, html);
} else if (!fs.existsSync(cssPath)) {
  fail('index_base.html은 main-shell.css를 참조하지만 CSS 파일이 없습니다.');
}

let bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
const cssVersionLine = `    html = html.replace('href="main-shell.css"', 'href="' + withVersion('main-shell.css') + '"');`;
if (!bootstrap.includes(cssVersionLine)) {
  const anchor = `  function applyCompatibilityFixes(html) {\n`;
  if (!bootstrap.includes(anchor)) fail('main-bootstrap.js의 applyCompatibilityFixes를 찾지 못했습니다.');
  bootstrap = bootstrap.replace(anchor, anchor + cssVersionLine + '\n');
  fs.writeFileSync(bootstrapPath, bootstrap);
}

console.log(`index_base.html: ${fs.statSync(indexPath).size} bytes`);
console.log(`main-shell.css: ${fs.statSync(cssPath).size} bytes`);
console.log('index_base CSS extraction complete');
