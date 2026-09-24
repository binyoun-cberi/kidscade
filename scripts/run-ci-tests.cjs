#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');

const TEST_FILES = [
  "tests/audio-manager.test.cjs",
  "tests/audio-integration.test.cjs",
  "tests/touch-interaction-guard.test.cjs",
  "tests/game-cover-overrides.test.cjs",
  "tests/game-description-overrides.test.cjs",
  "tests/profile-history.test.cjs",
  "tests/playtime-state.test.cjs",
  "tests/index-base-playtime.test.cjs",
  "tests/seed-wallet.test.cjs",
  "tests/index-base-seed-wallet.test.cjs",
  "tests/daily-progress.test.cjs",
  "tests/index-base-daily-progress.test.cjs",
  "tests/achievement-state.test.cjs",
  "tests/index-base-achievement.test.cjs",
  "tests/shop-state.test.cjs",
  "tests/index-base-shop-state.test.cjs",
  "tests/ui-information-architecture.test.cjs",
  "tests/ui-visual-polish.test.cjs",
  "tests/accounts.test.mjs",
  "tests/teacher-management.test.mjs",
  "tests/seed-rankings.test.mjs",
  "tests/game-records.test.mjs",
  "tests/multiplayer.test.mjs",
  "tests/wordchain.test.mjs",
  "tests/wordchain-realtime-v2.test.mjs",
  "tests/history-live.test.mjs",
  "tests/rhythm-dash-v11.test.cjs",
  "tests/alien-pizza-dx2.test.cjs",
  "tests/maratang-selfbar.test.cjs",
  "tests/bunsik-kitchen.test.cjs",
  "tests/deep-diver-2d.test.cjs",
  "tests/code-breaker-dx.test.cjs",
  "tests/police-patrol.test.cjs",
  "tests/math-tower-defense-3d.test.cjs",
  "tests/spelling-frog-assets.test.cjs",
  "tests/word-blaster.test.cjs",
  "tests/cleanup-squad.test.cjs",
  "tests/bridge-builder.test.cjs",
  "tests/server-stats-worker.test.mjs",
  "tests/stats-rankings.test.cjs",
  "tests/storage.test.cjs",
  "tests/game-classification.test.cjs","tests/catalog-metadata.test.cjs",
  "tests/age-navigation.test.cjs",
  "tests/game-launcher.test.cjs",
  "tests/game-exit-navigation.test.cjs",
  "tests/release-smoke.test.cjs",
  "tests/game-filenames.test.cjs",
  "tests/recommendations.test.cjs",
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
