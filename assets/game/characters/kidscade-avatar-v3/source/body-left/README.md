# Kidscade Avatar V3 left-facing body sources

Uploaded AI drafts are wired into the admin Avatar Studio in this order:

1. STAND 01
2. STAND 02
3. WALK 01
4. WALK 02
5. WALK 03
6. WALK 04
7. JUMP 01

These are **source drafts**, not final runtime sprites. The studio automatically rasterizes them onto the 128×128 grid, aligns the whole set using STAND-01 as the common x=64 / y=118 reference, and keeps the remaining per-frame differences visible for manual 1px cleanup.

Final exports should come from the Avatar Studio as BODY runtime frames. HAIR BACK / HAIR FRONT / UPPER / LOWER stay separate.
