# Physics simulation

How a simulation run becomes the `SimulationState[]` handed to the animation
layer (issue #57; the animation side of the contract is tracked in #23). This
note covers the files in `src/model/` that make up the physics side.

## Overview

matter-js updates a body in place: `body.position` is the same object on every
step. A run recorded as an array of body references would show the final state
at every step. Instead, a run is simulated up front and recorded as one copied,
frozen snapshot per step. The view only sees those snapshots and never imports
matter-js.

```mermaid
flowchart LR
  A[SimulationRequest] --> B[PhysicsEngine.simulate]
  B --> C[SimulationRunner]
  C --> D[MatterSimulationRunner]
  D --> E[recordRun]
  E --> F[snapshotState]
  F --> G[SimulationState array]
  G --> H[Animation layer]
```

| File                        | Role                                                         | Imports matter-js? |
| --------------------------- | ------------------------------------------------------------ | ------------------ |
| `SimulationState.ts`        | Shared data contract and the snapshot function               | No                 |
| `SimulationRunner.ts`       | Request types, the `SimulationRunner` interface, `recordRun` | No                 |
| `MatterSimulationRunner.ts` | Builds a matter-js world and runs it                         | Yes, the only file |
| `PhysicsEngine.ts`          | Static physics math helpers and `simulate()`                 | No                 |

Dependencies point one way. The view and controller depend on `SimulationState`
and `PhysicsEngine`, never on `MatterSimulationRunner`.

## `SimulationState.ts`

Plain data shared with the animation side.

| Name                                  | Kind           | Meaning                                                        |
| ------------------------------------- | -------------- | -------------------------------------------------------------- |
| `ObjectId`                            | `string` alias | Stable id for one object on screen, such as `"ball"`           |
| `Vec2`                                | interface      | Readonly `{ x, y }`                                            |
| `ObjectState`                         | interface      | `{ position: Vec2, angle: number }`, angle in radians          |
| `SimulationState`                     | interface      | One frame: `step`, `timeMs`, and `objects` keyed by `ObjectId` |
| `LiveBody`                            | interface      | Structural view of a live body: `id`, `position`, `angle`      |
| `snapshotState(step, timeMs, bodies)` | function       | Copies live bodies into a new, deep-frozen `SimulationState`   |

`snapshotState` is the only place a live body becomes a frame. It copies the
numbers into new objects and freezes the result, so a later physics step cannot
change an earlier frame. Writing to a frozen frame throws a `TypeError`.

`objects` has no prototype (`Object.create(null)`). Any id, including
`__proto__`, is stored as a normal key, and looking up an id that is not in the
frame, such as `objects["toString"]`, returns `undefined`.

When reading `objects`:

- Check for an id with `Object.hasOwn(objects, id)` or `id in objects`.
  `objects.hasOwnProperty(id)` throws a `TypeError`.
- `objects[id]`, `Object.keys`, `Object.entries`, `for...in`, spreading and
  `JSON.stringify` work as they do on `{}`.
- Turning `objects` into a string, as in `` `${objects}` `` or
  `String(objects)`, throws a `TypeError`. Use `JSON.stringify(objects)`.
- In tests, compare frames with `toEqual`. `toStrictEqual` fails against a
  plain object literal because the prototypes differ.

Step `0` is the initial layout, before any physics step has run. Step `n` has
`timeMs = n * stepMs`. A frame carries position and angle only; it has no
velocity.

## `SimulationRunner.ts`

### Request types

```ts
interface SimulationRequest {
  bodies: readonly BodySpec[];
  gravity?: Vec2; // default: matter-js default, { x: 0, y: 1 }
  stepMs?: number; // default: DEFAULT_STEP_MS = 1000 / 60, which is also the matter-js maximum
  maxSteps: number;
  isFinished?: (state: SimulationState) => boolean; // optional early stop
}

interface BodySpec {
  id: ObjectId;
  shape:
    | { kind: "circle"; radius: number }
    | { kind: "rect"; width: number; height: number };
  position: Vec2;
  velocity?: Vec2; // passed to matter-js unchanged, in its units (see Units)
  isStatic?: boolean; // default false
  frictionAir?: number; // 0 to 1, default: matter-js default, 0.01
}
```

### `SimulationRunner`

```ts
interface SimulationRunner {
  run(request: SimulationRequest): SimulationState[];
}
```

Anything that turns a request into frames. `MatterSimulationRunner` is the
implementation used by the app; tests use small fakes. This is the Strategy
pattern: callers depend on the interface, not on a physics library.

### `SteppableWorld` and `recordRun`

`SteppableWorld` is the smallest thing `recordRun` needs from a physics library:

```ts
interface SteppableWorld {
  step(dtMs: number): void;
  liveBodies(): Iterable<LiveBody>;
}
```

`recordRun(world, { stepMs, maxSteps, isFinished? })`:

1. Throws a `RangeError` unless `stepMs` is a finite number greater than 0 and `maxSteps` is a
   non-negative integer.
2. Records the initial layout as step 0.
3. For each step from 1 to `maxSteps`, advances the world by `stepMs`, records a
   snapshot, and stops early, keeping that frame, if `isFinished` returns
   `true`. `isFinished` is not checked on step 0.

`recordRun` only sees a `SteppableWorld`, so it is tested without matter-js
using a fake world that mutates one object in place, as matter-js does.

## `MatterSimulationRunner.ts`

Implements `SimulationRunner` with matter-js. It is the only file that imports
matter-js, and it requires the `matter-js` and `@types/matter-js` packages.

- Checks the request before building anything, because matter-js does not
  check its inputs and turns bad values into `NaN` frames. It throws an `Error`
  for an empty or whitespace-only `id` or a duplicate `id`, and a `RangeError` when:
  - `stepMs` is not greater than 0 and at most `MAX_STEP_MS` (`1000 / 60`,
    about 16.667 ms). matter-js warns above that, and `frictionAir` can then
    flip a body's velocity each step, so the run is rejected instead;
  - a `position`, `velocity` or `gravity` coordinate is `NaN` or infinite;
  - a `radius`, `width` or `height` is not a finite number greater than 0;
  - a `frictionAir` is outside 0 to 1.
- Passes `frictionAir` to matter-js only when the spec sets it. Each step
  scales a body's velocity by about `1 - frictionAir * stepMs / MAX_STEP_MS`,
  which is `1 - frictionAir` at the default `stepMs` and never negative under
  the cap.
- Creates an `Engine`, applies `gravity` only when the request supplies one, and
  adds one body per `BodySpec`. The body's `label` carries the `ObjectId`.
- Steps with `Engine.update(engine, stepMs)` on a fixed timestep and does not
  use matter-js's `Runner`, so a run is synchronous. Running the same request
  twice gives equal frames.
- Hands the live bodies to `recordRun`, which copies them out immediately.

## Units

matter-js has no meters or seconds. It uses its own world units, and the
project does not convert anything yet. `BodySpec` values go to matter-js
unchanged, and `ObjectState` positions come back in the same world units.

| Quantity           | matter-js unit (version 0.20)                                    |
| ------------------ | ---------------------------------------------------------------- |
| Position, size     | World units. 1 unit is whatever the view decides, often 1 pixel  |
| `velocity`         | World units per `1000 / 60` ms (one 60 fps step), not per second |
| `gravity`          | `{ x: 0, y: 1 }` is about 1000 world units/s², pointing down     |
| `angle`            | Radians                                                          |
| `stepMs`, `timeMs` | Milliseconds                                                     |

The velocity unit does not change with `stepMs`. A `velocity.x` of 5 moves a
body 300 units in one second at any allowed `stepMs`. Passing a problem's
velocity in m/s straight through is therefore wrong: `velocity: { x: 12.5 }`
moves 750 units per second, not 12.5. The gravity figure comes from matter-js
multiplying `gravity` by a fixed scale of 0.001 units/ms².

Given a scale of `PX_PER_M` world units per meter, the conversions are:

| From SI        | To matter-js                           |
| -------------- | -------------------------------------- |
| Position `m`   | `m * PX_PER_M`                         |
| Velocity `m/s` | `(m/s) * PX_PER_M / 60` units per step |
| Gravity `m/s²` | `gravity.y = (m/s²) * PX_PER_M / 1000` |

For example, a `PX_PER_M` of about 102 makes the default `gravity.y` of 1 equal
9.8 m/s².

### Further discussion needed

The unit scale has not been agreed, so nothing above is applied in code. Before
levels pass real physics values to the runner, the physics subteam and the
animation subteam (#23) need to decide:

- the value of `PX_PER_M`, and whether it is fixed or set per level;
- whether `SimulationRequest` and `SimulationState` use meters, with the
  runner converting at the matter-js boundary, or world units, with the
  problem generator and view converting;
- the unit for velocity in `ObjectState`, which is left out until then.

Raise this on #57 or #23. Once it is decided, put the conversion in one tested
module and update this section.

## `PhysicsEngine.ts`

A class of static helpers. It is not instantiated.

Math helpers validate their inputs: a non-number throws a `TypeError`, and a
non-finite input or result throws a `RangeError`.

| Method                                     | Result                   | Extra rules       |
| ------------------------------------------ | ------------------------ | ----------------- |
| `multiply(a, b)`                           | `a * b`                  |                   |
| `subtract(a, b)`                           | `a - b`                  |                   |
| `divide(a, b)`                             | `a / b`                  | `b` must not be 0 |
| `calculateVelocity(displacement, time)`    | `displacement / time`    | `time > 0`        |
| `calculateDisplacement(velocity, time)`    | `velocity * time`        | `time >= 0`       |
| `calculateAcceleration(v0, v1, time)`      | `(v1 - v0) / time`       | `time > 0`        |
| `calculateForce(mass, acceleration)`       | `mass * acceleration`    | `mass > 0`        |
| `calculateNetForce(normal, gravitational)` | `normal - gravitational` |                   |

```ts
PhysicsEngine.simulate(runner: SimulationRunner, request: SimulationRequest): SimulationState[]
```

`simulate` hands the request to the given runner and returns its frames. The
runner is passed in, so `PhysicsEngine.ts` never imports matter-js; the code
that wires the app together chooses the runner.

The simulation interface is named `SimulationRunner`, not `PhysicsEngine`,
because an `interface PhysicsEngine` in the same module as the class would merge
with it. `new PhysicsEngine().run(...)` would then compile but throw
`run is not a function` at runtime. `PhysicsEngine.simulate.test.ts` checks that
instances have no `run()`.

## Usage

```ts
import { PhysicsEngine } from "./PhysicsEngine";
import { MatterSimulationRunner } from "./MatterSimulationRunner";
import type { SimulationRequest } from "./SimulationRunner";

const request: SimulationRequest = {
  bodies: [
    {
      id: "ball",
      shape: { kind: "circle", radius: 10 },
      position: { x: 100, y: 0 },
    },
    {
      id: "floor",
      shape: { kind: "rect", width: 400, height: 20 },
      position: { x: 100, y: 500 },
      isStatic: true,
    },
  ],
  maxSteps: 120,
  isFinished: (state) => (state.objects["ball"]?.position.y ?? 0) > 470,
};

const states = PhysicsEngine.simulate(new MatterSimulationRunner(), request);
// hand `states` to the animation layer
```

A fake runner for tests that need no matter-js:

```ts
import type { SimulationRunner } from "./SimulationRunner";
import type { SimulationState } from "./SimulationState";

const canned: SimulationState[] = [{ step: 0, timeMs: 0, objects: {} }];
const fakeRunner: SimulationRunner = { run: () => canned };
```

## Tests

| Test file                        | Covers                                                                                                                                                                                                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SimulationState.test.ts`        | `snapshotState` keeps ids such as `__proto__` and `toString` as normal keys, and missing ids look up as `undefined`                                                                                                                                                                      |
| `SimulationRunner.test.ts`       | `recordRun` with an in-place-mutating fake world: earlier steps keep their values, step 0 and timeline, frozen and independent snapshots, early stop, option validation                                                                                                                  |
| `MatterSimulationRunner.test.ts` | matter-js runs: default and custom gravity, initial velocity, static bodies, `frictionAir` and its range, rejection of non-finite or non-positive inputs, the `stepMs` cap, both shapes, custom `stepMs`, early stop, `maxSteps: 0`, repeatability, empty, duplicate and `__proto__` ids |
| `PhysicsEngine.simulate.test.ts` | `simulate` passes the request through unchanged, returns the runner result, surfaces runner errors, returns independent steps end to end, and instances have no `run()`                                                                                                                  |

Physics assertions are qualitative, such as "x strictly increases" or "y stays
near 0", so they do not depend on matter-js internals.
