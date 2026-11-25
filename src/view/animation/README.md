# Adding an animation for a level

A level animates the player's answer once it has two things: a **run builder**,
which turns the answer into frames, and an **animation engine** for its game,
which draws those frames. Minigame 1 Level 1 (the getaway car) is the worked
example; copy its files when starting a new game.

```text
answer ──► RunBuilder ──► SimulationState[] ──► AnimationEngine ──► stage
           (model)        (frames, plain data)   (view, Konva)
```

`main.ts` connects them per level (#116). A level with no run builder, or a game
with no engine, keeps the canvas-free `FakeAnimationEngine`, so levels can be
added one at a time without breaking the others.

## 1. Build the frames (model)

Write a function with the `RunBuilder` signature from
`src/controller/GameController.ts`:

```ts
(submission: AnswerSubmission, level: LevelDataConfig) => SimulationState[]
```

- `submission.values` holds the numbers to play, keyed like
  `level.userInputVariables`. For a wrong answer they are the player's
  numbers, so it shows what it really does. For an accepted answer
  `GameController` passes the level's `expectedUserInput` instead, so a
  correct answer always lands exactly (#114). The builder plays whatever it
  is given and never checks the answer itself.
- Build each frame with `snapshotState(step, timeMs, bodies)`. Frame 0 is the
  starting layout at `timeMs` 0. Every frame gives each object an `id`, a
  `position` and an `angle` in radians.
- Choose the units and the y direction for the game, and write them in the
  file's doc comment. The engine converts to pixels (step 2).
- Simple motion can be computed straight from the formula, as
  `src/model/runs/kinematicsRun.ts` does for `x = v * t`. Motion with collisions
  or gravity can use `PhysicsEngine.simulate` with `MatterSimulationRunner`; see
  [physics simulation](../../../docs/physics-simulation.md) for its units.
- Return at least one frame. Test the function in Node next to it
  (`kinematicsRun.test.ts`): the first and last frame, a wrong answer, and bad
  input.

Register it in `src/controller/runRegistry.ts` under its game id and level id:

```ts
kinematics: { 1: buildKinematicsLevel1Run },
```

## 2. Draw the frames (view)

Write one engine class per game in `src/view/animation/`, implementing
`AnimationEngine`. One engine serves every level of its game; it reads the level
from `showLevel`. Split it in two, like `CarAnimation` and `KonvaCar`:

| Piece  | Example           | Job                                       | Tested by                                                 |
| ------ | ----------------- | ----------------------------------------- | --------------------------------------------------------- |
| Engine | `CarAnimation.ts` | Decides what to draw and where, in pixels | Unit tests with a recording view (`CarAnimation.test.ts`) |
| View   | `KonvaCar.ts`     | Draws exactly what it is told with Konva  | Eye and the browser smoke test                            |

The engine's four jobs:

- **`showLevel(level)`**: draw the scene before any answer: the track, the
  target, the level's numbers. Called once when the level opens.
- **`showResult(result)`**: keep the verdict. It arrives just before `play`;
  show it when the playback ends (`result.correct`, plus anything the frames
  tell you, such as how far short the car stopped).
- **`play` / `stop` / `replay` / `onPlaybackFinished`**: hand these to a
  `FramePlayback` and pass it a function that draws one frame. It runs the time
  loop, so playback runs at the same speed on any monitor, and a stopped run
  never reports finishing.
- **Draw a frame**: read your objects from `state.objects[id]` and move your
  shapes.

Convert world positions with `worldToScreen.ts`: `fitScale` picks pixels per
unit for the stage size, `toScreen` maps a position (set `yUp: true` for physics
problems), and `toRotation` turns a frame's radians into Konva degrees.

Register the engine in `animationRegistry.ts`, under the same game id as the
run builder:

```ts
kinematics: (stage) =>
  new CarAnimation(new KonvaCar(stage), stage.size, browserFrames),
```

Konva may be imported only under `src/view/` (ESLint enforces it).

## 3. Test it

- **Engine:** pass `ManualFrames.schedule` instead of `browserFrames`, then call
  `frames.tick(ms)` to step the monitor by hand. Check the scene, the end
  position and the verdict, as `CarAnimation.test.ts` does.
- **End to end:** `src/controller/levelPlayback.integration.test.ts` runs a real
  level config, validator, run builder and engine together. Add a case for the
  new level.
- **In the browser:** `npm run dev`, open the level from the story map, and
  answer it right and wrong. `/demo.html` shows the smallest engine,
  `DemoAnimation`, on its own.

## Files at a glance

| File                                              | Role                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| `AnimationEngine.ts`                              | The interface every game implements                                      |
| `FramePlayback.ts`                                | The shared time loop: play, stop, replay, finished                       |
| `worldToScreen.ts`                                | World units to stage pixels and degrees                                  |
| `AnimationFactory.ts`, `animationRegistry.ts`     | Game id to engine                                                        |
| `CarAnimation.ts`, `KonvaCar.ts`                  | Minigame 1 worked example                                                |
| `CannonAnimation.ts`, `KonvaCannon.ts`            | Minigame 3: tent, cannon, net and dashed trail                           |
| `DemoAnimation.ts`, `KonvaBall.ts`, `demoPage.ts` | The smallest engine, on `/demo.html`; the ball is shared with the cannon |
| `FakeAnimationEngine.ts`, `ManualFrames.ts`       | Test helpers                                                             |
| `../../controller/runRegistry.ts`                 | Game id and level id to run builder                                      |
| `../../model/runs/`                               | Run builders                                                             |
