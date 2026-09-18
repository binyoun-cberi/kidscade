# Kidscade Asset Library - GitHub Desktop import

This package is structured so the top-level folder is exactly `assets/`.

## How to add with GitHub Desktop
1. Extract the ZIP.
2. Copy the extracted `assets` folder into the root of your local `kidscade` repository.
3. Allow the operating system to merge folders. Do **not** delete the existing `assets` folder first.
4. Open GitHub Desktop and review the changed/new files.
5. Commit the asset-library update, then push.

## New organized packs
- `assets/game/2d/racing/kenney-racing-pack/` - Kenney Racing Pack, CC0.
- `assets/game/2d/characters/kenney-modular-characters/` - Kenney Modular Characters, CC0.
- `assets/game/2d/tower-defense/isometric/` - already contained the uploaded Kenney Tower Defense pack, so the duplicate upload was not copied again.
- `assets/audio/incoming/newmusical/` - uploaded audio kept in quarantine because the ZIP had no license/readme. It is not added to the active audio catalog.

## Naming rules used
- Existing Kidscade paths were preserved.
- New pack directory names use lowercase kebab-case and no spaces.
- Original asset filenames are preserved so source packs remain easy to trace.
- Preview images, web links and obsolete SWF files were omitted.
- Useful individual PNGs, spritesheets/XML and SVG source art were kept for the Kenney packs.

## Important
The existing `assets/game/characeters/` typo is intentionally left untouched because current game code may still reference it. Fixing legacy paths should be a separate migration, not part of an asset import.
