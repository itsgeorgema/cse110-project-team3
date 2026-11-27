import { beforeEach, describe, expect, it } from "vitest";
import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { AnswerValidationResult } from "../../model/AnswerValidator.ts";
import {
  buildKinematicsLevel1Run,
  buildKinematicsLevel2Run,
  buildKinematicsLevel3Run,
  buildKinematicsLevel4Run,
} from "../../model/runs/kinematicsRun.ts";
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
    engine.showLevel({ ...level, levelId: 9 });
    expect(car.scene?.gateX).toBeUndefined();
    expect(car.scene?.label).toBe("");

    playToEnd(3, false);

    expect(car.message).toEqual({ text: "Not quite", correct: false });
  });

  it("puts Level 2's gate at velocity times time and labels its numbers", () => {
    const level2 = {
      gameId: "kinematics",
      levelId: 2,
      problemStatementVariablesValues: { velocity: 6, time: 3 },
    } as unknown as LevelDataConfig;
    engine.showLevel(level2);

    expect(car.scene?.label).toBe("6 m/s for 3 s");
    engine.showResult(verdict(0, false));
    engine.play(
      buildKinematicsLevel2Run(
        {
          gameId: "kinematics",
          levelId: 2,
          values: { displacement: 18 },
          units: { displacement: "m" },
        },
        level2,
      ),
    );
    frames.tick(0);
    frames.tick(5000);

    expect(car.carX).toBeCloseTo(car.scene!.gateX!, 6);
  });

  it("puts Level 3's gate at the average velocity times time", () => {
    const level3 = {
      gameId: "kinematics",
      levelId: 3,
      problemStatementVariablesValues: {
        initialVelocity: 5,
        finalVelocity: 13,
        time: 4,
      },
    } as unknown as LevelDataConfig;
    engine.showLevel(level3);

    expect(car.scene?.label).toBe("5 to 13 m/s in 4 s");
    engine.showResult(verdict(0, false));
    engine.play(
      buildKinematicsLevel3Run(
        {
          gameId: "kinematics",
          levelId: 3,
          values: { acceleration: 1 },
          units: { acceleration: "m/s^2" },
        },
        level3,
      ),
    );
    frames.tick(0);
    frames.tick(5000);

    // a = 1 instead of 2 ends at 28 m, 8 m short of the 36 m gate.
    expect(car.message).toEqual({ text: "Short by 8 m", correct: false });
  });

  const level4 = {
    gameId: "kinematics",
    levelId: 4,
    problemStatementVariablesValues: {
      initialVelocity: 5,
      acceleration: 2,
      time: 4,
    },
    toleranceRule: { absolute: 0.00001 },
  } as unknown as LevelDataConfig;

  function submission4(averageVelocity: number, distance: number) {
    return {
      gameId: "kinematics",
      levelId: 4,
      values: { averageVelocity, distance },
      units: { averageVelocity: "m/s", distance: "m" },
    };
  }

  /** Plays Level 4 to the end with the player's two answers. */
  function play4(
    averageVelocity: number,
    distance: number,
    correct: boolean,
  ): void {
    const answer = submission4(averageVelocity, distance);
    engine.showResult({ submittedAnswer: answer, correct, feedback: "" });
    engine.play(buildKinematicsLevel4Run(answer, level4));
    frames.tick(0);
    frames.tick(5000);
  }

  it("puts Level 4's gate at v0*t + a*t^2/2 and labels its numbers", () => {
    engine.showLevel(level4);

    expect(car.scene?.label).toBe("5 m/s, +2 m/s² for 4 s");
    expect(car.scene?.gateX).toBeGreaterThan(car.scene!.startX);
  });

  it("adds the player's average velocity to the label once they answer", () => {
    engine.showLevel(level4);
    engine.showResult({
      submittedAnswer: submission4(7.5, 36),
      correct: false,
      feedback: "",
    });

    expect(car.scene?.label).toBe(
      "5 m/s, +2 m/s² for 4 s\nYour average velocity: 7.5 m/s",
    );
  });

  it("stops Level 4's car at the gate for the right answers and says Correct!", () => {
    engine.showLevel(level4);
    play4(9, 36, true);

    expect(car.carX).toBeCloseTo(car.scene!.gateX!, 6);
    expect(car.message).toEqual({ text: "Correct!", correct: true });
  });

  it("says how far short a wrong distance stops (gate = 36 m)", () => {
    engine.showLevel(level4);
    play4(9, 20, false);

    expect(car.message).toEqual({ text: "Short by 16 m", correct: false });
  });

  it("says how far past the gate a too-big distance goes", () => {
    engine.showLevel(level4);
    play4(9, 40, false);

    expect(car.message).toEqual({
      text: "Past the gate by 4 m",
      correct: false,
    });
  });

  it("gives a wrong average velocity with the right distance its own message", () => {
    engine.showLevel(level4);
    play4(8, 36, false);

    expect(car.message).toEqual({
      text: "Average velocity should be (start + end) / 2",
      correct: false,
    });
  });

  it("shows the gate message when both answers are wrong", () => {
    engine.showLevel(level4);
    play4(8, 20, false);

    expect(car.message?.text).toBe("Short by 16 m");
  });
});
