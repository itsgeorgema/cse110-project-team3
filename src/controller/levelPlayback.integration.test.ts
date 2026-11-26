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
  type CoasterForces,
  type CoasterMessage,
  type CoasterView,
} from "../view/animation/CoasterAnimation.ts";
import {
  CrateAnimation,
  type CrateMessage,
  type CrateScene,
  type CrateView,
} from "../view/animation/CrateAnimation.ts";
import type { DiagramState, Force } from "../view/forces/ForceData.ts";
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
  forces: CoasterForces | undefined;
  message: CoasterMessage | undefined;
  drawScene(): void {}
  drawTrail(): void {}
  showArrow(arrow: CoasterArrow | undefined): void {
    this.arrow = arrow;
  }
  showForces(forces: CoasterForces | undefined): void {
    this.forces = forces;
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

describe("Minigame 4 Level 2 playback, end to end (#144)", () => {
  function playLevel() {
    const level = new LevelDataConfigFactory().createLevelDataConfig(
      "circularMotion",
      2,
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
    const expected = level.expectedUserInput;
    /** Submits the right answers, rounded to two places, with `changes`. */
    const answer = (changes: Record<string, number> = {}) => {
      const fields: Record<string, string> = {};
      for (const field of level.userInputVariables) {
        fields[field] = String(changes[field] ?? expected[field].toFixed(2));
      }
      controller.submitAnswer({ gameId: "circularMotion", levelId: 2, fields });
      frames.tick(0);
      frames.tick(60_000);
    };
    return { level, coaster, cart, progress, answer, expected };
  }

  it("shows F_gravity and F_Normal as ? at the top before an answer", () => {
    const { coaster } = playLevel();
    expect(coaster.forces?.state).toBe("beforeAnswer");
    expect(coaster.forces?.forces.map((f) => f.label)).toEqual([
      "F_gravity",
      "F_Normal",
    ]);
  });

  it("finishes the loop for the right answers, rounded to two places", () => {
    const { coaster, cart, progress, answer, expected } = playLevel();

    answer();

    expect(coaster.message).toEqual({
      text: "Correct! The cart finishes the loop.",
      correct: true,
    });
    // The arrows show the typed forces; only the path plays the exact ones (#114).
    expect(coaster.forces?.state).toBe("afterAnswer");
    expect(coaster.forces?.forces.map((f) => f.size)).toEqual([
      Number(expected.gravitationalForce.toFixed(2)),
      Number(expected.normalForce.toFixed(2)),
    ]);
    const [position, rotation] = cart.moveTo.mock.calls.at(-1)!;
    expect(position.x).toBeGreaterThan(300);
    expect(rotation).toBeGreaterThan(0);
    expect(rotation).toBeLessThan(90);
    expect(progress.recordAttempt.mock.calls[0][0].correct).toBe(true);
  });

  it("sends half the net force wide off the loop and names it", () => {
    const { coaster, cart, progress, answer, expected } = playLevel();

    answer({ netForce: expected.netForce / 2 });

    expect(coaster.message).toEqual({
      text:
        "Too little net force. F_net should equal F_N + F_g\n" +
        "a ✓ · F_net ✗ · F_N ✓ · F_g ✓",
      correct: false,
    });
    // Off the loop to the left, not down the right ramp.
    expect(cart.moveTo.mock.calls.at(-1)![0].x).toBeLessThan(300);
    expect(progress.recordAttempt.mock.calls[0][0].correct).toBe(false);
  });

  it("keeps the cart on for a wrong normal force, but marks it", () => {
    const { coaster, cart, answer, expected } = playLevel();

    answer({ normalForce: expected.normalForce + 100 });

    expect(coaster.message?.text).toBe(
      "The cart stays on the loop. F_N should be F_net − F_g\n" +
        "a ✓ · F_net ✓ · F_N ✗ · F_g ✓",
    );
    expect(coaster.forces?.forces[1].size).toBeCloseTo(
      expected.normalForce + 100,
      1,
    );
    expect(cart.moveTo.mock.calls.at(-1)![0].x).toBeGreaterThan(300);
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

/** CrateAnimation's drawing, recorded instead of drawn. */
class RecordingCrate implements CrateView {
  scene: CrateScene | undefined;
  forces: readonly Force[] = [];
  state: DiagramState | undefined;
  front: number | undefined;
  readonly tops: number[] = [];
  message: CrateMessage | undefined;
  drawScene(scene: CrateScene): void {
    this.scene = scene;
  }
  drawForces(forces: readonly Force[], state: DiagramState): void {
    this.forces = forces;
    this.state = state;
  }
  moveCrate(left: number, top: number): void {
    this.front = left + this.scene!.crateSize;
    this.tops.push(top);
  }
  showMessage(message: CrateMessage | undefined): void {
    this.message = message;
  }
}

/** A net force level with the real config, validator, registry and engine. */
function playNetForceLevel(levelId: 1 | 2) {
  const level = new LevelDataConfigFactory().createLevelDataConfig(
    "netForce",
    levelId,
  );
  const buildRun = runBuilderFor(level);
  if (buildRun === undefined) throw new Error("level has no run builder");
  const frames = new ManualFrames();
  const crate = new RecordingCrate();
  const animation = new CrateAnimation(
    crate,
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
  /** Plays an answer to the end, with an extra refresh at `midMs` if given. */
  const answer = (values: Readonly<Record<string, number>>, midMs?: number) => {
    controller.submitAnswer({
      gameId: "netForce",
      levelId,
      fields: Object.fromEntries(
        Object.entries(values).map(([field, value]) => [field, String(value)]),
      ),
    });
    frames.tick(0);
    if (midMs !== undefined) frames.tick(midMs);
    frames.tick(60_000);
  };
  return { level, crate, progress, answer };
}

describe("Minigame 2 Level 1 playback, end to end (#140)", () => {
  it("labels only the unknown push before an answer", () => {
    const { crate } = playNetForceLevel(1);

    expect(crate.state).toBe("beforeAnswer");
    expect(crate.forces.map((force) => force.label)).toEqual(["F_push"]);
    expect(crate.forces[0].size).toBeUndefined();
  });

  it("pushes the right force onto the line and labels the typed value", () => {
    const { level, crate, progress, answer } = playNetForceLevel(1);
    const { force } = level.expectedUserInput;

    answer({ force });

    expect(crate.front).toBeCloseTo(crate.scene!.finishX!, 6);
    expect(crate.message).toEqual({ text: "Correct!", correct: true });
    expect(crate.state).toBe("afterAnswer");
    expect(crate.forces.map((f) => [f.label, f.size])).toEqual([
      ["F_g", level.problemStatementVariablesValues.mass * 9.81],
      ["F_N", level.problemStatementVariablesValues.mass * 9.81],
      ["F_push", force],
    ]);
    expect(progress.recordAttempt).toHaveBeenCalledTimes(1);
    expect(progress.recordAttempt.mock.calls[0][0].correct).toBe(true);
  });

  it("stops a push of half the force halfway to the line", () => {
    const { level, crate, progress, answer } = playNetForceLevel(1);
    const { acceleration } = level.problemStatementVariablesValues;

    answer({ force: level.expectedUserInput.force / 2 });

    // Half the force covers half of a T² / 2 = 2a over 2 s: a m short.
    expect(crate.message).toEqual({
      text: `Short by ${acceleration} m`,
      correct: false,
    });
    expect(crate.front).toBeLessThan(crate.scene!.finishX!);
    expect(progress.recordAttempt.mock.calls[0][0].correct).toBe(false);
  });

  it("sends a push of mass times g, the usual mix-up, past the line", () => {
    const { level, crate, answer } = playNetForceLevel(1);
    const { mass } = level.problemStatementVariablesValues;

    answer({ force: mass * 9.81 });

    expect(crate.message?.text).toMatch(/^Past by \d+(\.\d)? m$/);
    expect(crate.message?.correct).toBe(false);
  });
});

describe("Minigame 2 Level 2 playback, end to end (#141)", () => {
  it("labels F_g and F_N with ? before an answer", () => {
    const { crate } = playNetForceLevel(2);

    expect(crate.state).toBe("beforeAnswer");
    expect(crate.forces.map((force) => [force.label, force.size])).toEqual([
      ["F_g", undefined],
      ["F_N", undefined],
    ]);
  });

  it("keeps the crate still for the right answer, rounded to two places", () => {
    const { level, crate, progress, answer } = playNetForceLevel(2);
    const rounded = Object.fromEntries(
      Object.entries(level.expectedUserInput).map(([field, value]) => [
        field,
        Number(value.toFixed(2)),
      ]),
    );

    answer(rounded);

    expect(crate.tops.every((top) => top === crate.tops[0])).toBe(true);
    expect(crate.message).toEqual({
      text: "Balanced: net force = 0 N",
      correct: true,
    });
    expect(crate.forces.map((force) => [force.label, force.size])).toEqual([
      ["F_g", rounded.gravitationalForce],
      ["F_N", rounded.normalForce],
    ]);
    expect(progress.recordAttempt).toHaveBeenCalledTimes(1);
    expect(progress.recordAttempt.mock.calls[0][0].correct).toBe(true);
  });

  it("sinks the crate for a normal force of 0, then says F_N is too low", () => {
    const { level, crate, progress, answer } = playNetForceLevel(2);
    const expected = level.expectedUserInput;
    const restTop = crate.tops[0];

    answer({ ...expected, normalForce: 0 }, 1000);

    expect(Math.max(...crate.tops)).toBeGreaterThan(restTop);
    expect(crate.tops.at(-1)).toBe(restTop);
    expect(crate.message).toEqual({
      text: `F_N is ${Math.round(expected.normalForce * 10) / 10} N too low`,
      correct: false,
    });
    expect(progress.recordAttempt.mock.calls[0][0].correct).toBe(false);
  });

  it("says a net force of m·g is wrong for a crate at rest", () => {
    const { level, crate, answer } = playNetForceLevel(2);
    const expected = level.expectedUserInput;

    answer({ ...expected, netForce: expected.gravitationalForce });

    expect(crate.message).toEqual({
      text: "A crate at rest has no net force",
      correct: false,
    });
  });
});
