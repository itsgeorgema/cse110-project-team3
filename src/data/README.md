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
  kinematics levels 1–4, net-force levels 1–2, and circular-motion levels 1 and 3
  with random values. The validator's
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
  application can choose a session-only fallback. `exportSave()` returns the
  stored progress as a JSON file body, and `importSave(text)` replaces the
  stored progress with such a file (upgrading version 1 files). An invalid file
  throws and leaves the current progress untouched (#3).

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

## Kinematics level 4 (#17)

- [#17](https://github.com/itsgeorgema/cse110-project-team3/issues/17):
  `createLevelDataConfig("kinematics", 4)` asks for `averageVelocity` in m/s
  and `distance` in m. Initial velocity is 5–30 m/s, constant acceleration
  is 1–5 m/s², and duration is 2–7 s. Both answers must be correct.
  The formulas are `v_avg = v_0 + a*t/2` and `d = v_avg*t`.
  This config uses nonnegative answer bounds and an absolute tolerance of
  0.00001. Generated answers are integers or exact half-integers, so players
  need no rounding instructions. Problem text is supplied through the existing
  `problemStatement` field; no separate controller text generator is needed.
  `kinematicsLevel4.test.ts` covers range edges, units, formulas, real validator checks,
  and invalid input / wrong answer / correction through `GameController`.

This change implements the physics and problem-generation scope of #17. The new
config is not yet registered in the production catalog or placed on the map;
playback remains separate view integration work.

## Net-force level 1 (#18)

For [#18](https://github.com/itsgeorgema/cse110-project-team3/issues/18),
`createLevelDataConfig("netForce", 1)` asks for `force` in N, using the
existing `PhysicsEngine.calculateForce(mass, acceleration)`. Mass is
5–30 kg and acceleration is 1–5 m/s². The statement specifies a horizontal
push with no friction, so the applied force equals `m*a`.

The config uses nonnegative answer bounds and an absolute tolerance of 0.00001.
Generated answers are integers, so players need no rounding instructions.
Problem text is supplied through the existing `problemStatement` field; no
separate controller text generator is needed. `LevelDataConfig.test.ts` covers
range edges, units, formulas, real validator checks, and invalid input / wrong
answer / correction through `GameController`.

This change implements the physics and problem-generation scope of #18. The
config is not yet registered in the production catalog or placed on the map;
playback and labeled force diagrams remain separate view integration work.
