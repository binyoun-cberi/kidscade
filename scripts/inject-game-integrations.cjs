const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

function injectScripts(relativeHtml, scripts) {
  const file = path.join(dist, relativeHtml);
  if (!fs.existsSync(file)) throw new Error(`Missing built game file: ${relativeHtml}`);
  let html = fs.readFileSync(file, 'utf8');
  const tags = scripts
    .filter(src => !html.includes(`src="${src}"`))
    .map(src => `<script src="${src}"></script>`)
    .join('\n');
  if (!tags) return false;
  if (!html.includes('</body>')) throw new Error(`Cannot inject game integration: ${relativeHtml} has no </body>`);
  html = html.replace('</body>', `${tags}\n</body>`);
  fs.writeFileSync(file, html);
  return true;
}

const classroomChanged = injectScripts('classroom_war_3d.html', [
  '/classroom-war-records.js?v=20260916-1',
  '/classroom-war-records-observer.js?v=20260916-1'
]);

const timingChanged = injectScripts('딱! 타임 LCD.html', [
  'timing-exact10-records.js?v=20260916-1'
]);

console.log(`[game-integrations] Classroom War records ${classroomChanged ? 'injected' : 'already present'}.`);
console.log(`[game-integrations] Timing exact 10 records ${timingChanged ? 'injected' : 'already present'}.`);
