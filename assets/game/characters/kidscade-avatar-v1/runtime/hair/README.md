# Kidscade curated avatar hair

New avatar hair must be authored as independent **128×128 transparent PNGs**. Do not add new styles to the legacy 6×4 source sheets.

## Shared coordinate system

- Canvas: 128×128
- Virtual head center: X=64
- Virtual head top: about Y=20
- Ear-center height: about Y=51
- Runtime scale: 1
- Runtime X/Y offset: 0/0
- Keep at least 5 px of safe canvas margin where the design allows it.
- No white matte, halo, detached pixels, neighboring-style fragments, or clipped canvas edges.

## Layer policy

- Short / ordinary styles: one `front` PNG.
- Long styles: matching `back` + `front` PNGs authored against the same fixed head guide.
- Ponytails, twin tails, braids, ornaments, or other detachable silhouettes may add optional extra parts later.
- Never auto-split a finished hair image against the bald-head silhouette.

Runtime order is:

`hairBack → base/body → face → hairFront → optional extra/accessory layers`

## Catalog

Only entries in `approved-hair-manifest.json` are selectable in the avatar studio. The old sheet-generated assets stay in the repository as legacy/reference data but are intentionally hidden from users.

A legacy saved hair selection that has no approved `hairId` falls back to the catalog's `fallbackId`.
