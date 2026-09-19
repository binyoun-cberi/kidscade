# Kidscade Asset Library v3 — ADDON

This is a **merge-ready add-on** for the existing Kidscade `assets/game/` shared asset warehouse. It does **not** replace the v2 library.

## Install

Extract this ZIP at the Kidscade repository root and **merge** the included `assets/game/` tree. Do not upload the ZIP itself as a runtime asset. Existing v2 paths are not renamed or deleted.

## New runtime roots

- `assets/game/characters/people/kenney-platformer-characters/`
- `assets/game/characters/people/kenney-top-down-shooter/`
- `assets/game/2d/top-down-shooter/kenney-top-down-shooter/`
- `assets/game/2d/items/`
- `assets/game/2d/underwater/`
- `assets/game/ui/icons/`
- `assets/game/effects/particles/`
- `assets/game/effects/splats/`
- `assets/game/atlases/`

## Packing rules applied

- New paths use lowercase kebab-case.
- Runtime PNGs are favored; previews, SWF, editor files, macOS metadata, and redundant source/vector files are excluded.
- Atlas PNG+XML pairs are preserved together under `assets/game/atlases/`.
- Exact byte-identical files are SHA-256 checked and stored once; original-source mapping is preserved.
- Original licenses are copied into `assets/game/licenses/`.
- `import-map.json` records every included original path → new runtime path.
- `asset-catalog.json` records path, dimensions, bytes, SHA-256, source pack, and license metadata.

## Pack summary

- `kenney-platformer-characters`: 162 runtime files, 3 deduplicated source(s), CC0-1.0
- `kenney-top-down-shooter`: 583 runtime files, 0 deduplicated source(s), CC0-1.0
- `kenney-game-icons`: 427 runtime files, 1 deduplicated source(s), CC0-1.0
- `kenney-particle-pack`: 96 runtime files, 0 deduplicated source(s), CC0-1.0
- `kenney-generic-items`: 325 runtime files, 5 deduplicated source(s), CC0-1.0
- `kenney-splat-pack`: 72 runtime files, 0 deduplicated source(s), CC0-1.0
- `underwater-diving-art`: 20 runtime files, 0 deduplicated source(s), CC-BY-3.0
- `user-seafloor-tiles`: 2 runtime files, 0 deduplicated source(s), UNSPECIFIED-USER-PROVIDED

## Important license note

This library is **not all CC0**.

- Underwater Diving artwork is tracked as **CC BY 3.0** in the repository and keeps the Luis Zuno (@ansimuz) attribution.
- 3D v4 includes mixed CC0 / CC-BY packs; check each model before use.
- Pixabay audio under `assets/audio/incoming/newmusical/` is tracked under the Pixabay Content License based on owner-confirmed provenance.
- The two standalone seafloor tile PNGs have no license metadata and remain unverified.

Central record: `CREDITS.md` / `credits.html`.
