# Physics: Using Matter.js with Konva

Konva draws shapes but has no physics, so we use
[Matter.js](https://brm.io/matter-js/) for gravity and collisions.
For why we chose it, see [issue #37](https://github.com/itsgeorgema/cse110-project-team3/issues/37#issuecomment-6454951323).

## Setup

```bash
npm install konva matter-js
npm install -D @types/matter-js
```

`@types/matter-js` gives TypeScript the type definitions for Matter.js, which
doesn't ship its own.

## How it works

Matter.js calculates where each object should be. Konva draws it there.

Every object we want to simulate is a **pair**: a Matter.js body (physics) and a
Konva shape (drawing). Each frame we:

1. Step the physics engine.
2. Copy each body's position and rotation onto its Konva shape.

## Minimal example

```ts
import Konva from 'konva';
import { Engine, Bodies, Composite } from 'matter-js';

// Konva
const stage = new Konva.Stage({ container: 'app', width: 800, height: 600 });
const layer = new Konva.Layer();
stage.add(layer);

// Matter.js
const engine = Engine.create();
const floorMatterJS = Bodies.rectangle(400, 590, 800, 20, { isStatic: true });
const floorKonvaShape = new Konva.Rect({
  x: 400, y: 590, width: 800, height: 20,
  offsetX: 400, offsetY: 10, fill: 'gray',
});

// One body (Matter.js) + one shape (Konva) = one object
// Here the variable 'boxMatterJS' is for Matter.js and the variable
// 'boxKonvaShape' is for Konva
const boxMatterJS = Bodies.rectangle(400, 50, 80, 80);
const boxKonvaShape = new Konva.Rect({
  x: 400, y: 50, width: 80, height: 80,
  offsetX: 40, offsetY: 40, // center the origin (see below)
  fill: 'tomato',
});

layer.add(floorKonvaShape, boxKonvaShape);
Composite.add(engine.world, [floorMatterJS, boxMatterJS]);

// Loop with a fixed timestep
const FIXED_STEP = 1000 / 60;
let accumulator = 0;

const anim = new Konva.Animation((frame) => {
  if (!frame) return;

  accumulator += Math.min(frame.timeDiff, 100);
  while (accumulator >= FIXED_STEP) {
    Engine.update(engine, FIXED_STEP);
    accumulator -= FIXED_STEP;
  }

  boxKonvaShape.position(boxMatterJS.position);
  boxKonvaShape.rotation((boxMatterJS.angle * 180) / Math.PI);
}, layer);

anim.start();
```

## Things to remember

| Concept | Matter.js | Konva | What to do |
|---|---|---|---|
| Rotation | Radians (`body.angle`) | Degrees (`shape.rotation()`) | `deg = rad * 180 / Math.PI` |
| Position origin | Body center | Top-left for `Rect`, `Image`, `Text` | Set `offsetX = width / 2`, `offsetY = height / 2` |
| Units and axes | Pixels, y points down | Pixels, y points down | Nothing, they match |

`Konva.Circle` is already center-origin, so it needs no offset.

## Rules for this project

- **Don't use `Matter.Render`.** Konva is the renderer.
- **Don't use `Matter.Mouse` or `MouseConstraint`.** They conflict with Konva's
event system. Use Konva's `draggable` and update the body from its events.
- **Use a fixed timestep** (as above) so physics speed doesn't depend on frame rate.
- **Physics is the source of truth.** Don't move a shape directly while its body
is dynamic. Move the body instead.
- **Launch velocity is in pixels per physics step**, not per second. Negative y
means up.

## Launching at an angle

```ts
const angle = (45 * Math.PI) / 180;
const speed = 20;

Matter.Body.setVelocity(ball, {
  x: speed * Math.cos(angle),
  y: -speed * Math.sin(angle),
});
```

45° is only the initial direction. With gravity on, the path curves into a parabola.

## Demo

Switch to branch `validation/mapping-trajectory-ball-45-degrees`: a ball
launched at 45° following a projectile arc.

Code for demo is in `./src/Ball45DegreeDemo.ts` and `./ball-45-degree-demo.html`.

Run `npm run dev` and then go to http://localhost:5173/ball-45-degree-demo to
see the demo.

## Cleanup

When removing the canvas (for example when switching pages):

```ts
anim.stop();
Matter.Composite.clear(engine.world, false);
Matter.Engine.clear(engine);
stage.destroy();
```