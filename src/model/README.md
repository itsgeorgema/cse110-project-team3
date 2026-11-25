# `src/model/`

The model layer contains logic and records that do not depend on rendering.
Current modules are small services with explicit inputs; they are not yet
composed into a playable game loop.

## Implemented files

- [`OverworldGraph.ts`](./OverworldGraph.ts) owns immutable map topology for #22.
  `OverworldNode` pairs a stable node ID with a `LevelAddress` and layout
  coordinates; `OverworldConnection` is an undirected pair of node IDs.
  `getNode`, `findLevel`, `neighbors`, and `isAdjacent` resolve destinations
  without depending on the view. Construction rejects duplicate IDs/level
  bindings, nonfinite coordinates, invalid identities, missing endpoints,
  self-connections, and duplicate edges (including reversed duplicates).
  Disconnected nodes are allowed and have no inferred neighbors. Returned
  nodes, addresses, and connection arrays are frozen copies of the inputs.
  The graph does not decide whether a level is unlocked or animate movement;
  those belong to progression and the animation integration respectively.
  `OverworldNavigation` now uses this graph for map selection and routing.
- [`AnswerValidator.ts`](./AnswerValidator.ts) declares the answer submission,
  validation configuration/result, and validator contract.
- [`DefaultAnswerValidator.ts`](./DefaultAnswerValidator.ts) checks level
  identity, required finite values, configured bounds, and numerical tolerance.
- [`PhysicsEngine.ts`](./PhysicsEngine.ts) provides checked arithmetic and
  constant-velocity and constant-acceleration kinematics helpers, plus `simulate`, which hands a request
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
- [`AnswerHint.ts`](./AnswerHint.ts) detects the common mistakes of a wrong answer (flipped sign or misplaced decimal point) and returns a hint on how to re-do the problem without showing the correct answer.

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

For [#17](https://github.com/itsgeorgema/cse110-project-team3/issues/17),
`calculateAverageVelocity(acceleration, startingVelocity, time)` returns
`v_0 + a*t/2`, and `calculateDistance` takes the same arguments and returns
that average multiplied by time. Units are meters and seconds. Time must be
nonnegative; zero time returns the initial velocity and zero displacement.
Negative velocity or acceleration is allowed. Despite its level-facing name,
`calculateDistance` returns signed displacement when motion is not entirely
forward; kinematics level 4 generates only forward motion. Both methods reject
nonfinite or nonnumeric inputs and nonfinite calculation results.
