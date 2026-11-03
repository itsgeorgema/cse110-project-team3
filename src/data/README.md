# `src/data/`

This layer owns saved progress data and its browser-storage adapter. The level
catalog and game-ready `LevelDataConfig` definitions described in early design
views are not implemented in this directory yet.

## Implemented files

- [`SaveData.ts`](./SaveData.ts) defines the version 1 save shape: completed
  `LevelAddress` values and the current selection.
- [`SaveManager.ts`](./SaveManager.ts) loads, validates, copies, saves, and
  resets that shape using an injected storage object. The default key is
  `escape-route-progress`. Invalid JSON or an unsupported shape loads as an
  empty save. Storage access errors are allowed to reach the caller so the
  application can choose a session-only fallback.

`SaveManager` persists addresses, not answer history, scores, or drafts. Its
`recordCompletedLevel` helper adds an address once while retaining the current
selection. The application currently connects save data to the story-map
preview in `src/main.ts`; gameplay completion is not wired to persistence.

Tests live beside the implementation as `*.test.ts`. See the
[testing plan](../../docs/testing/README.md) for current coverage.
