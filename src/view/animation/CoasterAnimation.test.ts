import { beforeEach, describe, expect, it } from "vitest";
import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { AnswerValidationResult } from "../../model/AnswerValidator.ts";
import type { Vec2 } from "../../model/SimulationState.ts";
import {
  buildCircularMotionLevel1Run,
  COASTER_CART_ID,
  COASTER_PAUSE_S,
  coasterTrack,
} from "../../model/runs/circularMotionRun.ts";
import { snapshotState } from "../../model/SimulationState.ts";
import {
  CoasterAnimation,
  type CartView,
  type CoasterArrow,
  type CoasterMessage,
  type CoasterScene,
  type CoasterView,
} from "./CoasterAnimation.ts";
import { ManualFrames } from "./ManualFrames.ts";

/** Records what would be drawn, instead of drawing it. */
class RecordingCoaster implements CoasterView {
  scene: CoasterScene | undefined;
  trail: readonly Vec2[] = [];
  arrow: CoasterArrow | undefined;
  arrowsShown = 0;
  message: CoasterMessage | undefined;
  drawScene(scene: CoasterScene): void {
    this.scene = scene;
  }
  drawTrail(points: readonly Vec2[]): void {
    this.trail = points;
  }
  showArrow(arrow: CoasterArrow | undefined): void {
    if (arrow !== undefined) this.arrowsShown++;
    this.arrow = arrow;
  }
  showMessage(message: CoasterMessage | undefined): void {
    this.message = message;
  }
}

class RecordingCart implements CartView {
  length: number | undefined;
  readonly poses: { position: Vec2; rotationDeg: number }[] = [];
  setLength(length: number): void {
    this.length = length;
  }
  moveTo(position: Vec2, rotationDeg: number): void {
    this.poses.push({ position, rotationDeg });
  }
  get at() {
    return this.poses.at(-1);
  }
}

const stage = { width: 600, height: 300 };
// 20 m/s on a 10 m loop: the right answer is 40 m/s².
const level = {
  gameId: "circularMotion",
  levelId: 1,
  problemStatementVariablesValues: { speed: 20, radius: 10 },
} as unknown as LevelDataConfig;
const topMs = coasterTrack(level).topS * 1000;

function submission(acceleration: number) {
  return {
    gameId: "circularMotion",
    levelId: 1,
    values: { acceleration },
    units: {},
  };
}

function verdict(
  acceleration: number,
  correct: boolean,
): AnswerValidationResult {
  return { submittedAnswer: submission(acceleration), correct, feedback: "" };
}

describe("CoasterAnimation", () => {
  let frames: ManualFrames;
  let view: RecordingCoaster;
  let cart: RecordingCart;
  let engine: CoasterAnimation;
  let heard: number;

  beforeEach(() => {
    frames = new ManualFrames();
    view = new RecordingCoaster();
    cart = new RecordingCart();
    engine = new CoasterAnimation(view, cart, stage, frames.schedule);
    heard = 0;
    engine.onPlaybackFinished(() => heard++);
    engine.showLevel(level);
  });

  /** Shows the verdict on `typed` and plays `played` to the end. */
  function playToEnd(typed: number, correct = false, played = typed): void {
    engine.showResult(verdict(typed, correct));
    engine.play(buildCircularMotionLevel1Run(submission(played), level));
    frames.tick(0);
    frames.tick(60_000);
  }

  it("draws the loop on its rise, the ramps and the labels before any answer", () => {
    const scene = view.scene!;

    expect(scene.speedLabel).toBe("20 m/s");
    expect(scene.radiusLabel).toBe("r = 10 m");
    expect(scene.floorY).toBeLessThan(stage.height);
    expect(scene.loopCenter.x).toBe(stage.width / 2);
    expect(scene.loopBottom.x).toBe(stage.width / 2);
    expect(scene.loopBottom.y).toBeLessThan(scene.floorY);
    expect(scene.loopBottom.y - scene.loopCenter.y).toBeCloseTo(
      scene.loopRadius,
      9,
    );
    expect(scene.loopCenter.y - scene.loopRadius).toBeGreaterThan(0);
    expect(scene.rampStart.y).toBe(scene.floorY);
    expect(scene.rampEnd.y).toBe(scene.floorY);
    expect(scene.rampStart.x).toBeGreaterThan(0);
    expect(scene.rampEnd.x).toBeLessThan(stage.width);
    expect(cart.length).toBeCloseTo(scene.loopRadius / 2, 9);
    expect(cart.at!.position).toEqual(scene.rampStart);
    // Tilted up the ramp: counterclockwise on screen is negative.
    expect(cart.at!.rotationDeg).toBeLessThan(0);
    expect(view.arrow).toBeUndefined();
    expect(view.trail).toEqual([]);
    expect(view.message).toBeUndefined();
  });

  it("shows the arrow, pointing at the center with the player's acceleration, once the cart reaches the top", () => {
    engine.showResult(verdict(40.004, true));
    engine.play(buildCircularMotionLevel1Run(submission(40), level));
    frames.tick(0);
    frames.tick(topMs - 50);
    expect(view.arrow).toBeUndefined();

    frames.tick(topMs + 20);

    const scene = view.scene!;
    const arrow = view.arrow!;
    expect(arrow.label).toBe("a = 40 m/s²");
    expect(arrow.from.x).toBe(scene.loopCenter.x);
    expect(arrow.to.x).toBe(scene.loopCenter.x);
    const loopTop = scene.loopCenter.y - scene.loopRadius;
    expect(arrow.from.y).toBeGreaterThan(loopTop);
    expect(arrow.to.y).toBeGreaterThan(arrow.from.y);
    expect(arrow.to.y).toBeLessThan(scene.loopCenter.y);
    // Upside down at the top, wheels on the track.
    expect(cart.at!.position.y).toBeCloseTo(loopTop, 9);
    expect(Math.abs(cart.at!.rotationDeg)).toBeCloseTo(180, 9);

    frames.tick(topMs + 500);
    expect(view.arrowsShown).toBe(1);
  });

  it("labels the arrow with the typed acceleration, rounded to two places", () => {
    playToEnd(12.3456);
    expect(view.arrow!.label).toBe("a = 12.35 m/s²");
  });

  it("finishes the loop and says Correct! for a right answer", () => {
    engine.showResult(verdict(40, true));
    engine.play(buildCircularMotionLevel1Run(submission(40), level));
    frames.tick(0);
    frames.tick(topMs + COASTER_PAUSE_S * 1000 + 100);
    expect(view.message).toBeUndefined();

    frames.tick(60_000);

    expect(cart.at!.position.x).toBeCloseTo(view.scene!.rampEnd.x, 6);
    expect(cart.at!.position.y).toBeCloseTo(view.scene!.floorY, 6);
    expect(view.message).toEqual({ text: "Correct!", correct: true });
    expect(view.arrow).toBeDefined();
    expect(heard).toBe(1);
  });

  it("draws the trail behind the cart, growing as it rides", () => {
    const states = buildCircularMotionLevel1Run(submission(40), level);
    engine.showResult(verdict(40, true));
    engine.play(states);
    expect(view.trail).toHaveLength(1);

    frames.tick(0);
    frames.tick(1000);

    const ridden = view.trail.length;
    expect(ridden).toBeGreaterThan(1);
    expect(ridden).toBeLessThan(states.length);
    expect(view.trail.at(-1)).toEqual(cart.at!.position);

    frames.tick(60_000);
    expect(view.trail).toHaveLength(states.length);
  });

  it("says how wide a too-small acceleration's circle is", () => {
    playToEnd(20);

    expect(view.message).toEqual({
      text: "Too small: at 20 m/s that only turns a 20 m circle",
      correct: false,
    });
    expect(cart.at!.position.y).toBeCloseTo(view.scene!.floorY, 6);
  });

  it("says how tight a too-big acceleration's circle is", () => {
    playToEnd(160);

    expect(view.message).toEqual({
      text: "Too big: at 20 m/s that turns a tight 2.5 m circle",
      correct: false,
    });
  });

  it("uses two places when one would read the same as the loop", () => {
    playToEnd(39.9);

    expect(view.message?.text).toBe(
      "Too small: at 20 m/s that only turns a 10.03 m circle",
    );
  });

  it("says a cart with no acceleration flies straight", () => {
    playToEnd(0);

    expect(view.message).toEqual({
      text: "No acceleration: the cart flies straight off the loop",
      correct: false,
    });
    expect(view.arrow!.label).toBe("a = 0 m/s²");
    expect(cart.at!.position.x).toBeLessThan(view.scene!.rampStart.x);
  });

  it("falls back to a plain verdict and label when the answer has no acceleration", () => {
    engine.showResult({
      submittedAnswer: {
        gameId: "circularMotion",
        levelId: 1,
        values: {},
        units: {},
      },
      correct: false,
      feedback: "",
    });
    engine.play(buildCircularMotionLevel1Run(submission(20), level));
    frames.tick(0);
    frames.tick(60_000);

    expect(view.arrow!.label).toBe("a");
    expect(view.message).toEqual({ text: "Not quite", correct: false });
  });

  it("shows no verdict when no result was given", () => {
    engine.play(buildCircularMotionLevel1Run(submission(20), level));
    frames.tick(0);
    frames.tick(60_000);

    expect(view.arrow!.label).toBe("a");
    expect(view.message).toBeUndefined();
    expect(heard).toBe(1);
  });

  it("hides the verdict, arrow and trail on replay, then shows them again", () => {
    playToEnd(160);
    engine.replay();

    expect(view.message).toBeUndefined();
    expect(view.arrow).toBeUndefined();
    expect(view.trail).toHaveLength(1);

    frames.tick(100_000);
    frames.tick(200_000);
    expect(view.arrowsShown).toBe(2);
    expect(view.message?.text).toMatch(/^Too big/);
    expect(heard).toBe(2);
  });

  it("shows nothing more after stop", () => {
    engine.showResult(verdict(20, false));
    engine.play(buildCircularMotionLevel1Run(submission(20), level));
    frames.tick(0);
    engine.stop();
    frames.tick(60_000);

    expect(view.arrow).toBeUndefined();
    expect(view.message).toBeUndefined();
    expect(heard).toBe(0);
  });

  it("clears the old verdict when a new level is shown", () => {
    playToEnd(20);
    engine.showLevel(level);

    expect(view.message).toBeUndefined();
    expect(view.arrow).toBeUndefined();
    expect(view.trail).toEqual([]);
  });

  it("skips frames without the cart", () => {
    engine.play([snapshotState(0, 0, [])]);
    expect(cart.poses).toHaveLength(1);
    expect(view.arrow).toBeUndefined();
  });

  it("draws a zero-size stage without throwing", () => {
    const flat = new CoasterAnimation(
      view,
      cart,
      { width: 0, height: 0 },
      frames.schedule,
    );
    flat.showLevel(level);
    expect(view.scene!.loopRadius).toBe(0);
  });

  it("throws a RangeError for a level with no speed", () => {
    expect(() =>
      engine.showLevel({
        ...level,
        problemStatementVariablesValues: { radius: 10 },
      }),
    ).toThrow(RangeError);
  });

  it("uses the cart id the run builder uses", () => {
    const states = buildCircularMotionLevel1Run(submission(40), level);
    expect(Object.keys(states[0].objects)).toEqual([COASTER_CART_ID]);
  });
});
