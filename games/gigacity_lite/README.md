# Gigacity Lite — iPhone-first city flight experiment

This is an isolated graphics prototype, not a new playable Kidscade game and not included in the main game catalog yet.

## Entry point

Local path: /games/gigacity_lite/index.html

This page uses the vendored Three.js r160 module. There are no external runtime libraries, external models, game data, leaderboards, or new network calls.

## Features

- Deterministic seed-derived city chunks, 4 × 4 building lots per chunk.
- Circular streaming around the camera; unloads obsolete detailed chunks and builds new ones on demand.
- Instanced skyscraper meshes and a lightweight window lighting shader.
- Distant simplified skyline in one batch, fog, day/night switch.
- Animated instanced flying traffic, camera-only free-flight and automatic guided flyover.
- Touch joystick, touch camera swipe, ascent/descent and boost buttons.
- Keyboard WASD, Q/E for altitude, arrow keys to look, Shift to boost.
- Adjustable low / medium / high preset and AUTO pixel-ratio reduction at sustained low frame rates.
- Safe-area HUD for iPhone and iPad.
- Scene pauses simulation progress while browser tab is hidden.

## Real-world performance validation still required

On actual iPhones and iPads, test sustained frame pacing for at least 10–15 minutes, thermal throttling, browser tab restore, WebGL context loss, portrait/landscape transitions, touch capture after system gestures, and behavior on entry-level tablets. The FPS readout is a diagnostic, not a benchmark certification.

## Intentionally not included

- Game progression, NPCs, missions, interiors, ground vehicle collisions.
- Physically correct reflections or room-interior raymarching.
- Collision avoidance for manually piloted camera.
- Claim of visual/technical parity with sael.net/gigacity.

Tests: node --test tests/gigacity-lite.test.mjs

Public catalog integration and Cloudflare release should follow device verification.
