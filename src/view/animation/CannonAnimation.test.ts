import { beforeEach, describe, expect, it } from "vitest";
import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { AnswerValidationResult } from "../../model/AnswerValidator.ts";
import type { Vec2 } from "../../model/SimulationState.ts";
import {
  buildCannonLevel1Run,
  buildCannonLevel2Run,
  buildCannonLevel3Run,
  CANNON_BALL_ID,
  CANNON_GUESS_ID,
  cannonTargetArena,
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
    expect(scene.target).toBeUndefined();
    expect(scene.net!.leftX).toBeGreaterThan(scene.cannon.x);
    expect(scene.net!.rightX).toBeGreaterThan(scene.net!.leftX);
    expect(scene.wallX).toBeGreaterThan(scene.net!.rightX);
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
    expect(ball.at!.x).toBeCloseTo(
      (scene.net!.leftX + scene.net!.rightX) / 2,
      6,
    );
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

describe("CannonAnimation, Level 3 (#143)", () => {
  // A net 30 m out and 5 m up at 45°: the right speed is 18.79 m/s.
  const level3 = {
    gameId: "cannonTrajectory",
    levelId: 3,
    problemStatementVariablesValues: {
      horizontalDistance: 30,
      targetHeight: 5,
      launchAngle: 45,
      gravitationalAcceleration: g,
    },
    toleranceRule: { absolute: 0.005 },
  } as unknown as LevelDataConfig;
  const rightSpeed = 30 * Math.sqrt(g / 25);

  let frames: ManualFrames;
  let view: RecordingCannon;
  let ball: RecordingBall;
  let engine: CannonAnimation;

  beforeEach(() => {
    frames = new ManualFrames();
    view = new RecordingCannon();
    ball = new RecordingBall();
    engine = new CannonAnimation(view, ball, stage, frames.schedule);
    engine.showLevel(level3);
  });

  function speedResult(
    launchSpeed: number,
    correct: boolean,
  ): AnswerValidationResult {
    return {
      submittedAnswer: {
        gameId: "cannonTrajectory",
        levelId: 3,
        values: { launchSpeed },
        units: {},
      },
      correct,
      feedback: "",
    };
  }

  /** Plays a typed speed to the end; a correct one flies the exact answer. */
  function launch(typed: number, correct = false): void {
    const played = correct ? rightSpeed : typed;
    engine.showResult(speedResult(typed, correct));
    engine.play(
      buildCannonLevel3Run(
        {
          gameId: "cannonTrajectory",
          levelId: 3,
          values: { launchSpeed: played },
          units: {},
        },
        level3,
      ),
    );
    frames.tick(0);
    frames.tick(60_000);
  }

  it("hangs the net at the level's distance and height, with labelled guides", () => {
    const scene = view.scene!;
    const target = scene.target!;
    const center = (target.topY + target.bottomY) / 2;

    expect(scene.net).toBeUndefined();
    expect(scene.angleLabel).toBe("45°");
    expect(scene.speedLabel).toBe("v = ?");
    expect(target.x).toBeGreaterThan(scene.cannon.x);
    expect(target.x).toBeLessThan(scene.wallX);
    expect(target.topY).toBeLessThan(target.bottomY);
    expect(target.topY).toBeGreaterThan(scene.ceilingY);
    // 5 m up and 30 m out, at the same scale.
    expect((scene.cannon.y - center) / (target.x - scene.cannon.x)).toBeCloseTo(
      5 / 30,
      10,
    );
    expect(target.horizontal).toEqual({
      from: scene.cannon,
      to: { x: target.x, y: scene.cannon.y },
      label: "Horizontal distance = 30 m",
    });
    expect(target.vertical).toEqual({
      from: { x: target.x, y: scene.cannon.y },
      to: { x: target.x, y: expect.closeTo(center, 9) },
      label: "Vertical distance = 5 m",
    });
    expect(ball.at).toEqual(scene.cannon);
  });

  it("sizes the drawn net from the arena", () => {
    const arena = cannonTargetArena(level3);
    const target = view.scene!.target!;
    const pixelsPerMeter = (target.x - view.scene!.cannon.x) / arena.targetX;

    expect((target.bottomY - target.topY) / pixelsPerMeter).toBeCloseTo(
      2 * arena.targetHalfHeight,
      10,
    );
  });

  it("flies a right answer through the net's center and says Correct!", () => {
    launch(18.79, true);

    const target = view.scene!.target!;
    const center = (target.topY + target.bottomY) / 2;
    const i = view.trail.findIndex((p) => p.x >= target.x);
    const [a, b] = [view.trail[i - 1], view.trail[i]];
    const crossing = a.y + ((b.y - a.y) * (target.x - a.x)) / (b.x - a.x);
    expect(crossing).toBeCloseTo(center, 0);
    expect(view.message).toEqual({ text: "Correct!", correct: true });
  });

  it("labels the cannon with the typed speed once it launches", () => {
    launch(17.5);

    expect(view.scene!.speedLabel).toBe("17.5 m/s");
    expect(view.scene!.target!.horizontal.label).toBe(
      "Horizontal distance = 30 m",
    );
  });

  it("says how far below the net a slow speed passed", () => {
    launch(17.5);

    expect(view.message).toEqual({
      text: "Passed 3.8 m below the net",
      correct: false,
    });
  });

  it("says how far above the net a fast speed passed", () => {
    launch(20);

    expect(view.message).toEqual({
      text: "Passed 2.9 m above the net",
      correct: false,
    });
  });

  it("calls a wrong speed that goes through the net wrong, and says by how much", () => {
    launch(18.6);

    expect(view.message).toEqual({
      text: "Through the net, but 0.5 m below its center",
      correct: false,
    });
  });

  it("uses two places for a near miss inside the net", () => {
    launch(Number((rightSpeed + 0.01).toFixed(4)));

    expect(view.message?.text).toBe(
      "Through the net, but 0.03 m above its center",
    );
  });

  it("calls a miss too small to show in meters a little off", () => {
    launch(rightSpeed + 0.001);

    expect(view.message?.text).toBe(
      "Through the net, but the speed is a little off",
    );
  });

  it("says how far short a speed too slow to reach the net lands", () => {
    launch(15);

    expect(view.message?.text).toBe("Landed 7.1 m short of the net");
    expect(ball.at!.y).toBeCloseTo(view.scene!.cannon.y, 6);
  });

  it("says when a very fast speed flies out the top before the net", () => {
    launch(40);

    expect(view.message?.text).toBe("Flew out the top of the tent");
    expect(ball.at!.y).toBeCloseTo(view.scene!.ceilingY, 6);
  });

  it("says Not quite when the result has no launch speed", () => {
    engine.showResult({
      ...speedResult(1, false),
      submittedAnswer: {
        gameId: "cannonTrajectory",
        levelId: 3,
        values: {},
        units: {},
      },
    });
    engine.play([
      snapshotState(0, 0, [
        { id: CANNON_BALL_ID, position: { x: 1, y: 0 }, angle: 0 },
      ]),
    ]);
    frames.tick(0);

    expect(view.scene!.speedLabel).toBe("v = ?");
    expect(view.message).toEqual({ text: "Not quite", correct: false });
  });

  it("goes back to Level 1's floor net when Level 1 opens", () => {
    engine.showLevel(level);

    expect(view.scene!.target).toBeUndefined();
    expect(view.scene!.net).toBeDefined();
    expect(view.scene!.speedLabel).toBe("10 m/s");
  });

  it("rejects a Level 3 with no valid net", () => {
    expect(() =>
      engine.showLevel({
        ...level3,
        problemStatementVariablesValues: { launchAngle: 45 },
      }),
    ).toThrow(/horizontalDistance/);
  });
});

describe("CannonAnimation, Level 2 (#142)", () => {
  // 20 m/s at 30°, paused at t = 1 s: (17.32, 5.095) m.
  const vx2 = 20 * Math.cos(Math.PI / 6);
  const dy = 10 - g / 2;
  const right2: Answer = {
    averageHorizontalVelocity: vx2,
    averageVerticalVelocity: dy,
    horizontalDisplacement: vx2,
    verticalDisplacement: dy,
  };
  const level2 = {
    gameId: "cannonTrajectory",
    levelId: 2,
    problemStatementVariablesValues: {
      launchSpeed: 20,
      launchAngle: 30,
      time: 1,
      gravitationalAcceleration: g,
    },
    expectedUserInput: right2,
    toleranceRule: { absolute: 0.05 },
  } as unknown as LevelDataConfig;

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
    engine.showLevel(level2);
  });

  function result(values: Answer, correct: boolean): AnswerValidationResult {
    return {
      submittedAnswer: {
        gameId: "cannonTrajectory",
        levelId: 2,
        values,
        units: {},
      },
      correct,
      feedback: "",
    };
  }

  /** Plays typed numbers to the pause; a correct answer plays the exact one (#114). */
  function playToPause(changes: Answer = {}, correct = false): void {
    const typed = { ...right2, ...changes };
    engine.showResult(result(typed, correct));
    engine.play(
      buildCannonLevel2Run(
        {
          gameId: "cannonTrajectory",
          levelId: 2,
          values: correct ? right2 : typed,
          units: {},
        },
        level2,
      ),
    );
    frames.tick(0);
    frames.tick(60_000);
  }

  it("draws the tent and cannon with the level's speed and no net before an answer", () => {
    const scene = view.scene!;

    expect(scene.net).toBeUndefined();
    expect(scene.target).toBeUndefined();
    expect(scene.pause).toBeUndefined();
    expect(scene.angleLabel).toBe("30°");
    expect(scene.speedLabel).toBe("20 m/s");
    expect(ball.at).toEqual(scene.cannon);
    expect(view.message).toBeUndefined();
  });

  it("keeps room above the tent for the verdict", () => {
    // A steep launch past its peak: the tent's height sets the scale.
    engine.showLevel({
      ...level2,
      problemStatementVariablesValues: {
        ...level2.problemStatementVariablesValues,
        launchAngle: 60,
        time: 2.5,
      },
    });

    expect(view.scene!.ceilingY).toBeCloseTo(0.28 * stage.height, 6);
    // Level 1 fills the stage up to its margin instead.
    engine.showLevel(level);
    expect(view.scene!.ceilingY).toBeLessThan(0.28 * stage.height);
  });

  it("shows no pause labels while the ball is still flying", () => {
    engine.showResult(result(right2, true));
    engine.play(
      buildCannonLevel2Run(
        { gameId: "cannonTrajectory", levelId: 2, values: right2, units: {} },
        level2,
      ),
    );
    frames.tick(0);
    frames.tick(500);

    expect(view.scene!.pause).toBeUndefined();
    expect(view.message).toBeUndefined();
    expect(heard).toBe(0);
  });

  it("pauses at t and labels the time, Δx along the floor and Δy up to the ball", () => {
    playToPause({}, true);

    const scene = view.scene!;
    const pause = scene.pause!;
    expect(heard).toBe(1);
    expect(pause.timeLabel).toBe("At t = 1 s");
    expect(pause.ball).toEqual(ball.at);
    expect(pause.horizontal).toEqual({
      from: scene.cannon,
      to: { x: pause.ball.x, y: scene.cannon.y },
      label: "Δx",
    });
    expect(pause.vertical).toEqual({
      from: { x: pause.ball.x, y: scene.cannon.y },
      to: pause.ball,
      label: "Δy",
    });
    // Δx and Δy at the same scale: 5.095 m up for 17.32 m across.
    const across = pause.ball.x - scene.cannon.x;
    const up = scene.cannon.y - pause.ball.y;
    expect(up / across).toBeCloseTo(dy / vx2, 9);
  });

  it("snaps a correct answer's marker and average line onto the ball, and says Correct!", () => {
    playToPause({ horizontalDisplacement: vx2 + 0.03 }, true);

    const pause = view.scene!.pause!;
    expect(pause.guess!.x).toBeCloseTo(pause.ball.x, 9);
    expect(pause.guess!.y).toBeCloseTo(pause.ball.y, 9);
    expect(pause.average).toMatchObject({
      from: view.scene!.cannon,
      label: "Average velocity × t",
    });
    expect(pause.average!.to.x).toBeCloseTo(pause.ball.x, 9);
    expect(pause.average!.to.y).toBeCloseTo(pause.ball.y, 9);
    expect(view.message).toEqual({ text: "Correct!", correct: true });
  });

  it("leaves a visible gap for a wrong Δx and says how far too far it is", () => {
    playToPause({ horizontalDisplacement: vx2 + 2.3 });

    const pause = view.scene!.pause!;
    expect(pause.guess!.x).toBeGreaterThan(pause.ball.x + 10);
    expect(pause.guess!.y).toBeCloseTo(pause.ball.y, 9);
    expect(view.message).toEqual({
      text: "Δx is 2.3 m too far",
      correct: false,
    });
  });

  it("says a short Δx, and a high or low Δy", () => {
    playToPause({ horizontalDisplacement: vx2 - 1.5 });
    expect(view.message!.text).toBe("Δx is 1.5 m too short");

    playToPause({ verticalDisplacement: dy + 0.4 });
    expect(view.message!.text).toBe("Δy is 0.4 m too high");
    expect(view.scene!.pause!.guess!.y).toBeLessThan(view.scene!.pause!.ball.y);

    playToPause({ verticalDisplacement: dy - 0.4 });
    expect(view.message!.text).toBe("Δy is 0.4 m too low");
  });

  it("says which average velocity is off, and ends its line off the ball", () => {
    playToPause({ averageHorizontalVelocity: vx2 + 1 });
    expect(view.message!.text).toBe(
      "Average horizontal velocity is 1 m/s too fast",
    );
    expect(view.scene!.pause!.average!.to.x).toBeGreaterThan(
      view.scene!.pause!.ball.x,
    );

    playToPause({ averageHorizontalVelocity: vx2 - 1 });
    expect(view.message!.text).toBe(
      "Average horizontal velocity is 1 m/s too slow",
    );

    playToPause({ averageVerticalVelocity: dy + 2 });
    expect(view.message!.text).toBe(
      "Average vertical velocity is 2 m/s too high",
    );

    playToPause({ averageVerticalVelocity: dy - 2 });
    expect(view.message!.text).toBe(
      "Average vertical velocity is 2 m/s too low",
    );
  });

  it("lists every wrong answer, one per line, in the order they are asked", () => {
    playToPause({
      averageVerticalVelocity: 10,
      horizontalDisplacement: vx2 + 3,
      verticalDisplacement: 10,
    });

    expect(view.message).toEqual({
      text: [
        "Δx is 3 m too far",
        "Δy is 4.9 m too high",
        "Average vertical velocity is 4.9 m/s too high",
      ].join("\n"),
      correct: false,
    });
  });

  it("ignores answers within the level's tolerance", () => {
    playToPause({
      horizontalDisplacement: vx2 + 0.04,
      verticalDisplacement: 0,
    });

    expect(view.message!.text).toBe("Δy is 5.1 m too low");
  });

  it("uses two places for a small miss", () => {
    playToPause({ horizontalDisplacement: vx2 + 0.07 });

    expect(view.message!.text).toBe("Δx is 0.1 m too far");

    playToPause({ verticalDisplacement: dy - 0.04 }, false);
    expect(view.message!.text).toBe("Not quite");
  });

  it("counts a relative tolerance", () => {
    engine.showLevel({
      ...level2,
      toleranceRule: { absolute: 0, relative: 0.1 },
    });
    playToPause({ horizontalDisplacement: vx2 + 1 });

    expect(view.message!.text).toBe("Not quite");
  });

  it("keeps a point far off the stage at the tent's edge", () => {
    playToPause({ horizontalDisplacement: 1000, verticalDisplacement: 1000 });

    const scene = view.scene!;
    expect(scene.pause!.guess).toEqual({ x: scene.wallX, y: scene.ceilingY });
  });

  it("keeps a point below the floor on the floor", () => {
    playToPause({ verticalDisplacement: -5 });

    expect(view.scene!.pause!.guess!.y).toBeCloseTo(view.scene!.cannon.y, 9);
  });

  it("takes the pause labels down on replay and puts them back at the end", () => {
    playToPause({ horizontalDisplacement: vx2 + 2.3 });

    engine.replay();
    expect(view.scene!.pause).toBeUndefined();
    expect(view.message).toBeUndefined();
    expect(view.scene!.speedLabel).toBe("20 m/s");

    frames.tick(0);
    frames.tick(60_000);
    expect(view.scene!.pause).toBeDefined();
    expect(view.message!.text).toBe("Δx is 2.3 m too far");
  });

  it("takes the pause labels down when a new answer plays", () => {
    playToPause({ horizontalDisplacement: vx2 + 2.3 });

    engine.play([
      snapshotState(0, 0, [
        { id: CANNON_BALL_ID, position: { x: 0, y: 0 }, angle: 0 },
      ]),
      snapshotState(1, 1000, [
        { id: CANNON_BALL_ID, position: { x: 1, y: 1 }, angle: 0 },
      ]),
    ]);

    expect(view.scene!.pause).toBeUndefined();
  });

  it("labels the pause without a marker for frames that carry none", () => {
    engine.showResult(result(right2, true));
    engine.play([
      snapshotState(0, 0, [
        { id: CANNON_BALL_ID, position: { x: 0, y: 0 }, angle: 0 },
      ]),
    ]);
    frames.tick(0);

    expect(view.scene!.pause).toBeDefined();
    expect(view.scene!.pause!.guess).toBeUndefined();
    expect(view.scene!.pause!.average).toBeUndefined();
  });

  it("draws no pause for frames without the ball", () => {
    engine.play([
      snapshotState(0, 0, [
        { id: CANNON_GUESS_ID, position: { x: 1, y: 1 }, angle: 0 },
      ]),
    ]);
    frames.tick(0);
    expect(view.scene!.pause).toBeUndefined();
  });

  it("says Not quite when the result has no answers", () => {
    engine.showResult({
      ...result({}, false),
    });
    engine.play([
      snapshotState(0, 0, [
        { id: CANNON_BALL_ID, position: { x: 1, y: 1 }, angle: 0 },
      ]),
    ]);
    frames.tick(0);

    expect(view.message).toEqual({ text: "Not quite", correct: false });
  });

  it("forgets the pause when another level opens", () => {
    playToPause({}, true);

    engine.showLevel(level);
    expect(view.scene!.pause).toBeUndefined();
    expect(view.scene!.net).toBeDefined();

    // Level 1's run no longer has Level 2's labels at the end.
    playToEnd(right, true);
    expect(view.scene!.pause).toBeUndefined();
  });

  /** Level 1's playback, for the switch above. */
  function playToEnd(values: Answer, correct: boolean): void {
    engine.showResult(verdict(values, correct));
    engine.play(buildCannonLevel1Run(submission(values), level));
    frames.tick(0);
    frames.tick(60_000);
  }

  it("rejects a Level 2 whose time is after the landing", () => {
    expect(() =>
      engine.showLevel({
        ...level2,
        problemStatementVariablesValues: {
          ...level2.problemStatementVariablesValues,
          time: 5,
        },
      }),
    ).toThrow(/time/);
  });
});
