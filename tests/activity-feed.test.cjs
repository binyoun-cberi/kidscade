const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const lib = require('../activity-feed.js');
function store() { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k,v) => m.set(k,String(v)), map:m }; }
test('activity feed records order, unread state, and deduplication', () => {
  let now=1790755200000; const storage=store(); const feed=lib.create({localStorage:storage,now:()=>++now});
  assert.equal(feed.countUnread(),0);
  feed.record('attendance',{title:'출석 완료',dedupeKey:'attendance-2026-09-30'});
  assert.equal(feed.record('attendance',{title:'다시 출석',dedupeKey:'attendance-2026-09-30'}),null);
  feed.record('start',{title:'게임 시작',gameId:'demo'});
  assert.deepEqual(feed.read().events.map(x=>x.type),['start','attendance']);
  assert.equal(feed.countUnread(),2);
  feed.markRead(); assert.equal(feed.countUnread(),0);
  feed.record('clear',{title:'성공'}); assert.equal(feed.countUnread(),1);
  assert.equal(storage.map.has(lib.KEY),true);
});
test('corrupt input and event history stay bounded', () => {
  const s=store();s.setItem(lib.KEY,'{bad');
  const feed=lib.create({localStorage:s,now:()=>Date.now()});
  assert.deepEqual(feed.read(),lib.emptyState());
  assert.equal(feed.record('invalid',{title:'no'}),null);
  for(let i=0;i<270;i++)feed.record('start',{title:'게임 '+i});
  assert.equal(feed.read().events.length,lib.MAX_EVENTS);
  assert.equal(feed.record('clear',{title:'<b>okay</b>'}).title,'bokay/b');
});
test('activity feed is linked, and full-screen attendance stamp is gone', () => {
  const root=path.resolve(__dirname,'..');
  const read=name=>fs.readFileSync(path.join(root,name),'utf8');
  assert.match(read('main-bootstrap.js'),/'activity-feed.js'/);
  assert.match(read('main-bootstrap.js'),/withVersion\('activity-feed.css'\)/);
  assert.match(read('kidscade-storage.js'),/activityFeed: 'kidscade_activity_feed_v1'/);
  assert.doesNotMatch(read('index_base.html'),/id="attendance-stamp"/);
  assert.match(read('daily-ui.js'),/record\?\.\('attendance'/);
  assert.doesNotMatch(read('index_base.html'),/KidscadeActivity\?\.record\?\.\('attendance'/);
  assert.match(read('game-launcher.js'),/KidscadeActivity\?\.record\?\.\('start'/);
});


test('teacher management shortcut is teacher-only and sits left of activity history', () => {
  const root=path.resolve(__dirname,'..');
  const source=fs.readFileSync(path.join(root,'activity-feed.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'activity-feed.css'),'utf8');
  assert.match(source, /KidscadeAccount\?\.account\?\.role === 'teacher'/);
  assert.match(source, /if \(!isTeacherAccount\) \{\s*teacherLauncher\?\.remove\(\)/);
  assert.match(source, /teacherLauncher\.href = '\/teacher\/'/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /kidscade:account-changed/);
  assert.match(source, /host\.insertBefore\(teacherLauncher, launcher\)/);
  assert.match(css, /\.kc-teacher-launcher\{/);
});
