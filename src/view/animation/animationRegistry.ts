import type { AnimationBuilder } from "./AnimationFactory.ts";
import { CANNON_BALL_RADIUS, CannonAnimation } from "./CannonAnimation.ts";
import { CarAnimation } from "./CarAnimation.ts";
import { DemoAnimation } from "./DemoAnimation.ts";
import { browserFrames } from "./FrameScheduler.ts";
import { KonvaBall } from "./KonvaBall.ts";
import { KonvaCannon } from "./KonvaCannon.ts";
import { KonvaCar } from "./KonvaCar.ts";

/**
 * Every game's AnimationEngine, by game id (#24, #116, #138). Adding a game is one new
 * AnimationEngine class plus one line here. Kept apart from AnimationFactory
 * so the factory's tests never load Konva.
 */
export const animationRegistry: Readonly<Record<string, AnimationBuilder>> = {
  demo: (stage) => new DemoAnimation(new KonvaBall(stage), browserFrames),
  kinematics: (stage) =>
    new CarAnimation(new KonvaCar(stage), stage.size, browserFrames),
  // The tent first, so the ball (added second) draws over it.
  cannonTrajectory: (stage) =>
    new CannonAnimation(
      new KonvaCannon(stage),
      new KonvaBall(stage, { radius: CANNON_BALL_RADIUS, fill: "#f2c14e" }),
      stage.size,
      browserFrames,
    ),
};
