# `src/data/`

This layer owns level definitions, saved progress data, and its browser-storage
adapter. The catalog supplies implemented levels to the map-launched level panel.

## Implemented files

- [`levelCatalog.ts`](./levelCatalog.ts) registers kinematics levels 1–3 and
  net-force level 2 with titles and lazy factory callbacks. Add registrations
  only when their factory implementation exists. The controller's `LevelManager`
  uses this catalog without depending on individual minigames.
- [`LevelDataConfig.ts`](./LevelDataConfig.ts) defines the one level shape
  (`gameId`, `levelId`, problem text, `userInputVariables` and their units,
  expected answers, tolerance, bounds). `LevelDataConfigFactory` generates the
  kinematics levels 1–3 and net-force level 2 with random values. The validator's
  `AnswerValidationConfig` is derived from this type (#75).
- [`SaveData.ts`](./SaveData.ts) defines the version 1 save shape: completed
  `LevelAddress` values and the current selection.
- [`validateLevelConfig.ts`](./validateLevelConfig.ts) exports
  `assertLevelConfig(value)`. It throws for malformed identity, problem data,
  answer fields, tolerance, or bounds and narrows valid data to `LevelDataConfig`.
  Variable maps must match their declared fields; bounds may cover a subset of
  answer fields. Empty unit strings represent dimensionless answers. Bounds
  must contain the expected answer. This checks consistency, not physics accuracy.
- [`SaveManager.ts`](./SaveManager.ts) loads, validates, copies, saves, and
  resets that shape using an injected storage object. The default key is
  `escape-route-progress`. Invalid JSON or an unsupported shape loads as an
  empty save. Storage access errors are allowed to reach the caller so the
  application can choose a session-only fallback.

`SaveManager` persists addresses, not answer history, scores, or drafts. Its
`recordCompletedLevel` helper adds an address once while retaining the current
selection. The application currently connects save data to the story-map
in `src/main.ts`; gameplay completion is not wired to persistence.

Tests live beside the implementation as `*.test.ts`. See the
[testing plan](../../docs/testing/README.md) for current coverage.

Before consuming a generated config, call `assertLevelConfig(config)` and handle
any error at the loading boundary. The check does not mutate data. `LevelManager`
owns this boundary and returns player-facing failure messages to `LevelSession`.
Run `npm run test:coverage` for the existing
CI unit suite, including deterministic factory samples and malformed-config tests.
