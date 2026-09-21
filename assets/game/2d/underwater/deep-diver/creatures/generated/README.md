# Generated creature strips

These are the 2026-09-21 project-created creature PNG strips for Deep Diver.

- Keep each creature as one transparent horizontal strip; do not pre-slice it into four files.
- Runtime code divides each image into four equal horizontal cells, scans alpha to trim oversized transparent margins, and draws each frame at a normalized scale.
- This avoids GIF playback and keeps animation speed, flipping, hit logic, and pause behavior under game control.
- Classified assets are wired into the ecology tables. Timestamp-only uploads are preserved under _unclassified until their species identity is confirmed.
