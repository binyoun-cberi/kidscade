const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index_base.html');
const bootstrapPath = path.join(root, 'main-bootstrap.js');

function fail(message) {
  throw new Error(`[extract-playtime-state] ${message}`);
}

let html = fs.readFileSync(indexPath, 'utf8');

if (!html.includes('src="playtime-state.js"')) {
  const headAnchor = '    <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>\n';
  if (!html.includes(headAnchor)) fail('index_base.html의 head script 삽입 위치를 찾지 못했습니다.');
  html = html.replace(headAnchor, headAnchor + '    <script src="playtime-state.js"></script>\n');
}

const sectionTitle = '            // 학습(플레이) 시간 누적 - 초 단위 안정 저장';
if (html.includes(sectionTitle)) {
  const titleAt = html.indexOf(sectionTitle);
  const sectionStart = html.lastIndexOf('            // =====================================', titleAt);
  const intervalMarker = '            // 게임이 열린 동안 주기적으로 저장해서 브라우저/TV가 갑자기 종료돼도 손실을 줄입니다.';
  const sectionEnd = html.indexOf(intervalMarker, titleAt);
  if (sectionStart < 0 || sectionEnd < 0) fail('플레이시간 인라인 블록의 경계를 찾지 못했습니다.');

  const replacement = `            // =====================================\n            // 학습(플레이) 시간 세션 체크포인트\n            // 누적 저장/표시는 playtime-state.js가 전담합니다.\n            // =====================================\n            const MIN_REWARD_PLAY_SEC = 30;\n            let playStartTime = 0;\n            let playCheckpointTime = 0;\n\n            function checkpointPlayTime(now = Date.now()) {\n                if (playStartTime <= 0 || playCheckpointTime <= 0) return 0;\n                const deltaSec = Math.floor((now - playCheckpointTime) / 1000);\n                if (deltaSec <= 0) return 0;\n                playCheckpointTime += deltaSec * 1000;\n\n                if (window.KidscadePlaytime?.addSeconds) {\n                    window.KidscadePlaytime.addSeconds(deltaSec);\n                } else {\n                    // 외부 모듈 로드 실패 시에도 학습시간 자체는 잃지 않는 최소 fallback입니다.\n                    const key = 'kidscade_playtime_sec';\n                    const legacyKey = 'kidscade_playtime';\n                    const current = Math.max(0, parseInt(localStorage.getItem(key) || '0', 10) || 0);\n                    const next = current + deltaSec;\n                    localStorage.setItem(key, String(next));\n                    localStorage.setItem(legacyKey, String(Math.floor(next / 60)));\n                }\n                return deltaSec;\n            }\n\n`;

  html = html.slice(0, sectionStart) + replacement + html.slice(sectionEnd);
}

const oldStorageSync = `                if (event.key === 'kidscade_playtime_sec' && typeof syncPlayTimeFromStorage === 'function') {\n                    syncPlayTimeFromStorage();\n                }\n`;
html = html.replace(oldStorageSync, '');

// 플레이시간 표시 함수는 외부 모듈로 이동했으므로 이전 전역 호출이 남으면
// DOMContentLoaded 초기화가 ReferenceError로 중단되고 게임 카드가 기본 링크로 이동합니다.
html = html.replace(
  '\n            updatePlayTimeDisplay();\n',
  '\n            window.KidscadePlaytime?.render?.();\n'
);

if (/function\s+(?:loadPlayTimeSeconds|persistPlayTime|updatePlayTimeDisplay|syncPlayTimeFromStorage)\s*\(/.test(html)) {
  fail('이전 플레이시간 저장 함수가 index_base.html에 남아 있습니다.');
}
if (/\bupdatePlayTimeDisplay\s*\(/.test(html)) fail('이전 updatePlayTimeDisplay 호출이 index_base.html에 남아 있습니다.');
if (/\blet\s+totalPlayTimeSec\b/.test(html)) fail('totalPlayTimeSec 레거시 상태가 남아 있습니다.');

fs.writeFileSync(indexPath, html);

let bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
const versionLine = `    html = html.replace('src="playtime-state.js"', 'src="' + withVersion('playtime-state.js') + '"');`;
if (!bootstrap.includes(versionLine)) {
  const anchor = `    html = html.replace('href="main-shell.css"', 'href="' + withVersion('main-shell.css') + '"');\n`;
  if (!bootstrap.includes(anchor)) fail('main-bootstrap.js의 main-shell 버전 연결을 찾지 못했습니다.');
  bootstrap = bootstrap.replace(anchor, anchor + versionLine + '\n');
  fs.writeFileSync(bootstrapPath, bootstrap);
}

console.log(`index_base.html: ${fs.statSync(indexPath).size} bytes`);
console.log('playtime state extraction complete');
