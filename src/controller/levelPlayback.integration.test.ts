import { describe, expect, it, vi } from "vitest";
import { LevelDataConfigFactory } from "../data/LevelDataConfig.ts";
import { DefaultAnswerValidator } from "../model/DefaultAnswerValidator.ts";
import {
  CarAnimation,
  type CarMessage,
  type CarView,
} from "../view/animation/CarAnimation.ts";
import {
  CannonAnimation,
  type CannonMessage,
  type CannonScene,
  type CannonView,
} from "../view/animation/CannonAnimation.ts";
import {
  CoasterAnimation,
  type CoasterArrow,
  type CoasterMessage,
  type CoasterView,
} from "../view/animation/CoasterAnimation.ts";
import { ManualFrames } from "../view/animation/ManualFrames.ts";
import { GameController } from "./GameController.ts";
import { runBuilderFor } from "./runRegistry.ts";

/** CarAnimation's drawing, recorded instead of drawn. */
class RecordingCar implements CarView {
  message: CarMessage | undefined;
  drawScene(): void {}
  moveCar(): void {}
  showMessage(message: CarMessage | undefined): void {
    this.message = message;
  }
}

/**
 * #116: a real level config, the real validator, the real RunBuilder from the
 * registry and the real CarAnimation logic, with only the canvas and the
 * monitor replaced.
 */
function playLevel1() {
  const level = new LevelDataConfigFactory().createLevelDataConfig(
    "kinematics",
    1,
  );
  const buildRun = runBuilderFor(level);
  if (buildRun === undefined) throw new Error("Level 1 has no run builder");
  const frames = new ManualFrames();
  const car = new RecordingCar();
  const animation = new CarAnimation(
    car,
    { width: 600, height: 260 },
    frames.schedule,
  );
  const progress = { recordAttempt: vi.fn() };
  const controller = new GameController(
    level,
    vi.fn(),
    new DefaultAnswerValidator(),
    vi.fn(),
    { animation, buildRun, progress },
  );
  const answer = (velocity: number) =>
    controller.submitAnswer({
      gameId: "kinematics",
      levelId: 1,
      fields: { velocity: String(velocity) },
    });
  return { level, frames, car, progress, controller, answer };
}

describe("Minigame 1 Level 1 playback, end to end (#116)", () => {
  it("plays a correct answer, shows the verdict, then records the attempt once", () => {
    const { level, frames, car, progress, answer } = playLevel1();

    answer(level.expectedUserInput.velocity);
    frames.tick(0);
    expect(progress.recordAttempt).not.toHaveBeenCalled();

    frames.tick(60_000);

    expect(car.message).toEqual({ text: "Correct!", correct: true });
    expect(progress.recordAttempt).toHaveBeenCalledTimes(1);
    expect(progress.recordAttempt.mock.calls[0][0].correct).toBe(true);
  });

  it("plays a wrong answer short of the gate and records it as wrong", () => {
    const { level, frames, car, progress, answer } = playLevel1();
    const { displacement } = level.problemStatementVariablesValues;

    answer(level.expectedUserInput.velocity / 2);
    frames.tick(0);
    frames.tick(60_000);

    expect(car.message?.text).toBe(`Short by ${displacement / 2} m`);
    expect(progress.recordAttempt.mock.calls[0][0].correct).toBe(false);
  });

  it("does not record again when the player replays the run", () => {
    const { level, frames, progress, answer } = playLevel1();

    answer(level.expectedUserInput.velocity);
    frames.tick(0);
    frames.tick(60_000);
    frames.tick(60_001);

    expect(progress.recordAttempt).toHaveBeenCalledTimes(1);
  });

  it("records nothing when the level is left mid-playback", () => {
    const { level, frames, progress, controller, answer } = playLevel1();

    answer(level.expectedUserInput.velocity);
    frames.tick(0);
    controller.dispose();
    frames.tick(60_000);

    expect(progress.recordAttempt).not.toHaveBeenCalled();
    expect(frames.waiting).toBe(0);
  });
});

describe.each([
  { levelId: 2, input: "displacement" },
  { levelId: 3, input: "acceleration" },
])("Minigame 1 Level $levelId playback, end to end", ({ levelId, input }) => {
  function playLevel() {
    const level = new LevelDataConfigFactory().createLevelDataConfig(
      "kinematics",
      levelId,
    );
    const buildRun = runBuilderFor(level);
    if (buildRun === undefined) throw new Error("level has no run builder");
    const frames = new ManualFrames();
    const car = new RecordingCar();
    const animation = new CarAnimation(
      car,
      { width: 600, height: 260 },
      frames.schedule,
    );
    const progress = { recordAttempt: vi.fn() };
    const controller = new GameController(
      level,
      vi.fn(),
      new DefaultAnswerValidator(),
      vi.fn(),
      { animation, buildRun, progress },
    );
    const answer = (value: number) => {
      controller.submitAnswer({
        gameId: "kinematics",
        levelId,
        fields: { [input]: String(value) },
      });
      frames.tick(0);
      frames.tick(60_000);
    };
    return { level, car, progress, answer };
  }

  it("plays the right answer to the gate and says Correct!", () => {
    const { level, car, progress, answer } = playLevel();

    answer(level.expectedUserInput[input]);

    expect(car.message).toEqual({ text: "Correct!", correct: true });
    expect(progress.recordAttempt.mock.calls[0][0].correct).toBe(true);
  });

  it("plays a too-small answer short of the gate", () => {
    const { level, car, progress, answer } = playLevel();

    answer(level.expectedUserInput[input] / 2);

    expect(car.message?.text).toMatch(/^Short by \d/);
    expect(progress.recordAttempt.mock.calls[0][0].correct).toBe(false);
  });
});

/** CannonAnimation's drawing, recorded instead of drawn. */
class RecordingCannon implements CannonView {
  message: CannonMessage | undefined;
  pause: CannonScene["pause"];
  drawScene(scene: CannonScene): void {
    this.pause = scene.pause;
  }
  drawTrail(): void {}
  showMessage(message: CannonMessage | undefined): void {
    this.message = message;
  }
}

/** A cannon level with the real config, validator, registry and engine. */
function playCannonLevel(levelId: 1 | 2 | 3) {
  const level = new LevelDataConfigFactory().createLevelDataConfig(
    "cannonTrajectory",
    levelId,
  );
  const buildRun = runBuilderFor(level);
  if (buildRun === undefined) throw new Error("level has no run builder");
  const frames = new ManualFrames();
  const cannon = new RecordingCannon();
  const animation = new CannonAnimation(
    cannon,
    { moveTo: vi.fn() },
    { width: 600, height: 300 },
    frames.schedule,
  );
  const progress = { recordAttempt: vi.fn() };
  const controller = new GameController(
    level,
    vi.fn(),
    new DefaultAnswerValidator(),
    vi.fn(),
    { animation, buildRun, progress },
  );
  const answer = (values: Readonly<Record<string, number>>) => {
    controller.submitAnswer({
      gameId: "cannonTrajectory",
      levelId,
      fields: Object.fromEntries(
        Object.entries(values).map(([field, value]) => [field, String(value)]),
      ),
    });
    frames.tick(0);
    frames.tick(60_000);
  };
  return { level, cannon, progress, answer };
}

describe("Minigame 3 Level 1 playback, end to end (#138)", () => {
  const playLevel = () => playCannonLevel(1);

  it("lands the right answer, rounded to two places, in the net", () => {
    const { level, cannon, progress, answer } = playLevel();
    const rounded = Object.fromEntries(
      Object.entries(level.expectedUserInput).map(([field, value]) => [
        field,
        Number(value.toFixed(2)),
      ]),
    );

    answer(rounded);

    expect(cannon.message).toEqual({ text: "Correct!", correct: true });
    expect(progress.recordAttempt).toHaveBeenCalledTimes(1);
    expect(progress.recordAttempt.mock.calls[0][0].correct).toBe(true);
  });

  it("flies a too-slow horizontal velocity short of the net", () => {
    const { level, cannon, progress, answer } = playLevel();
    const expected = level.expectedUserInput;

    answer({
      ...expected,
      initialHorizontalVelocity: expected.initialHorizontalVelocity / 2,
    });

    expect(cannon.message?.text).toMatch(
      /^Landed \d+(\.\d)? m short of the net$/,
    );
    expect(progress.recordAttempt.mock.calls[0][0].correct).toBe(false);
  });

  it("floats a missing gravity out of the tent", () => {
    const { level, cannon, answer } = playLevel();

    answer({ ...level.expectedUserInput, verticalVelocityRate: 0 });

    expect(cannon.message?.correct).toBe(false);
    expect(cannon.message?.text).toMatch(/tent/);
  });
});

describe("Minigame 3 Level 2 playback, end to end (#142)", () => {
  const playLevel = () => playCannonLevel(2);
  const rounded = (values: Readonly<Record<string, number>>) =>
    Object.fromEntries(
      Object.entries(values).map(([field, value]) => [
        field,
        Number(value.toFixed(2)),
      ]),
    );

  it("pauses the right answer, rounded to two places, at t with the marker on the ball", () => {
    const { level, cannon, progress, answer } = playLevel();

    answer(rounded(level.expectedUserInput));

    expect(cannon.pause?.timeLabel).toBe(
      `At t = ${level.problemStatementVariablesValues.time} s`,
    );
    expect(cannon.pause?.horizontal.label).toBe("Δx");
    expect(cannon.pause?.vertical.label).toBe("Δy");
    expect(cannon.pause?.guess?.x).toBeCloseTo(cannon.pause!.ball.x, 6);
    expect(cannon.pause?.guess?.y).toBeCloseTo(cannon.pause!.ball.y, 6);
    expect(cannon.message).toEqual({ text: "Correct!", correct: true });
    expect(progress.recordAttempt).toHaveBeenCalledTimes(1);
    expect(progress.recordAttempt.mock.calls[0][0].correct).toBe(true);
  });

  it("shows the gap and says how far a wrong Δx is", () => {
    const { level, cannon, progress, answer } = playLevel();
    const expected = rounded(level.expectedUserInput);

    answer({
      ...expected,
      horizontalDisplacement: expected.horizontalDisplacement + 2.3,
    });

    expect(cannon.pause?.guess?.x).toBeGreaterThan(cannon.pause!.ball.x);
    expect(cannon.message).toEqual({
      text: "Δx is 2.3 m too far",
      correct: false,
    });
    expect(progress.recordAttempt.mock.calls[0][0].correct).toBe(false);
  });

  it("says a wrong average vertical velocity, the usual sign slip", () => {
    const { level, cannon, answer } = playLevel();
    const expected = rounded(level.expectedUserInput);
    const v = level.problemStatementVariablesValues;
    // Adding g t / 2 instead of subtracting it.
    const slip =
      expected.averageVerticalVelocity + v.gravitationalAcceleration * v.time;

    answer({ ...expected, averageVerticalVelocity: slip });

    expect(cannon.message?.text).toMatch(
      /^Average vertical velocity is \d+(\.\d+)? m\/s too high$/,
    );
  });
});

describe("Minigame 3 Level 3 playback, end to end (#143)", () => {
  const playLevel = () => playCannonLevel(3);

  it("flies the right speed, rounded to two places, through the net", () => {
    const { level, cannon, progress, answer } = playLevel();

    answer({
      launchSpeed: Number(level.expectedUserInput.launchSpeed.toFixed(2)),
    });

    expect(cannon.message).toEqual({ text: "Correct!", correct: true });
    expect(progress.recordAttempt.mock.calls[0][0].correct).toBe(true);
  });

  it("says a too-slow speed passed below the net", () => {
    const { level, cannon, progress, answer } = playLevel();

    answer({ launchSpeed: level.expectedUserInput.launchSpeed - 1 });

    expect(cannon.message?.text).toMatch(
      /^Passed \d+(\.\d+)? m below the net$/,
    );
    expect(progress.recordAttempt.mock.calls[0][0].correct).toBe(false);
  });

  it("says a too-fast speed passed above the net", () => {
    const { level, cannon, answer } = playLevel();

    answer({ launchSpeed: level.expectedUserInput.launchSpeed + 1 });

    expect(cannon.message?.text).toMatch(
      /^Passed \d+(\.\d+)? m above the net$/,
    );
  });

  it("lands a speed far too slow short of the net", () => {
    const { cannon, answer } = playLevel();

    answer({ launchSpeed: 5 });

    expect(cannon.message?.text).toMatch(
      /^Landed \d+(\.\d)? m short of the net$/,
    );
  });
});

/** CoasterAnimation's drawing, recorded instead of drawn. */
class RecordingCoaster implements CoasterView {
  arrow: CoasterArrow | undefined;
  message: CoasterMessage | undefined;
  drawScene(): void {}
  drawTrail(): void {}
  showArrow(arrow: CoasterArrow | undefined): void {
    this.arrow = arrow;
  }
  showMessage(message: CoasterMessage | undefined): void {
    this.message = message;
  }
}

describe("Minigame 4 Level 1 playback, end to end (#139)", () => {
  function playLevel() {
    const level = new LevelDataConfigFactory().createLevelDataConfig(
      "circularMotion",
      1,
    );
    const buildRun = runBuilderFor(level);
    if (buildRun === undefined) throw new Error("level has no run builder");
    const frames = new ManualFrames();
    const coaster = new RecordingCoaster();
    const cart = { setLength: vi.fn(), moveTo: vi.fn() };
    const animation = new CoasterAnimation(
      coaster,
      cart,
      { width: 600, height: 300 },
      frames.schedule,
    );
    const progress = { recordAttempt: vi.fn() };
    const controller = new GameController(
      level,
      vi.fn(),
      new DefaultAnswerValidator(),
      vi.fn(),
      { animation, buildRun, progress },
    );
    const answer = (acceleration: string) => {
      controller.submitAnswer({
        gameId: "circularMotion",
        levelId: 1,
        fields: { acceleration },
      });
      frames.tick(0);
      frames.tick(60_000);
    };
    const { speed, radius } = level.problemStatementVariablesValues;
    return { level, coaster, cart, progress, answer, speed, radius };
  }

  it("keeps the right answer, rounded to two places, on the loop", () => {
    const { level, coaster, cart, progress, answer } = playLevel();
    const typed = level.expectedUserInput.acceleration.toFixed(2);

    answer(typed);

    expect(coaster.message).toEqual({ text: "Correct!", correct: true });
    expect(coaster.arrow?.label).toBe(`a = ${Number(typed)} m/s²`);
    // Last pose is on the floor, rolling right, past the loop.
    const [position, rotation] = cart.moveTo.mock.calls.at(-1)!;
    expect(position.x).toBeGreaterThan(300);
    expect(rotation).toBeGreaterThan(0);
    expect(rotation).toBeLessThan(90);
    expect(progress.recordAttempt).toHaveBeenCalledTimes(1);
    expect(progress.recordAttempt.mock.calls[0][0].correct).toBe(true);
  });

  it("swings half the acceleration wide off the loop", () => {
    const { level, coaster, progress, answer, speed, radius } = playLevel();

    answer(String(level.expectedUserInput.acceleration / 2));

    expect(coaster.message).toEqual({
      text: `Too small: at ${speed} m/s that only turns a ${2 * radius} m circle`,
      correct: false,
    });
    expect(progress.recordAttempt.mock.calls[0][0].correct).toBe(false);
  });

  it("cuts double the acceleration inside the loop", () => {
    const { level, coaster, answer, speed, radius } = playLevel();

    answer(String(level.expectedUserInput.acceleration * 2));

    expect(coaster.message?.text).toBe(
      `Too big: at ${speed} m/s that turns a tight ${Math.round((radius / 2) * 10) / 10} m circle`,
    );
  });
});

describe("Minigame 4 Level 3 playback, end to end (#145)", () => {
  function playLevel() {
    const level = new LevelDataConfigFactory().createLevelDataConfig(
      "circularMotion",
      3,
    );
    const buildRun = runBuilderFor(level);
    if (buildRun === undefined) throw new Error("level has no run builder");
    const frames = new ManualFrames();
    const coaster = new RecordingCoaster();
    const cart = { setLength: vi.fn(), moveTo: vi.fn() };
    const animation = new CoasterAnimation(
      coaster,
      cart,
      { width: 600, height: 300 },
      frames.schedule,
    );
    const progress = { recordAttempt: vi.fn() };
    const controller = new GameController(
      level,
      vi.fn(),
      new DefaultAnswerValidator(),
      vi.fn(),
      { animation, buildRun, progress },
    );
    const answer = (minimumSpeed: string) => {
      controller.submitAnswer({
        gameId: "circularMotion",
        levelId: 3,
        fields: { minimumSpeed },
      });
      frames.tick(0);
      frames.tick(60_000);
    };
    const vMin = level.expectedUserInput.minimumSpeed;
    return { coaster, cart, progress, answer, vMin };
  }

  it("keeps the right answer, rounded to two places, on the track", () => {
    const { coaster, cart, progress, answer, vMin } = playLevel();

    // Rounding can land just under v_min; #114 plays the exact answer.
    answer(vMin.toFixed(2));

    expect(coaster.message).toEqual({
      text: "Correct minimum velocity. Roller coaster stays on the tracks.",
      correct: true,
    });
    // Last pose is on the floor past the loop, rolling down to the right.
    const [position, rotation] = cart.moveTo.mock.calls.at(-1)!;
    expect(position.x).toBeGreaterThan(300);
    expect(rotation).toBeGreaterThan(0);
    expect(rotation).toBeLessThan(90);
    expect(progress.recordAttempt.mock.calls[0][0].correct).toBe(true);
  });

  it("drops a speed 1 m/s too low off the track", () => {
    const { coaster, cart, progress, answer, vMin } = playLevel();

    answer(String(vMin - 1));

    expect(coaster.message).toEqual({
      text: "Incorrect minimum velocity. Roller coaster falls off the tracks.",
      correct: false,
    });
    // Still upside down where it lands inside the loop, left of center.
    const [position, rotation] = cart.moveTo.mock.calls.at(-1)!;
    expect(position.x).toBeLessThan(300);
    expect(Math.abs(rotation)).toBeCloseTo(180, 9);
    expect(progress.recordAttempt.mock.calls[0][0].correct).toBe(false);
  });

  it("keeps a speed 1 m/s too high on, but says it is too high", () => {
    const { coaster, answer, vMin } = playLevel();

    answer(String(vMin + 1));

    expect(coaster.message).toEqual({
      text: "Roller coaster stays on the tracks, but your value is too high.",
      correct: false,
    });
  });
});
