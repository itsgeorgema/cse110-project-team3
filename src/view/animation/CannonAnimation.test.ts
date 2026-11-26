import { beforeEach, describe, expect, it } from "vitest";
import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { AnswerValidationResult } from "../../model/AnswerValidator.ts";
import type { Vec2 } from "../../model/SimulationState.ts";
import {
  buildCannonLevel1Run,
  CANNON_BALL_ID,
} from "../../model/runs/cannonRun.ts";
import { snapshotState } from "../../model/SimulationState.ts";
import {
  CANNON_BALL_RADIUS,
  CannonAnimation,
  type CannonMessage,
  type CannonScene,
  type CannonView,
} from "./CannonAnimation.ts";
import type { BallView } from "./DemoAnimation.ts";
import { ManualFrames } from "./ManualFrames.ts";

/** Records what would be drawn, instead of drawing it. */
class RecordingCannon implements CannonView {
  scene: CannonScene | undefined;
  trail: readonly Vec2[] = [];
  message: CannonMessage | undefined;
  drawScene(scene: CannonScene): void {
    this.scene = scene;
  }
  drawTrail(points: readonly Vec2[]): void {
    this.trail = points;
  }
  showMessage(message: CannonMessage | undefined): void {
    this.message = message;
  }
}

class RecordingBall implements BallView {
  readonly positions: Vec2[] = [];
  moveTo(position: Vec2): void {
    this.positions.push(position);
  }
  get at(): Vec2 | undefined {
    return this.positions.at(-1);
  }
}

const stage = { width: 600, height: 300 };
const g = 9.81;
const level = {
  gameId: "cannonTrajectory",
  levelId: 1,
  problemStatementVariablesValues: {
    launchSpeed: 10,
    launchAngle: 30,
    gravitationalAcceleration: g,
  },
} as unknown as LevelDataConfig;
const vx = 10 * Math.cos(Math.PI / 6);
const vy = 5;

type Answer = Record<string, number>;
const right: Answer = {
  initialHorizontalVelocity: vx,
  horizontalVelocityRate: 0,
  initialVerticalVelocity: vy,
  verticalVelocityRate: g,
};

function submission(values: Answer) {
  return { gameId: "cannonTrajectory", levelId: 1, values, units: {} };
}

function verdict(values: Answer, correct: boolean): AnswerValidationResult {
  return { submittedAnswer: submission(values), correct, feedback: "" };
}

describe("CannonAnimation", () => {
  let frames: ManualFrames;
  let view: RecordingCannon;
  let ball: RecordingBall;
  let engine: CannonAnimation;
  let heard: number;

  beforeEach(() => {
    frames = new ManualFrames();
    view = new RecordingCannon();
    ball = new RecordingBall();
    engine = new CannonAnimation(view, ball, stage, frames.schedule);
    heard = 0;
    engine.onPlaybackFinished(() => heard++);
    engine.showLevel(level);
  });

  /** Plays these equations to the end: one refresh at 0 ms, one past the cap. */
  function playToEnd(values: Answer, correct = false): void {
    engine.showResult(verdict(values, correct));
    engine.play(buildCannonLevel1Run(submission(values), level));
    frames.tick(0);
    frames.tick(60_000);
  }

  function wrong(changes: Answer): Answer {
    return { ...right, ...changes };
  }

  it("draws the tent, cannon, angle label and net before any answer", () => {
    const scene = view.scene!;

    expect(scene.angleDeg).toBe(30);
    expect(scene.angleLabel).toBe("30°");
    expect(scene.speedLabel).toBe("10 m/s");
    expect(scene.floorY).toBe(scene.cannon.y + CANNON_BALL_RADIUS);
    expect(scene.floorY).toBeLessThan(stage.height);
    expect(scene.cannon.x).toBeGreaterThan(0);
    expect(scene.netLeftX).toBeGreaterThan(scene.cannon.x);
    expect(scene.netRightX).toBeGreaterThan(scene.netLeftX);
    expect(scene.wallX).toBeGreaterThan(scene.netRightX);
    expect(scene.wallX).toBeLessThanOrEqual(stage.width);
    expect(scene.ceilingY).toBeGreaterThanOrEqual(0);
    expect(scene.ceilingY).toBeLessThan(scene.cannon.y);
    expect(ball.at).toEqual(scene.cannon);
    expect(view.trail).toEqual([]);
    expect(view.message).toBeUndefined();
  });

  it("lands the right answer in the middle of the net and says Correct! at the end", () => {
    engine.showResult(verdict(right, true));
    engine.play(buildCannonLevel1Run(submission(right), level));
    frames.tick(0);
    expect(view.message).toBeUndefined();

    frames.tick(60_000);

    const scene = view.scene!;
    expect(ball.at!.x).toBeCloseTo((scene.netLeftX + scene.netRightX) / 2, 6);
    expect(ball.at!.y).toBeCloseTo(scene.cannon.y, 6);
    expect(view.message).toEqual({ text: "Correct!", correct: true });
    expect(heard).toBe(1);
  });

  it("draws the trail behind the ball, growing as it flies", () => {
    const states = buildCannonLevel1Run(submission(right), level);
    engine.showResult(verdict(right, true));
    engine.play(states);
    expect(view.trail).toHaveLength(1);

    frames.tick(0);
    frames.tick(500);

    const flown = view.trail.length;
    expect(flown).toBeGreaterThan(1);
    expect(flown).toBeLessThan(states.length);
    expect(view.trail.at(-1)).toEqual(ball.at);
    // The ball rises above the cannon on screen.
    expect(view.trail.at(-1)!.y).toBeLessThan(view.scene!.cannon.y);

    frames.tick(60_000);
    expect(view.trail).toHaveLength(states.length);
  });

  it("says how far short a slow answer lands", () => {
    playToEnd(wrong({ initialHorizontalVelocity: vx / 2 }));

    expect(view.message).toEqual({
      text: "Landed 4.4 m short of the net",
      correct: false,
    });
  });

  it("says how far past the net a fast answer lands", () => {
    playToEnd(wrong({ initialHorizontalVelocity: vx * 1.25 }));

    expect(view.message).toEqual({
      text: "Landed 2.2 m past the net",
      correct: false,
    });
  });

  it("calls a wrong answer that still lands in the net wrong", () => {
    playToEnd(wrong({ horizontalVelocityRate: 0.05 }));

    expect(view.message).toEqual({
      text: "In the net, but an answer is off",
      correct: false,
    });
  });

  it("says when the ball hits the tent wall", () => {
    playToEnd(wrong({ initialHorizontalVelocity: 100 }));

    expect(view.message?.text).toBe("Hit the tent wall");
    expect(ball.at!.x).toBeCloseTo(view.scene!.wallX, 6);
  });

  it("says when the ball floats out the top without gravity", () => {
    playToEnd(wrong({ verticalVelocityRate: 0 }));

    expect(view.message?.text).toBe("Flew out the top of the tent");
    expect(ball.at!.y).toBeCloseTo(view.scene!.ceilingY, 6);
  });

  it("says when the ball flies backward off the stage", () => {
    playToEnd(wrong({ initialHorizontalVelocity: -vx }));

    expect(view.message?.text).toBe("Flew backward out of the tent");
  });

  it("says when the ball never comes down", () => {
    playToEnd({
      initialHorizontalVelocity: 0.1,
      horizontalVelocityRate: 0,
      initialVerticalVelocity: 0.5,
      verticalVelocityRate: 0,
    });

    expect(view.message?.text).toBe("Never came down");
  });

  it("hides the verdict and restarts the trail on replay", () => {
    playToEnd(right, true);

    engine.replay();

    expect(view.message).toBeUndefined();
    expect(view.trail).toHaveLength(1);
    expect(ball.at).toEqual(view.scene!.cannon);
    frames.tick(0);
    frames.tick(60_000);
    expect(view.message?.text).toBe("Correct!");
    expect(heard).toBe(2);
  });

  it("never shows a verdict or finishes when stopped mid-flight", () => {
    engine.showResult(verdict(right, true));
    engine.play(buildCannonLevel1Run(submission(right), level));
    frames.tick(0);
    engine.stop();
    frames.tick(60_000);

    expect(view.message).toBeUndefined();
    expect(heard).toBe(0);
    expect(frames.waiting).toBe(0);
  });

  it("shows nothing at the end when no verdict was given", () => {
    engine.play(buildCannonLevel1Run(submission(right), level));
    frames.tick(0);
    frames.tick(60_000);

    expect(view.message).toBeUndefined();
    expect(heard).toBe(1);
  });

  it("forgets the last verdict when a new level opens", () => {
    playToEnd(right, true);

    engine.showLevel(level);
    engine.play(buildCannonLevel1Run(submission(right), level));
    frames.tick(0);
    frames.tick(60_000);

    expect(view.message).toBeUndefined();
  });

  it("skips frames without the ball", () => {
    engine.showResult(verdict(right, false));
    const before = ball.positions.length;
    engine.play([snapshotState(0, 0, [])]);
    frames.tick(0);

    expect(ball.positions).toHaveLength(before);
    expect(view.message?.text).toBe("Landed 8.8 m short of the net");
  });

  it("says Not quite when played before any level", () => {
    const fresh = new CannonAnimation(view, ball, stage, frames.schedule);
    fresh.showResult(verdict(right, false));
    fresh.play([
      snapshotState(0, 0, [
        { id: CANNON_BALL_ID, position: { x: 1, y: 0 }, angle: 0 },
      ]),
    ]);
    frames.tick(0);

    expect(view.message).toEqual({ text: "Not quite", correct: false });
  });

  it("still lays out a stage too small to draw on", () => {
    const tiny = new CannonAnimation(
      view,
      ball,
      { width: 0, height: 0 },
      frames.schedule,
    );

    tiny.showLevel(level);

    expect(Number.isFinite(view.scene!.wallX)).toBe(true);
  });

  it("rejects a level with no valid launch", () => {
    expect(() =>
      engine.showLevel({
        ...level,
        problemStatementVariablesValues: { launchSpeed: 10 },
      }),
    ).toThrow(/launchAngle/);
  });
});
