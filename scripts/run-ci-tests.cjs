#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');

const TEST_FILES = [
  "tests/pixel-avatar-studio.test.cjs",
  "tests/avatar-wardrobe.test.cjs",
  "tests/avatar-clothing-studio.test.cjs",
  "tests/school-starter.test.cjs",
  "tests/audio-manager.test.cjs",
  "tests/audio-integration.test.cjs",
  "tests/touch-interaction-guard.test.cjs",
  "tests/game-cover-overrides.test.cjs",
  "tests/game-description-overrides.test.cjs",
  "tests/profile-history.test.cjs",
  "tests/activity-feed.test.cjs",
  "tests/playtime-state.test.cjs",
  "tests/index-base-playtime.test.cjs",
  "tests/seed-wallet.test.cjs",
  "tests/index-base-seed-wallet.test.cjs",
  "tests/daily-progress.test.cjs",
  "tests/daily-ui.test.cjs",
  "tests/index-base-daily-progress.test.cjs",
  "tests/achievement-state.test.cjs",
  "tests/game-outcome-profiles.test.cjs",
  "tests/game-result-wiring-batch1.test.cjs",
  "tests/index-base-achievement.test.cjs",
  "tests/achievement-system.test.cjs",
  "tests/shop-state.test.cjs",
  "tests/shop-ui.test.cjs",
  "tests/theme-ui.test.cjs",
  "tests/index-base-shop-state.test.cjs",
  "tests/retired-canvas-pets.test.cjs",
  "tests/retired-garden-css.test.cjs",
  "tests/retired-pet-shop.test.cjs",
  "tests/auto-update.test.cjs",
  "tests/ui-information-architecture.test.cjs",
  "tests/ui-visual-polish.test.cjs",
  "tests/accounts.test.mjs",
  "tests/account-ui-observer.test.cjs",
  "tests/teacher-management.test.mjs",
  "tests/economy.test.mjs",
  "tests/economy-v3.test.mjs",
  "tests/economy-job-capabilities.test.mjs",
  "tests/economy-real-estate.test.mjs",
  "tests/sprout-power.test.mjs",
  "tests/game-records.test.mjs",
  "tests/multiplayer.test.mjs",
  "tests/wordchain.test.mjs",
  "tests/wordchain-realtime-v2.test.mjs",
  "tests/history-live.test.mjs",
  "tests/rhythm-dash-v11.test.cjs",
  "tests/alien-pizza-dx2.test.cjs",
  "tests/fraction-smith.test.cjs",
  "tests/market-walk.test.cjs",
  "tests/pass-mafia.test.cjs",
  "tests/maratang-selfbar.test.cjs",
  "tests/nail-artist-tycoon.test.cjs",
  "tests/world-flag-master-v2.test.cjs",
  "tests/k-travel-world-marble.test.cjs",
  "tests/bunsik-kitchen.test.cjs",
  "tests/restaurant-engine.test.cjs",
  "tests/deep-diver-2d.test.cjs",
  "tests/code-breaker-dx.test.cjs",
  "tests/code-quest-v4.test.cjs",
  "tests/code-quest-full-campaign.test.cjs",
"tests/unification-war-v12.test.cjs",
  "tests/police-patrol.test.cjs",
  "tests/driver-license.test.cjs",
  "tests/folklore-night-guard-persistence.test.cjs",
  "tests/quarantine-field-topdown.test.cjs",
  "tests/drone-pilot-v3.test.cjs",
  "tests/byeokrando-tutorial.test.cjs",
  "tests/math-tower-defense-3d.test.cjs",
  "tests/spelling-frog-assets.test.cjs",
  "tests/word-blaster.test.cjs",
  "tests/cleanup-squad.test.cjs",
  "tests/ecopolis.test.cjs",
  "tests/high-twelve-island.test.cjs",
  "tests/traditional-play-yard.test.cjs",
  "tests/bridge-builder.test.cjs",
  "tests/cube-architect-v31.test.cjs",
  "tests/cube-architect-physics.test.cjs",
  "tests/cube-architect-shrine.test.cjs",
  "tests/rule-lab.test.cjs",
  "tests/server-stats-worker.test.mjs",
  "tests/stats-rankings.test.cjs",
  "tests/storage.test.cjs",
  "tests/game-classification.test.cjs","tests/catalog-metadata.test.cjs","tests/catalog-discovery.test.cjs","tests/game-sdk.test.cjs","tests/game-frame-shell.test.cjs","tests/game-sdk-adoption.test.cjs","tests/source-owned-integrations.test.cjs",
  "tests/age-navigation.test.cjs",
  "tests/game-launcher.test.cjs",
  "tests/game-exit-navigation.test.cjs",
  "tests/release-smoke.test.cjs",
  "tests/game-filenames.test.cjs",
  "tests/recommendations.test.cjs",
  "tests/home-v2.test.cjs",
  "tests/lobby-recovery.test.cjs",
  "tests/garden.test.cjs",
  "tests/world-v3-hud.test.cjs",
  "tests/world-v3-progression.test.cjs",
  "tests/world-v3-homestead.test.cjs",
  "tests/world-v3-starter-loop.test.cjs",
  "tests/world-v3-town.test.cjs",
  "tests/world-v3-survival-pets.test.cjs",
  "tests/seed-world-meta.test.cjs",
  "tests/main-architecture.test.cjs"
];

const results = [];

function run(label, command, args) {
  console.log('\n============================================================');
  console.log(label);
  console.log('============================================================');
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env
  });
  const status = Number.isInteger(result.status) ? result.status : 1;
  results.push({ label, status });
  return status === 0;
}

run(
  'Kidscade regression tests',
  process.execPath,
  ['--test', '--test-concurrency=4', ...TEST_FILES]
);

run(
  'Kidscade storage namespace audit',
  process.execPath,
  ['scripts/storage-audit.cjs', '--strict']
);

run(
  'Kidscade deployment path audit',
  process.execPath,
  ['scripts/deployment-audit.cjs', '--strict']
);

run(
  'Kidscade architecture ratchet',
  process.execPath,
  ['scripts/architecture-ratchet.cjs']
);

const failed = results.filter(result => result.status !== 0);
console.log('\n============================================================');
console.log('CI suite summary');
console.log('============================================================');
for (const result of results) {
  console.log(`- ${result.status === 0 ? 'PASS' : 'FAIL'}  ${result.label}`);
}

if (failed.length) {
  console.error(`\n${failed.length} CI group(s) failed. See the complete logs above; later groups were still executed.`);
  process.exitCode = 1;
} else {
  console.log('\nAll Kidscade CI groups passed.');
}
