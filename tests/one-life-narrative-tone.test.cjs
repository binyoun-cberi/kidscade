'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../games/high_one_life');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('government scenes describe lived events rather than developer notes', () => {
 const local = read('joseon-v19-local-office.js');
 const discarded = [
  '조사에 반드시 결론이 나는 것은 아니다',
  '모든 지방관의 임명이 같은 방식',
  '사실 여부를 확인할 자료도 필요하다',
  '이번 수령은 세금 장부와 형벌의 처리에 신중하다'
 ];
 for(const phrase of discarded) assert.ok(!local.includes(phrase), phrase);
 for(const phrase of ['관아 앞이 붐비고', '나그네가 장터에서', '감찰에 나선 관리들'])
  assert.ok(local.includes(phrase), phrase);
});

test('village ledger and genealogy hide implementation terminology', () => {
 const script = read('game.js');
 const forbidden = [
  '가상 사건 기록', '인생 선택 ', '별도 모델로 제공되지 않습니다',
  '현재 해에 등록된 별도 역사 사건', '방계의 가상 인물',
  '직접 플레이하지 않아 간략하게 구성된 가상 기록'
 ];
 for(const phrase of forbidden) assert.ok(!script.includes(phrase), phrase);
 for(const phrase of ['탄원과 호소의 기록이 남아 있다', '방계의 후손'])
  assert.ok(script.includes(phrase), phrase);
});

test('historical method keeps clear fiction and quantitative disclaimers outside in-life panels', () => {
 const html = read('index.html');
 assert.match(html, /<details class="historical-method">/);
 assert.match(html, /수령 이름·부임 시기·감찰 결과·개인의 삶은 창작/);
 assert.match(html, /장부의 수치와 살림의 금액은 당시 실제 세액이나 오늘날의 원화가 아닙니다/);
 assert.ok(!html.includes('게임의 가상 상태입니다'));
 assert.ok(!html.includes('이 게임에서 함께 살아온 가상의 가족 기록'));
});

test('new narrative asset versions prevent stale browser scripts', () => {
 const html = read('index.html');
 for(const asset of ['game.js?v=64', 'joseon-v19-local-office.js?v=2', 'joseon-v18-sedo-samjeong.js?v=3',
   'joseon-v1.js?v=15', 'joseon-v14-captivity-generations.js?v=11'])
   assert.ok(html.includes(asset), asset);
});
