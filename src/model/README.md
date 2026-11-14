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
  constant-velocity kinematics helpers, plus `simulate`, which hands a request
  to the `SimulationRunner` it is given and returns that runner's frames. It
  does not import Matter.js and does not step a simulation itself.
- [`SimulationState.ts`](./SimulationState.ts) declares the frame types
  (`ObjectId`, `Vec2`, `ObjectState`, `SimulationState`) and `snapshotState`,
  which copies live bodies into frozen frames so a later physics step cannot
  change an earlier one. A frame's `objects` record has no prototype, so any id,
  including `__proto__`, is a normal key. Check ids with `Object.hasOwn` or `in`,
  not `objects.hasOwnProperty`.
- [`SimulationRunner.ts`](./SimulationRunner.ts) declares the simulation
  request types (`SimulationRequest`, and `BodySpec` with its optional
  `velocity`, `isStatic` and `frictionAir`), the `SimulationRunner` contract,
  and `recordRun`, which steps a world on a fixed timestep and records one
  snapshot per step. `recordRun` requires a finite `stepMs` greater than 0.
- [`MatterSimulationRunner.ts`](./MatterSimulationRunner.ts) implements
  `SimulationRunner` with Matter.js. It is the only file that imports Matter.js.
  It rejects a bad request before building the world: empty or duplicate ids,
  non-finite positions, velocities or gravity, shape sizes that are not finite
  and positive, `frictionAir` outside 0 to 1, and `stepMs` above `MAX_STEP_MS`
  (`1000 / 60`).
- [`ProgressTracker.ts`](./ProgressTracker.ts) stores immutable snapshots of
  answer-validation results for the current session and derives completion from
  successful attempts.
- [`LevelAddress.ts`](./LevelAddress.ts) identifies a level by its game ID and
  level ID pair.

The validator and tracker have no rendering or storage dependencies. The
simulation files have no rendering dependencies either, and only
`MatterSimulationRunner.ts` depends on a physics library (i.e. matter-js). The
controller is expected to coordinate these modules and to choose the runner
passed to `PhysicsEngine.simulate`, but a complete controller and gameplay
integration are not present yet. `SaveManager` in `src/data/` is a separate
persistence adapter; `ProgressTracker` does not save its history.

Tests live beside the implementation as `*.test.ts`. See the
[answer validation design](../../docs/answer-validation.md),
[progress tracking design](../../docs/progress-tracking.md),
[physics simulation design](../../docs/physics-simulation.md), and
[testing plan](../../docs/testing/README.md) for the behavior currently covered.
