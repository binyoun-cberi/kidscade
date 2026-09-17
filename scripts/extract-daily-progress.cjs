const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index_base.html');
const BOOTSTRAP = path.join(ROOT, 'main-bootstrap.js');

function replaceBetween(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`${label}: start marker not found`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`${label}: end marker not found`);
  return source.slice(0, start) + replacement + source.slice(end);
}

function findFunctionEnd(source, functionName) {
  const marker = `function ${functionName}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`${functionName}: function not found`);
  const brace = source.indexOf('{', start);
  if (brace < 0) throw new Error(`${functionName}: opening brace not found`);
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && next === '/') { blockComment = false; i++; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && next === '/') { lineComment = true; i++; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i++; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return { start, end: i + 1 };
    }
  }
  throw new Error(`${functionName}: closing brace not found`);
}

function replaceFunction(source, functionName, replacement) {
  const range = findFunctionEnd(source, functionName);
  return source.slice(0, range.start) + replacement + source.slice(range.end);
}

let html = fs.readFileSync(INDEX, 'utf8');

if (!html.includes('<script src="daily-progress.js"></script>')) {
  const seedTag = '    <script src="seed-wallet.js"></script>';
  if (!html.includes(seedTag)) throw new Error('seed wallet script tag not found');
  html = html.replace(seedTag, `${seedTag}\n    <script src="daily-progress.js"></script>`);
}

const dailyStateWrappers = `            function getTodayKey() {
                return window.KidscadeDaily?.getTodayKey?.() || new Date().toLocaleDateString('ko-KR');
            }

            function buildTodayMissionState() {
                if (window.KidscadeDaily?.buildMissionState) return window.KidscadeDaily.buildMissionState(categoryNames);
                const categories = ['math', 'korean', 'lang', 'trivia', 'music'];
                const category = categories[new Date().getDate() % categories.length];
                return {
                    date: getTodayKey(),
                    missions: [
                        { id: 'play_any', icon: '🎮', title: '첫 게임 도전', desc: '아무 게임이나 1번 플레이하기', goal: 1, progress: 0, reward: 20, type: 'any', claimed: false },
                        { id: 'play_category', icon: '🧭', title: \`${'${'}categoryNames[category]} 탐험\`, desc: \`${'${'}categoryNames[category]} 게임 1번 플레이하기\`, goal: 1, progress: 0, reward: 35, type: 'category', category, claimed: false },
                        { id: 'play_two', icon: '🔥', title: '두 번의 도전', desc: '오늘 게임을 총 2번 플레이하기', goal: 2, progress: 0, reward: 45, type: 'count', claimed: false }
                    ]
                };
            }

            function getTodayMissionState() {
                if (window.KidscadeDaily?.getMissionState) return window.KidscadeDaily.getMissionState(categoryNames);
                let state;
                try { state = JSON.parse(localStorage.getItem('kidscade_daily_missions') || 'null'); } catch(e) { state = null; }
                if (!state || state.date !== getTodayKey() || !Array.isArray(state.missions)) {
                    state = buildTodayMissionState();
                    localStorage.setItem('kidscade_daily_missions', JSON.stringify(state));
                }
                return state;
            }

            function saveTodayMissionState(state) {
                if (window.KidscadeDaily?.saveMissionState) return window.KidscadeDaily.saveMissionState(state);
                localStorage.setItem('kidscade_daily_missions', JSON.stringify(state));
                return true;
            }

`;

html = replaceBetween(
  html,
  '            function getTodayKey() {',
  '            function renderDailyMissions() {',
  dailyStateWrappers,
  'daily state helpers'
);

const updateMissionReplacement = `function updateMissionProgress(category, gameId) {
                let completed = [];
                if (window.KidscadeDaily?.advanceMissions) {
                    completed = window.KidscadeDaily.advanceMissions(category, categoryNames).completed || [];
                } else {
                    const state = getTodayMissionState();
                    state.missions.forEach(mission => {
                        if (mission.claimed) return;
                        if (mission.type === 'any' || mission.type === 'count') mission.progress += 1;
                        if (mission.type === 'category' && mission.category === category) mission.progress += 1;
                        if (mission.progress >= mission.goal) {
                            mission.progress = mission.goal;
                            mission.claimed = true;
                            completed.push({ ...mission });
                        }
                    });
                    saveTodayMissionState(state);
                }
                completed.forEach(mission => {
                    changeSeeds(mission.reward, '', { toast: false });
                    showToast(\`${'${'}mission.title} 완료! 씨앗 ${'${'}mission.reward}개를 받았어요.\`, true);
                });
                if (completed.length > 0) {
                    pet.exp += completed.length * 10;
                    savePet();
                    checkPetEvolution();
                }
                renderDailyMissions();
            }`;
html = replaceFunction(html, 'updateMissionProgress', updateMissionReplacement);

html = html.replace(
  "                const claimed = localStorage.getItem('kidscade_daily_reward_claimed');\n                if (claimed === today) { showToast('오늘의 보상은 이미 골랐어요. 내일 다시 받을 수 있어요!'); return; }",
  "                const claimed = window.KidscadeDaily?.isDailyRewardClaimed?.() ?? (localStorage.getItem('kidscade_daily_reward_claimed') === today);\n                if (claimed) { showToast('오늘의 보상은 이미 골랐어요. 내일 다시 받을 수 있어요!'); return; }"
);
html = html.replace(
  "                if (granted) localStorage.setItem('kidscade_daily_reward_claimed', today);",
  "                if (granted) {\n                    if (window.KidscadeDaily?.markDailyRewardClaimed) window.KidscadeDaily.markDailyRewardClaimed();\n                    else localStorage.setItem('kidscade_daily_reward_claimed', today);\n                }"
);
html = html.replace(
  "                const todayClaimed = localStorage.getItem('kidscade_daily_reward_claimed') === getDailyRewardKey();",
  "                const todayClaimed = window.KidscadeDaily?.isDailyRewardClaimed?.() ?? (localStorage.getItem('kidscade_daily_reward_claimed') === getDailyRewardKey());"
);
html = html.replace(
  "                const todayStr = new Date().toLocaleDateString();\n                const lastAttendance = localStorage.getItem('kidscade_attendance');\n                if (lastAttendance !== todayStr && !attendanceRewardPending) {",
  "                const todayStr = getDailyRewardKey();\n                const attendanceClaimed = window.KidscadeDaily?.isAttendanceClaimed?.() ?? (localStorage.getItem('kidscade_attendance') === todayStr);\n                if (!attendanceClaimed && !attendanceRewardPending) {"
);
html = html.replace(
  "                        localStorage.setItem('kidscade_attendance', todayStr);",
  "                        if (window.KidscadeDaily?.markAttendanceClaimed) window.KidscadeDaily.markAttendanceClaimed();\n                        else localStorage.setItem('kidscade_attendance', todayStr);"
);

fs.writeFileSync(INDEX, html, 'utf8');

let bootstrap = fs.readFileSync(BOOTSTRAP, 'utf8');
const seedVersionLine = `    html = html.replace('src="seed-wallet.js"', 'src="' + withVersion('seed-wallet.js') + '"');`;
const dailyVersionLine = `    html = html.replace('src="daily-progress.js"', 'src="' + withVersion('daily-progress.js') + '"');`;
if (!bootstrap.includes(dailyVersionLine)) {
  if (!bootstrap.includes(seedVersionLine)) throw new Error('bootstrap seed wallet version line not found');
  bootstrap = bootstrap.replace(seedVersionLine, `${seedVersionLine}\n${dailyVersionLine}`);
}
fs.writeFileSync(BOOTSTRAP, bootstrap, 'utf8');

console.log('Daily progress extraction complete');
