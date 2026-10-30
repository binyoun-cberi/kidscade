# 낙서 바다 연구소

A browser-local creative aquarium in the Kidscade lobby (`doodle_aquarium`).

## Player experience

- Draw with pointer/pen/touch, erase, flood-fill, stamp eyes, undo/redo (20 snapshots), or begin with four templates.
- Import a PNG up to 8 MiB / 4096×4096. Transparent PNGs work best; opaque backgrounds can be erased manually.
- Name a creature and choose its head direction, swimming style and personality. Artwork is cropped to its painted bounds and animated with tail-weighted deformation.
- Up to 30 creatures, including archived creatures. Watch, feed, make bubbles, follow curious fish, observe calm/shy behavior, archive, restore and repaint friends.
- Feeding grows a fish gently and produces a pearl for every three pellets eaten. Three pearls permanently unlock the castle. No starvation or offline penalties.
- Place up to 50 plants, rocks, castles or custom drawings and drag them around. Three water palettes and reduced-motion control.
- IndexedDB auto-saves mutations immediately; unfinished editor work is saved as a draft. JSON export/import moves the complete aquarium between devices; PNG export captures the aquarium. Imports are schema-checked and all artwork decodes before the current aquarium is replaced.
- SDK pause/resume and exit lifecycle, creation outcomes and lobby achievement definitions are integrated.

## Assets and data

Reuses `assets/game/2d/fish/seaweed_green_a.png` and `background_rock_a.png` from Kenney Fish Pack (CC0). Credit is in Settings and `assets/game/licenses/kenney-fish-pack.txt`. The cover is original SVG. No remote model/API calls or new dependencies; drawings stay in the browser.

This version has no breeding, shared online classroom aquarium or automatic photo background removal. Decoration drawings can be moved but not repainted in place; creature drawings can. Local browser storage can be cleared by the browser, so the Settings export is the portable backup.

## Verification (2026-10-30)

- `node --test tests/doodle-aquarium.test.cjs tests/catalog-metadata.test.cjs`: 12 passed.
- Targeted aquarium + achievement + outcome profile + game exit checks: 19 passed.
- `npm run health:strict`: passed (existing advisory cleanup warnings remain).
- `npm run build`: passed.
- `npm run test:ci` immediately after the build: all four groups passed; 2,845 tests, 2,844 passed, 1 skipped, 0 failed.
- Real cloud Chromium UI: create a named fish from a template, add eyes, freehand draw, release a second creature, feed/consume, view details, archive/restore across reload, place/drag decorations, pause, export JSON, import a 30-fish test aquarium, reject a 31st creation, restore original export.
- Real browser iframe viewports: 390×844, 820×1024, 844×390; desktop 1365×936. These are responsive browser checks, not physical iPhone/iPad or touch-hardware validation. No frame-rate benchmark is claimed.

Topic branch / PR only. No production deployment, migrations, keys, billing changes or existing student-record edits.
