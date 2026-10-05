const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');

test('rich achievement catalog exposes real game-specific achievements',()=>{
  const c=read('achievement-catalog.js');
  for(const token of [
    "high_human_history_cards:Object.freeze",
    "slot:'iron_age'",
    "slot:'zero_waste_30'",
    "slot:'home_run'",
    "slot:'perfect_100'",
    "slot:'hadal_mission'",
    "slot:'campaign_15'",
    "slot:'rights_safe_30'",
    "slot:'roads'"
  ]) assert.ok(c.includes(token),token);
});

test('Stone Age reports eras, lifestyles and dolmen achievements',()=>{
  const js=read('games/high_human_history_cards/game.js');
  assert.match(js,/reportAchievement\('bronze_age'/);
  assert.match(js,/reportAchievement\('iron_age'/);
  assert.match(js,/reportAchievement\('four_lifestyles'/);
  assert.match(js,/reportAchievement\('dolmen'/);
  assert.match(js,/reportAchievement\('neolithic_settlement'/);
  assert.match(js,/KidscadeGame\?\.milestone/);
});

test('Factory Tycoon promotes built-in production challenges to achievements',()=>{
  const js=read('games/high_factory_tycoon/factory-tycoon.js');
  assert.match(js,/reportAchievement\('first_shipment'/);
  assert.match(js,/reportAchievement\('inventor'/);
  assert.match(js,/reportAchievement\('discoveries_3'/);
  assert.match(js,/reportAchievement\('rate_10'/);
  assert.match(js,/reportAchievement\('zero_waste_30'/);
  assert.match(js,/reportAchievement\('rate_20'/);
});

test('Seed Baseball reports hits, home runs, pitching and final match outcome',()=>{
  const js=read('games/high_seed_baseball/game.js');
  assert.match(js,/reportAchievement\('first_hit'/);
  assert.match(js,/reportAchievement\('home_run'/);
  assert.match(js,/reportAchievement\('doctor_k'/);
  assert.match(js,/reportAchievement\('two_way'/);
  assert.match(js,/reportAchievement\('shutout_win'/);
  assert.match(js,/reportAchievement\('extra_inning_win'/);
  assert.match(js,/scope:'match',status:'completed'/);
});

test('Weathercaster reports mission result and performance achievements',()=>{
  const html=read('games/high_weathercaster_simulator/index.html');
  assert.match(html,/high_weathercaster_simulator\.first_broadcast/);
  assert.match(html,/high_weathercaster_simulator\.forecast_perfect/);
  assert.match(html,/high_weathercaster_simulator\.map_perfect/);
  assert.match(html,/high_weathercaster_simulator\.alert_perfect/);
  assert.match(html,/high_weathercaster_simulator\.perfect_100/);
  assert.match(html,/sdk\("result",\{scope:"mission"/);
  assert.doesNotMatch(html,/sdk\("gameOver",\{score:total\}\)/);
});

test('Deep Diver reports depth, photo and hadal achievements with mission results',()=>{
  const js=read('games/job_scuba_diver/diver-v7.js');
  assert.match(js,/reportAchievement\('depth_600'/);
  assert.match(js,/reportAchievement\('depth_800'/);
  assert.match(js,/reportAchievement\('s_photo'/);
  assert.match(js,/reportAchievement\('hadal_trinity'/);
  assert.match(js,/reportAchievement\('first_mission'/);
  assert.match(js,/reportAchievement\('hadal_mission'/);
  assert.match(js,/scope:'mission'/);
});

test('Maratang reports order, clean-day and campaign achievements',()=>{
  const js=read('games/job_maratang_simulator/maratang-selfbar.js');
  assert.match(js,/reportAchievement\('first_order'/);
  assert.match(js,/reportAchievement\('perfect_order'/);
  assert.match(js,/reportAchievement\('zero_waste_day'/);
  assert.match(js,/reportAchievement\('no_walkout_day'/);
  assert.match(js,/reportAchievement\('reputation_90'/);
  assert.match(js,/reportAchievement\('campaign_15'/);
  assert.match(js,/scope:'shift',status:'completed'/);
});

test('Village Chief derives achievements from persistent governance state',()=>{
  const js=read('games/high_twelve_island/game.js');
  assert.match(js,/reportAchievement\("first_rule"/);
  assert.match(js,/reportAchievement\("autonomous_village"/);
  assert.match(js,/reportAchievement\("newcomers_5"/);
  assert.match(js,/reportAchievement\("trust_90"/);
  assert.match(js,/reportAchievement\("rights_safe_30"/);
});

test('Little World derives achievements from ecology and civilization state',()=>{
  const js=read('games/high_little_world/game.js');
  assert.match(js,/reportAchievement\('first_life'/);
  assert.match(js,/reportAchievement\('food_chain'/);
  assert.match(js,/reportAchievement\('first_village'/);
  assert.match(js,/reportAchievement\('two_settlements'/);
  assert.match(js,/reportAchievement\('roads'/);
  assert.match(js,/KidscadeGame\?\.milestone/);
});
