import { beforeEach, describe, expect, it } from "vitest";
import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { AnswerValidationResult } from "../../model/AnswerValidator.ts";
import { buildKinematicsLevel1Run } from "../../model/runs/kinematicsRun.ts";
import {
  CarAnimation,
  type CarMessage,
  type CarScene,
  type CarView,
} from "./CarAnimation.ts";
import { ManualFrames } from "./ManualFrames.ts";

/** Records what would be drawn, instead of drawing it. */
class RecordingCar implements CarView {
  scene: CarScene | undefined;
  readonly carXs: number[] = [];
  message: CarMessage | undefined;
  drawScene(scene: CarScene): void {
    this.scene = scene;
  }
  moveCar(x: number): void {
    this.carXs.push(x);
  }
  showMessage(message: CarMessage | undefined): void {
    this.message = message;
  }
  get carX(): number | undefined {
    return this.carXs.at(-1);
  }
}

const stage = { width: 600, height: 260 };

const level = {
  gameId: "kinematics",
  levelId: 1,
  problemStatementVariablesValues: { displacement: 10, time: 2 },
} as unknown as LevelDataConfig;

function submission(velocity: number) {
  return {
    gameId: "kinematics",
    levelId: 1,
    values: { velocity },
    units: { velocity: "m/s" },
  };
}

function verdict(velocity: number, correct: boolean): AnswerValidationResult {
  return { submittedAnswer: submission(velocity), correct, feedback: "" };
}

describe("CarAnimation", () => {
  let frames: ManualFrames;
  let car: RecordingCar;
  let engine: CarAnimation;
  let heard: number;

  beforeEach(() => {
    frames = new ManualFrames();
    car = new RecordingCar();
    engine = new CarAnimation(car, stage, frames.schedule);
    heard = 0;
    engine.onPlaybackFinished(() => heard++);
    engine.showLevel(level);
  });

  /** Plays the player's velocity to the end: one refresh at 0 ms, one past the end. */
  function playToEnd(velocity: number, correct: boolean): void {
    engine.showResult(verdict(velocity, correct));
    engine.play(buildKinematicsLevel1Run(submission(velocity), level));
    frames.tick(0);
    frames.tick(5000);
  }

  it("draws the track, the gate and the level's numbers before any answer", () => {
    expect(car.scene?.label).toBe("10 m in 2 s");
    expect(car.scene?.startX).toBe(56);
    expect(car.scene?.gateX).toBeGreaterThan(car.scene!.startX);
    expect(car.scene?.gateX).toBeLessThan(stage.width);
    expect(car.scene?.groundY).toBe(stage.height - 28);
    expect(car.carX).toBe(car.scene?.startX);
    expect(car.message).toBeUndefined();
  });

  it("stops the car at the gate for the right velocity and says so at the end", () => {
    engine.showResult(verdict(5, true));
    engine.play(buildKinematicsLevel1Run(submission(5), level));
    frames.tick(0);
    expect(car.message).toBeUndefined();

    frames.tick(5000);

    expect(car.carX).toBeCloseTo(car.scene!.gateX!, 6);
    expect(car.message).toEqual({ text: "Correct!", correct: true });
    expect(heard).toBe(1);
  });

  it("says how far short a slow answer stops", () => {
    playToEnd(3, false);

    expect(car.carX).toBeLessThan(car.scene!.gateX!);
    expect(car.message).toEqual({ text: "Short by 4 m", correct: false });
  });

  it("says how far past the gate a fast answer goes, and keeps the car on stage", () => {
    playToEnd(50, false);

    expect(car.message).toEqual({
      text: "Past the gate by 90 m",
      correct: false,
    });
    expect(car.carX).toBe(stage.width);
  });

  it("keeps a backward answer's car at the left edge", () => {
    playToEnd(-5, false);

    expect(car.carX).toBe(0);
    expect(car.message?.text).toBe("Short by 20 m");
  });

  it("rounds the gap to one decimal", () => {
    playToEnd(2.66, false);

    expect(car.message?.text).toBe("Short by 4.7 m");
  });

  it("hides the verdict while a replay runs and shows it again at the end", () => {
    playToEnd(3, false);

    engine.replay();
    expect(car.message).toBeUndefined();
    frames.tick(6000);
    frames.tick(9000);

    expect(car.message?.text).toBe("Short by 4 m");
    expect(heard).toBe(2);
  });

  it("shows no verdict after stop()", () => {
    engine.showResult(verdict(3, false));
    engine.play(buildKinematicsLevel1Run(submission(3), level));
    engine.stop();
    frames.tick(5000);

    expect(car.message).toBeUndefined();
    expect(heard).toBe(0);
  });

  it("shows no verdict for a run played without one", () => {
    engine.play(buildKinematicsLevel1Run(submission(3), level));
    frames.tick(0);
    frames.tick(5000);

    expect(car.message).toBeUndefined();
    expect(heard).toBe(1);
  });

  it("forgets the old verdict when a new level is shown", () => {
    playToEnd(3, false);
    engine.showLevel(level);
    engine.play(buildKinematicsLevel1Run(submission(3), level));
    frames.tick(6000);
    frames.tick(9000);

    expect(car.message).toBeUndefined();
  });

  it("draws no gate and says only 'Not quite' on a level without one", () => {
    engine.showLevel({ ...level, levelId: 2 });
    expect(car.scene?.gateX).toBeUndefined();
    expect(car.scene?.label).toBe("");

    playToEnd(3, false);

    expect(car.message).toEqual({ text: "Not quite", correct: false });
  });
});
