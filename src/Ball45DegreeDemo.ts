import Konva from "konva";

import { Engine, Bodies, Body, Composite } from "matter-js";

const stage = new Konva.Stage({ container: 'app', width: 800, height: 600 });
const layer = new Konva.Layer();
stage.add(layer);

const matterJSEngine = Engine.create();

const floorMatterJS = Bodies.rectangle(400, 590, 800, 20, { isStatic: true });
const floorKonvaShape = new Konva.Rect({
  x: 400, y: 590, width: 800, height: 20,
  offsetX: 400, offsetY: 10, fill: 'gray',
});

// Ball
const RADIUS = 15;
const START = { x: 50, y: 560 };

const ballMatterJS = Bodies.circle(START.x, START.y, RADIUS, {
  restitution: 0.7, // bounciness
  frictionAir: 0,   // no air drag, so the arc is a clean parabola
});
const ballKonvaShape = new Konva.Circle({
  x: START.x, y: START.y, radius: RADIUS,
  fill: 'tomato', stroke: '#222', strokeWidth: 2,
});

layer.add(floorKonvaShape, ballKonvaShape);
Composite.add(matterJSEngine.world, [floorMatterJS, ballMatterJS]);

// Launch at 45 degrees
const SPEED = 12;                    // pixels per physics step
const ANGLE = (45 * Math.PI) / 180;  // degrees -> radians

Body.setVelocity(ballMatterJS, {
  x: SPEED * Math.cos(ANGLE),
  y: -SPEED * Math.sin(ANGLE), // negative y = up (y points down in Matter and Konva)
});


// Loop (fixed timestep)
const FIXED_STEP = 1000 / 60;
let accumulator = 0;
let stepCount = 0;

const anim = new Konva.Animation((frame) => {
  if (!frame) return;

  accumulator += Math.min(frame.timeDiff, 100);
  while (accumulator >= FIXED_STEP) {
    Engine.update(matterJSEngine, FIXED_STEP);
    accumulator -= FIXED_STEP;
    stepCount++;
  }

  ballKonvaShape.position(ballMatterJS.position);
  ballKonvaShape.rotation((ballMatterJS.angle * 180) / Math.PI);

  // Optional: leave a dot every few steps to show the arc
  if (stepCount % 5 === 0) {
    layer.add(new Konva.Circle({
      x: ballMatterJS.position.x, y: ballMatterJS.position.y,
      radius: 2, fill: 'rgba(0,0,0,0.4)',
    }));
    ballKonvaShape.moveToTop();
  }
}, layer);

anim.start();