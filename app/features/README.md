# Features

Each product domain owns its state, UI adapter, and public API here.

Features should not reach into another feature's private state or DOM. Prefer explicit public functions or platform events for cross-feature coordination.
