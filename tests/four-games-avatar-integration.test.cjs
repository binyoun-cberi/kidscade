const fs=require('node:fs'),path=require('node:path'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('four avatar target games load or use shared bridge',()=>{
 assert.match(read('games/high_seed_baseball/index.html'),/app\/features\/avatar\/game-avatar-bridge/);
 assert.match(read('games/infinite_gugudan/무한 구구단： 무한루.html'),/app\/features\/avatar\/game-avatar-bridge/);
 assert.match(read('games/school_tower/수식의 첨탑.html'),/app\/features\/avatar\/game-avatar-bridge/);
 assert.match(read('games/korea_marble/K-트래블 마블.html'),/app\/features\/avatar\/game-avatar-bridge/);
});
test('baseball maps user action poses to live avatar',()=>{const s=read('games/high_seed_baseball/game.js');assert.match(s,/liveAvatar\('attack'\)/);assert.match(s,/liveAvatar\('walk'\)/)});
test('infinite hall maps fighter state to player avatar',()=>{const s=read('games/infinite_gugudan/무한 구구단： 무한루.html');assert.match(s,/leftFighter/);assert.match(s,/KidscadeGameAvatar\?\.applyImg/)});
test('arithmetic spire hooks hero combat pose',()=>{const s=read('games/school_tower/수식의 첨탑.html');assert.match(s,/window\.actorPose/);assert.match(s,/KidscadeGameAvatar\?\.applyImg/)});
test('K Travel uses human avatar on map token and turn card',()=>{const s=read('games/korea_marble/world-marble.js');assert.match(s,/humanAvatarHref/);assert.match(s,/createElementNS\('http:\/\/www\.w3\.org\/2000\/svg','image'\)/);assert.match(s,/syncTravelAvatar/)});
