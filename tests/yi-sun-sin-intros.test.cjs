'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const gameRoot = path.join(__dirname, '../games/yi-sun-sin');
const read = file => fs.readFileSync(path.join(gameRoot, file), 'utf8');

test('11개 실전은 모두 지도 좌표와 독립된 역사 연출을 가진다', async () => {
  const { BATTLE_ORDER, BATTLES } = await import('../games/yi-sun-sin/sim.mjs');
  const { CAMPAIGN_INTROS } = await import('../games/yi-sun-sin/campaign-intros.mjs');
  assert.deepEqual(Object.keys(CAMPAIGN_INTROS), BATTLE_ORDER);
  for (const id of BATTLE_ORDER) {
    const intro = CAMPAIGN_INTROS[id];
    assert.ok(Number.isFinite(intro.x) && intro.x >= 5 && intro.x <= 95, id);
    assert.ok(Number.isFinite(intro.y) && intro.y >= 10 && intro.y <= 90, id);
    for (const key of ['place', 'era', 'lead', 'story', 'diaryDate', 'diary', 'caveat', 'source']) {
      assert.ok(intro[key]?.length > (key === 'place' ? 3 : 8), `${id}.${key}`);
    }
    assert.ok(intro.diaryDate.includes('난중일기'), id);
    assert.ok(intro.source.startsWith('https://'), id);
    assert.ok(BATTLES[id].chapter > 0, id);
  }
  assert.match(CAMPAIGN_INTROS.okpo.caveat, /기록되어 있지/);
  assert.match(CAMPAIGN_INTROS.noryang.caveat, /일기에 썼다고 주장하지/);
  assert.match(CAMPAIGN_INTROS.myeongnyang.diaryDate, /9월 15~16일/);
});

test('지도 표식과 연출 버튼·연대기 동작은 실제 DOM에 연결된다', () => {
  const html = read('index.html');
  const js = read('game.js');
  const css = read('style.css');
  const ids = ['campaignScreen','mapMarkers','mapChapterList','mapSelected','mapStartBtn','cinematicScreen','crawlContent','cinematicSkip','cinematicBack','cinematicSource','shipGuideBtn'];
  for (const id of ids) {
    assert.match(html, new RegExp(`id="${id}"`), `${id} DOM 요소`);
    assert.match(js, new RegExp(`\\$\\('${id}'\\)`), `${id} 스크립트 연결`);
  }
  assert.match(html, /id="atlasTitle"/);
  assert.match(js, /chooseMapBattle\(id\)/);
  assert.match(js, /animationName === 'historyCrawl'/);
  assert.match(js, /startRun\(game\)/);
  assert.match(css, /@keyframes historyCrawl/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(html, /남해안 지형·표식 위치는 학습용 도식/);
});

test('이전 11장 저장 이관과 캠페인 해금은 지도 전환 후에도 유지된다', async () => {
  const { BATTLE_ORDER, restoreCampaign, isBattleUnlocked } = await import('../games/yi-sun-sin/sim.mjs');
  const fresh = restoreCampaign(null);
  assert.equal(isBattleUnlocked(fresh, 'okpo'), true);
  assert.equal(isBattleUnlocked(fresh, 'hansando'), false);
  const oldRecord = restoreCampaign({ version: 2, completed: ['okpo', 'sacheon', 'dangpo', 'danghangpo', 'hansando'] });
  assert.equal(oldRecord.version, 3);
  assert.equal(isBattleUnlocked(oldRecord, 'angolpo'), true);
  for (const id of BATTLE_ORDER) assert.equal(typeof isBattleUnlocked(oldRecord, id), 'boolean');
});
