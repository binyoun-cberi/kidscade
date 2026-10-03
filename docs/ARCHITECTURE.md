# KIDSCADE Architecture

KIDSCADE remains one repository and one deployable platform. The refactor is a gradual boundary cleanup, not a framework rewrite.

## Rules

1. Keep the monorepo and modular Cloudflare Worker.
2. Keep each game isolated in an iframe.
3. Games communicate with the lobby through the KIDSCADE Game SDK/message contract, not parent DOM or parent globals.
4. New lobby runtime code belongs under app/, not repository root.
5. Legacy complexity may stay flat temporarily but may not grow.
6. The central game catalog remains the runtime source of truth until per-game manifests generate it.
7. Manual game version pins are legacy debt; move toward one deployment build identity.
8. Bootstrap HTML string surgery and build-time injection are transitional. Do not add new patch points.
9. Existing behavior must remain protected by regression tests while code moves.

## Target layout

    app/
      shell/       boot, lobby composition, navigation, modal lifecycle
      platform/    game host, SDK bridge, storage, audio, events, network
      features/    account, avatar, achievements, economy, home, teacher, Seed World

    games/
      <game-id>/
        game.json
        index.html
        game.js
        style.css
        assets/
        tests/

    legacy/        temporary compatibility adapters only
    worker/        modular Cloudflare Worker routes and domain modules

Dependency direction:

    shell -> features -> platform
    shell -> platform
    games -> Game SDK contract -> platform

Feature internals should not directly reach into other feature internals.

## Architecture ratchet

Baseline captured on 2026-10-04:

| Metric | Maximum |
| --- | ---: |
| Root runtime JS files | 84 |
| Catalog games entering through root HTML | 24 |
| Catalog entries with manual version pins | 66 |
| replaceBetween occurrences in main-bootstrap.js | 7 |
| scripts/inject-*.cjs files | 2 |

These are ceilings, not goals. When a migration removes legacy surface, lower the matching limit in config/architecture-ratchet.json in the same change. Raising a limit is an architecture exception and should be explained.

## Migration order

Phase 1: freeze legacy growth and establish ownership boundaries.

Phase 2: extract one responsibility at a time from index_base.html. Prefer source modules over bootstrap string replacement.

Phase 3: add a game.json beside each game and generate data/games.json from those manifests.

Phase 4: replace manual version pins with the deployment build id.

Phase 5: move remaining root runtime modules to app/ or games/. Delete index_base.html only after no production boot path depends on it.

## Migration completion checklist

A migration is safe when existing game links launch, iframe close/error/session behavior works, account/seed/achievement/playtime state still round-trips, npm run build passes, npm run test:ci passes, and no ratchet metric increases.
