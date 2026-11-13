# `src/model/`

The model layer contains logic and records that do not depend on rendering.
Current modules are small services with explicit inputs; they are not yet
composed into a playable game loop.

## Implemented files

- [`AnswerValidator.ts`](./AnswerValidator.ts) declares the answer submission,
  validation configuration/result, and validator contract.
- [`DefaultAnswerValidator.ts`](./DefaultAnswerValidator.ts) checks level
  identity, required finite values, configured bounds, and numerical tolerance.
- [`PhysicsEngine.ts`](./PhysicsEngine.ts) provides checked arithmetic and
  constant-velocity kinematics helpers. It is not a Matter.js adapter or a
  time-stepped simulation engine.
- [`ProgressTracker.ts`](./ProgressTracker.ts) stores immutable snapshots of
  answer-validation results for the current session and derives completion from
  successful attempts.
- [`LevelAddress.ts`](./LevelAddress.ts) identifies a level by its game ID and
  level ID pair.

The validator and tracker have no rendering or storage dependencies. The
controller is expected to coordinate them, but a complete controller and
gameplay integration are not present yet. `SaveManager` in `src/data/` is a
separate persistence adapter; `ProgressTracker` does not save its history.

Tests live beside the implementation as `*.test.ts`. See the
[answer validation design](../../docs/answer-validation.md),
[progress tracking design](../../docs/progress-tracking.md), and
[testing plan](../../docs/testing/README.md) for the behavior currently covered.
