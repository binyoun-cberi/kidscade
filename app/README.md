# KIDSCADE application modules

This directory is the destination for lobby and platform code extracted from repository root.

- shell/: boot and application composition.
- platform/: shared infrastructure and cross-cutting contracts.
- features/: account, avatar, achievements, economy, home, teacher tools, Seed World, and other product domains.

Do not move files here only to make the tree look cleaner. Move a responsibility with its callers and tests, then leave the smallest possible compatibility shim at the old path only when it is still required.

New lobby runtime JavaScript should be created under app/ instead of repository root.
