const fs=require('fs');const path=require('path');const test=require('node:test');const assert=require('node:assert/strict');
const html=fs.readFileSync(path.resolve(__dirname,'..','숫자 타워.html'),'utf8');
test('Number Tower gives three mistake chances',()=>{assert.match(html,/hearts=3/);assert.match(html,/function spendHeart/);assert.match(html,/기회는 3번/)});
test('Number Tower exposes readable route risk',()=>{assert.match(html,/✓ 안전/);assert.match(html,/⚠ 위험/);assert.match(html,/routeHint/)});
test('Number Tower rewards answer streaks',()=>{assert.match(html,/combo=0/);assert.match(html,/rewardCorrect/);assert.match(html,/연속 정답/)});
test('mobile battle UI keeps large answer targets',()=>{assert.match(html,/min-height:58px/)});
