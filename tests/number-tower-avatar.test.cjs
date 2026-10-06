const fs=require('fs'),path=require('path'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'숫자 타워.html'),'utf8'),bridge=fs.readFileSync(path.join(root,'app/features/avatar/number-tower-avatar.js'),'utf8');
test('Number Tower loads live avatar bridge',()=>{assert.match(html,/number-tower-avatar\.js\?v=1/);assert.match(html,/kc-number-avatar/)});
test('all hero battle states map to avatar actions',()=>{for(const x of ['idle','walk','attack','hurt','dead'])assert.match(bridge,new RegExp("'"+x+"'"));assert.match(bridge,/battle\.counter/);assert.match(bridge,/battle\.attack/);assert.match(bridge,/#hero\.run/)});
test('legacy hero remains a fallback',()=>{assert.match(bridge,/classList\.remove\('kc-live'\)/);assert.match(html,/player-stand\.png/)});
test('death and restart lifecycle are wired',()=>{assert.match(html,/KidscadeNumberTowerAvatar\?\.death/);assert.match(html,/KidscadeNumberTowerAvatar\?\.reset/)});
