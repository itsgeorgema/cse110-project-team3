# Physics simulation: classes overview

This page explains how a submitted answer becomes the `SimulationState[]` the animation plays (issue #57, consumed by `AnimationEngine` in #23). It covers the files in `src/model/` that make up the physics side.

## The idea in one paragraph

matter-js updates a body **in place**: `body.position` is the same object on every step. If a run were recorded as an array of body references, every entry would show the final state. So the physics side runs the whole simulation up front and records one **copied, frozen snapshot per step**. The view only ever sees those snapshots; it never imports matter-js.

## How the pieces fit

```mermaid
flowchart LR
  A[Problem generator<br/>builds SimulationRequest] --> B[PhysicsEngine.simulate]
  B --> C[SimulationRunner<br/>interface]
  C --> D[MatterSimulationRunner]
  D --> E[recordRun]
  E --> F[snapshotState]
  F --> G[SimulationState array]
  G --> H[AnimationEngine.play]
```

| File                        | Role                                                         | Knows about matter-js? |
| --------------------------- | ------------------------------------------------------------ | ---------------------- |
| `SimulationState.ts`        | Shared data contract and the snapshot function               | No                     |
| `SimulationRunner.ts`       | Request types, the `SimulationRunner` interface, `recordRun` | No                     |
| `MatterSimulationRunner.ts` | Adapter that builds a matter-js world and runs it            | **Yes, the only file** |
| `PhysicsEngine.ts`          | Static physics math helpers, plus `simulate()`               | No                     |

Dependencies point one way: the view and controller depend on `SimulationState` (and `PhysicsEngine`), never on `MatterSimulationRunner`.

## `SimulationState.ts`

Plain data. This is the contract shared with the animation side.

| Name                                  | Kind           | Meaning                                                                                  |
| ------------------------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| `ObjectId`                            | `string` alias | Stable id for one thing on screen (`"ball"`, `"crate"`)                                  |
| `Vec2`                                | interface      | `{ x, y }`, readonly                                                                     |
| `ObjectState`                         | interface      | `{ position: Vec2, angle: number }`; angle in radians                                    |
| `SimulationState`                     | interface      | One frame: `step`, `timeMs`, and `objects` keyed by `ObjectId`                           |
| `LiveBody`                            | interface      | Structural view of a live body (`id`, `position`, `angle`). Safe to read, unsafe to keep |
| `snapshotState(step, timeMs, bodies)` | function       | Copies live bodies into a new, deep-frozen `SimulationState`                             |

`snapshotState` is the only place a live body becomes a frame. It copies the numbers into brand-new objects and freezes the result, so a later physics step cannot change an earlier frame, and nobody can edit history by accident (writing to a frozen object throws a `TypeError`).

Step `0` is the initial layout before any physics has run. Step `n` has `timeMs = n * stepMs`.

## `SimulationRunner.ts`

### Request types

`SimulationRequest` is what the problem generator hands to the engine:

```ts
interface SimulationRequest {
  bodies: readonly BodySpec[];
  gravity?: Vec2; // default: matter-js default, { x: 0, y: 1 }
  stepMs?: number; // default: DEFAULT_STEP_MS = 1000 / 60
  maxSteps: number;
  isFinished?: (state: SimulationState) => boolean; // optional early stop
}

interface BodySpec {
  id: ObjectId;
  shape:
    | { kind: "circle"; radius: number }
    | { kind: "rect"; width: number; height: number };
  position: Vec2;
  velocity?: Vec2; // initial velocity, in matter-js units (see Known gaps)
  isStatic?: boolean; // default false
}
```

> **Placeholder:** `SimulationRequest` and `BodySpec` are a minimal shape invented to make a run possible. Replace them when the problem generator defines the real scene format.

### `SimulationRunner` (interface, Strategy pattern)

```ts
interface SimulationRunner {
  run(request: SimulationRequest): SimulationState[];
}
```

Anything that can turn a request into frames. `MatterSimulationRunner` is the real one; tests use small fakes.

### `SteppableWorld` and `recordRun` (the seam)

`SteppableWorld` is the smallest thing `recordRun` needs from a physics library:

```ts
interface SteppableWorld {
  step(dtMs: number): void;
  liveBodies(): Iterable<LiveBody>;
}
```

`recordRun(world, { stepMs, maxSteps, isFinished? })`:

1. Validates options: `stepMs` must be greater than 0 and `maxSteps` a non-negative integer, otherwise it throws a `RangeError`.
2. Records the initial layout as step 0.
3. For each step 1 to `maxSteps`: advance the world by `stepMs`, record a snapshot, and stop early (keeping that frame) if `isFinished` returns `true`. `isFinished` is not checked on step 0.

Because `recordRun` only sees a `SteppableWorld`, it can be tested without matter-js by a fake world that mutates one object in place, which reproduces the original bug.

## `MatterSimulationRunner.ts`

Implements `SimulationRunner` using matter-js. It is the **only file that imports matter-js**.

- Rejects duplicate `id`s with an `Error` before building anything.
- Creates an `Engine`, applies `gravity` only if the request supplies one, and adds one body per `BodySpec` (`label` carries the `ObjectId`).
- Steps with `Engine.update(engine, stepMs)` on a **fixed timestep** (no `Runner`), so a run is synchronous and repeatable.
- Exposes the live bodies to `recordRun`, which copies them out immediately.

## `PhysicsEngine.ts`

A class of **static** helpers; it is not meant to be instantiated.

**Math helpers** (all validate their inputs: a non-number throws `TypeError`, a non-finite number or result throws `RangeError`):

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

**Simulation entry point:**

```ts
PhysicsEngine.simulate(runner: SimulationRunner, request: SimulationRequest): SimulationState[]
```

Hands the request to the given runner and returns its frames. The runner is passed in, so `PhysicsEngine.ts` never imports matter-js; whoever wires up the app (`main.ts`) chooses the runner.

> Do not declare an `interface PhysicsEngine` in the same module as the class. TypeScript merges them, so `new PhysicsEngine().run(...)` compiles but throws `run is not a function` at runtime. That is why the interface is named `SimulationRunner`.

## Usage

Wiring and running (in `main.ts` or the controller):

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
// animationEngine.play(states);
```

A fake runner for controller tests, with no matter-js and no canvas:

```ts
import type { SimulationRunner } from "./SimulationRunner";
import type { SimulationState } from "./SimulationState";

const canned: SimulationState[] = [{ step: 0, timeMs: 0, objects: {} }];
const fakeRunner: SimulationRunner = { run: () => canned };
```

## Tests

| Test file                        | What it covers                                                                                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SimulationRunner.test.ts`       | `recordRun` with an in-place-mutating fake world: earlier steps keep their values, step 0 and timeline, frozen and independent snapshots, early stop, option validation |
| `MatterSimulationRunner.test.ts` | Real matter-js runs: default and custom gravity, initial velocity, static bodies, both shapes, custom `stepMs`, early stop, `maxSteps: 0`, repeatability, duplicate ids |
| `PhysicsEngine.simulate.test.ts` | `simulate` passes the request through unchanged, returns the runner result, surfaces errors, returns independent steps end to end, and instances have no `run()`        |

Physics assertions are deliberately qualitative ("x strictly increases", "y stays near 0") rather than exact numbers, so they do not depend on matter-js internals.

## Known gaps and open questions

- **Request shape is a placeholder** (see above).
- **Units.** matter-js is tuned for pixels and its own per-step velocity. If problems use real units (e.g. m/s²), a scale factor is needed. Until it is decided, `BodySpec.velocity` is in matter-js units and `ObjectState` carries no velocity.
- **Determinism.** The same request gives the same frames in the same environment (fixed timestep, no `Runner`). Cross-machine bit-for-bit equality is not guaranteed or tested.
- **Dependency.** `matter-js` and `@types/matter-js` must be installed for `MatterSimulationRunner` to build.
