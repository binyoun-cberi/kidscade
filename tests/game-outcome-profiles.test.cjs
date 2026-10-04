const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const profiles = require('../game-outcome-profiles.js');
const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8'));
const games = (Array.isArray(raw) ? raw : raw.games || []).filter(game => !game.disabled);

test('every active game has exactly one outcome profile', () => {
  assert.equal(games.length, 139);
  assert.equal(profiles.size, games.length);
  const all = profiles.getProfiles();
  assert.equal(all.length, games.length);
  assert.equal(new Set(all.map(profile => profile.gameId)).size, games.length);
  for (const game of games) {
    const profile = profiles.getProfile(game.id);
    assert.ok(profile, 'missing profile: ' + game.id);
    assert.equal(profile.gameId, game.id);
    assert.ok(profiles.models[profile.model], 'unknown model for ' + game.id);
  }
});

test('outcome models define metric-driven baseline achievements', () => {
  for (const [model, def] of Object.entries(profiles.models)) {
    assert.ok(def.scope, model + ' needs scope');
    assert.ok(def.legacy, model + ' needs legacy policy');
    assert.equal(def.baseline.length, 2, model + ' needs two baseline achievements');
    for (const item of def.baseline) {
      assert.ok(item.slot);
      assert.ok(item.metric);
      assert.ok(item.target >= 1);
      assert.ok(item.title);
    }
  }
});

test('representative games use the intended result semantics', () => {
  assert.equal(profiles.getProfile('high_seed_baseball').model, 'match');
  assert.equal(profiles.getProfile('low_wordris').model, 'run');
  assert.equal(profiles.getProfile('high_code_quest').model, 'stage');
  assert.equal(profiles.getProfile('job_bogle_bunsik').model, 'shift');
  assert.equal(profiles.getProfile('high_weathercaster_simulator').model, 'mission');
  assert.equal(profiles.getProfile('high_twelve_island').model, 'campaign');
  assert.equal(profiles.getProfile('high_human_history_cards').model, 'progression');
  assert.equal(profiles.getProfile('high_little_world').model, 'sandbox');
  assert.equal(profiles.getProfile('pixel_editor').model, 'creation');
  assert.equal(profiles.getProfile('world_boardgames').model, 'collection');
});

test('legacy game-over fallback is conservative for ambiguous games', () => {
  assert.equal(profiles.getProfile('low_pong_battle').legacy, 'match-end');
  assert.equal(profiles.getProfile('low_blind_elephant').legacy, 'session-end');
  assert.equal(profiles.getProfile('jineung_bird').legacy, 'run-end');
  assert.equal(profiles.getProfile('low_pattern_lock').legacy, 'explicit-success');
  assert.equal(profiles.getProfile('high_little_world').legacy, 'ignore');
});
