# Legacy quarantine

This directory is for temporary compatibility adapters created while extracting responsibilities from the old lobby/runtime structure.

Rules:
- no new product feature starts here;
- every adapter names the modern owner it forwards to;
- adapters stay thin and regression-tested;
- delete an adapter when its last consumer is migrated.

Existing root legacy files are not moved here in bulk. They are migrated one responsibility at a time to avoid a destructive big-bang refactor.
