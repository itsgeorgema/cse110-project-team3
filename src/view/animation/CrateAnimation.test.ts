import { beforeEach, describe, expect, it } from "vitest";
import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { AnswerValidationResult } from "../../model/AnswerValidator.ts";
import {
  buildNetForceLevel1Run,
  buildNetForceLevel2Run,
} from "../../model/runs/netForceRun.ts";
import {
  layoutForces,
  type DiagramState,
  type Force,
} from "../forces/ForceData.ts";
import {
  CrateAnimation,
  type CrateMessage,
  type CrateScene,
  type CrateView,
} from "./CrateAnimation.ts";
import { ManualFrames } from "./ManualFrames.ts";

/** Records what would be drawn, instead of drawing it. */
class RecordingCrate implements CrateView {
  scene: CrateScene | undefined;
  forces: readonly Force[] = [];
  state: DiagramState | undefined;
  readonly positions: { left: number; top: number }[] = [];
  message: CrateMessage | undefined;
  drawScene(scene: CrateScene): void {
    this.scene = scene;
  }
  drawForces(forces: readonly Force[], state: DiagramState): void {
    this.forces = forces;
    this.state = state;
  }
  moveCrate(left: number, top: number): void {
    this.positions.push({ left, top });
  }
  showMessage(message: CrateMessage | undefined): void {
    this.message = message;
  }
  get position() {
    return this.positions.at(-1);
  }
  /** The crate's front edge, which the line is drawn for. */
  get front(): number | undefined {
    const at = this.position;
    return at === undefined ? undefined : at.left + this.scene!.crateSize;
  }
  /** The labels ForceRenderer would draw, in the order given. */
  labels(): string[] {
    return layoutForces(this.forces, this.state!, {
      crate: { x: 0, y: 0, width: 40, height: 40 },
      maxArrowLength: 40,
    }).map((arrow) => arrow.labelText);
  }
}

const stage = { width: 600, height: 260 };

/** A 10 kg crate that should speed up at 3 m/s²: the right push is 30 N, the line 6 m away. */
const level1 = {
  gameId: "netForce",
  levelId: 1,
  problemStatementVariablesValues: { mass: 10, acceleration: 3 },
  expectedUserInput: { force: 30 },
  toleranceRule: { absolute: 0.00001 },
} as unknown as LevelDataConfig;

function push(force: number) {
  return {
    gameId: "netForce",
    levelId: 1,
    values: { force },
    units: { force: "N" },
  };
}

function verdict(force: number, correct: boolean): AnswerValidationResult {
  return { submittedAnswer: push(force), correct, feedback: "" };
}

describe("CrateAnimation, Level 1 (pushed crate)", () => {
  let frames: ManualFrames;
  let crate: RecordingCrate;
  let engine: CrateAnimation;
  let heard: number;

  beforeEach(() => {
    frames = new ManualFrames();
    crate = new RecordingCrate();
    engine = new CrateAnimation(crate, stage, frames.schedule);
    heard = 0;
    engine.onPlaybackFinished(() => heard++);
    engine.showLevel(level1);
  });

  /** Plays the player's push to the end: one refresh at 0 ms, one past the end. */
  function playToEnd(force: number, correct = false): void {
    engine.showResult(verdict(force, correct));
    engine.play(buildNetForceLevel1Run(push(force), level1));
    frames.tick(0);
    frames.tick(5000);
  }

  it("draws the floor, the line and the level's numbers before any answer", () => {
    const scene = crate.scene!;
    expect(scene.label).toBe("10 kg at 3 m/s² for 2 s");
    expect(scene.finishX).toBeGreaterThan(scene.startX);
    expect(scene.finishX).toBeLessThan(stage.width);
    expect(scene.gateX).toBe(scene.finishX);
    expect(scene.groundY).toBeLessThan(stage.height);
    // The floor is deep enough for the gravity arrow below the crate.
    expect(stage.height - scene.groundY).toBeGreaterThan(scene.maxArrowLength);
    expect(crate.message).toBeUndefined();
  });

  it("sits the crate at rest on the floor at the start", () => {
    const scene = crate.scene!;
    expect(crate.front).toBe(scene.startX);
    expect(crate.position?.top).toBe(scene.groundY - scene.crateSize);
  });

  it("leaves room on the left for the push arrow and its label", () => {
    const scene = crate.scene!;
    const crateLeft = scene.startX - scene.crateSize;
    // The label is right-aligned at the arrow's tail; ~105 px for "F_push = 150 N".
    expect(crateLeft - scene.maxArrowLength).toBeGreaterThanOrEqual(105);
  });

  it("fits the crate and its arrows above and below to a phone-sized stage", () => {
    const phone = new RecordingCrate();
    new CrateAnimation(
      phone,
      { width: 320, height: 240 },
      frames.schedule,
    ).showLevel(level1);
    const scene = phone.scene!;
    const crateTop = scene.groundY - scene.crateSize;

    expect(crateTop - scene.maxArrowLength).toBeGreaterThan(90);
    expect(scene.groundY + scene.maxArrowLength).toBeLessThan(240);
    expect(scene.finishX).toBeLessThan(320);
    expect(scene.finishX).toBeGreaterThan(scene.startX);
  });

  it("shows only the unlabelled push before an answer", () => {
    expect(crate.state).toBe("beforeAnswer");
    expect(crate.forces).toEqual([
      expect.objectContaining({
        label: "F_push",
        side: "left",
        pointing: "into",
      }),
    ]);
    expect(crate.labels()).toEqual(["F_push = ?"]);
  });

  it("labels the typed push, gravity and the normal force once answered", () => {
    engine.showResult(verdict(25, false));

    expect(crate.state).toBe("afterAnswer");
    expect(crate.labels()).toEqual([
      "F_g = 98.1 N",
      "F_N = 98.1 N",
      "F_push = 25 N",
    ]);
    expect(crate.forces.map((force) => [force.side, force.pointing])).toEqual([
      ["bottom", "away"],
      ["top", "away"],
      ["left", "into"],
    ]);
  });

  it("draws no push arrow for a push of 0", () => {
    engine.showResult(verdict(0, false));

    expect(crate.labels()).toEqual(["F_g = 98.1 N", "F_N = 98.1 N"]);
  });

  it("stops the right push on the line and says so at the end", () => {
    engine.showResult(verdict(30, true));
    engine.play(buildNetForceLevel1Run(push(30), level1));
    frames.tick(0);
    expect(crate.message).toBeUndefined();

    frames.tick(5000);

    expect(crate.front).toBeCloseTo(crate.scene!.finishX!, 6);
    expect(crate.message).toEqual({ text: "Correct!", correct: true });
    expect(heard).toBe(1);
  });

  it("keeps the crate on the floor the whole push", () => {
    playToEnd(30, true);

    const top = crate.scene!.groundY - crate.scene!.crateSize;
    expect(crate.positions.every((at) => at.top === top)).toBe(true);
  });

  it("says how far short a weak push stops", () => {
    playToEnd(20);

    expect(crate.front).toBeLessThan(crate.scene!.finishX!);
    expect(crate.message).toEqual({ text: "Short by 2 m", correct: false });
  });

  it("says how far past the line a strong push goes", () => {
    playToEnd(40);

    expect(crate.front).toBeGreaterThan(crate.scene!.finishX!);
    expect(crate.message).toEqual({ text: "Past by 2 m", correct: false });
  });

  it("keeps a huge push's crate on the stage", () => {
    playToEnd(5000);

    expect(crate.message?.text).toBe("Past by 994 m");
    expect(crate.position!.left + crate.scene!.crateSize).toBe(stage.width);
  });

  it("keeps a backward push's crate on the stage", () => {
    playToEnd(-500);

    expect(crate.position?.left).toBe(0);
    expect(crate.message?.text).toMatch(/^Short by /);
  });

  it("rounds the gap to one decimal", () => {
    // 29 N on 10 kg is 2.9 m/s², so 5.8 m: 0.2 m short.
    playToEnd(29);

    expect(crate.message?.text).toBe("Short by 0.2 m");
  });

  it("gives two places for a miss that one place would round to 0", () => {
    // 29.9 N reaches 5.98 m.
    playToEnd(29.9);

    expect(crate.message?.text).toBe("Short by 0.02 m");
  });

  it("says just short or just past for a miss under a centimeter", () => {
    playToEnd(29.999);
    expect(crate.message?.text).toBe("Just short of the line");

    playToEnd(30.001);
    expect(crate.message?.text).toBe("Just past the line");
  });

  it("hides the verdict while a replay runs and shows it again at the end", () => {
    playToEnd(20);

    engine.replay();
    expect(crate.message).toBeUndefined();
    expect(crate.front).toBe(crate.scene!.startX);
    frames.tick(6000);
    frames.tick(9000);

    expect(crate.message?.text).toBe("Short by 2 m");
    expect(heard).toBe(2);
  });

  it("shows no verdict after stop()", () => {
    engine.showResult(verdict(20, false));
    engine.play(buildNetForceLevel1Run(push(20), level1));
    engine.stop();
    frames.tick(5000);

    expect(crate.message).toBeUndefined();
    expect(heard).toBe(0);
  });

  it("shows no verdict for a run played without one", () => {
    engine.play(buildNetForceLevel1Run(push(20), level1));
    frames.tick(0);
    frames.tick(5000);

    expect(crate.message).toBeUndefined();
    expect(heard).toBe(1);
  });

  it("goes back to the unlabelled diagram and forgets the verdict on a new level", () => {
    playToEnd(20);
    engine.showLevel(level1);

    expect(crate.labels()).toEqual(["F_push = ?"]);
    engine.play(buildNetForceLevel1Run(push(20), level1));
    frames.tick(6000);
    frames.tick(9000);

    expect(crate.message).toBeUndefined();
  });

  it("ignores a frame without the crate", () => {
    const before = crate.positions.length;
    engine.play([{ step: 0, timeMs: 0, objects: {} }]);
    frames.tick(0);

    expect(crate.positions).toHaveLength(before);
  });

  it("has no line, no forces and says only 'Not quite' on a level it does not know", () => {
    engine.showLevel({ ...level1, levelId: 9 });

    expect(crate.scene?.finishX).toBeUndefined();
    expect(crate.scene?.gateX).toBeUndefined();
    expect(crate.scene?.label).toBe("");
    expect(crate.forces).toEqual([]);
    playToEnd(20);

    expect(crate.forces).toEqual([]);
    expect(crate.message).toEqual({ text: "Not quite", correct: false });
  });

  it("has no line on a Level 1 whose acceleration is unusable", () => {
    engine.showLevel({
      ...level1,
      problemStatementVariablesValues: { mass: 10, acceleration: 0 },
    });

    expect(crate.scene?.finishX).toBeUndefined();
  });

  it("draws no gravity or normal force for a level without a usable mass", () => {
    engine.showLevel({
      ...level1,
      problemStatementVariablesValues: { mass: Number.NaN, acceleration: 3 },
    });
    engine.showResult(verdict(25, false));

    expect(crate.labels()).toEqual(["F_push = 25 N"]);
  });
});

/** A 10 kg crate at rest: F_g = F_N = 98.1 N, net force 0. */
const level2 = {
  gameId: "netForce",
  levelId: 2,
  problemStatementVariablesValues: {
    mass: 10,
    gravitationalAcceleration: 9.81,
  },
  expectedUserInput: {
    gravitationalForce: 98.1,
    normalForce: 98.1,
    netForce: 0,
  },
  toleranceRule: { absolute: 0.00001 },
} as unknown as LevelDataConfig;

function rest(gravitationalForce: number, normalForce: number, netForce = 0) {
  return {
    gameId: "netForce",
    levelId: 2,
    values: { gravitationalForce, normalForce, netForce },
    units: { gravitationalForce: "N", normalForce: "N", netForce: "N" },
  };
}

describe("CrateAnimation, Level 2 (resting crate)", () => {
  let frames: ManualFrames;
  let crate: RecordingCrate;
  let engine: CrateAnimation;
  let heard: number;

  beforeEach(() => {
    frames = new ManualFrames();
    crate = new RecordingCrate();
    engine = new CrateAnimation(crate, stage, frames.schedule);
    heard = 0;
    engine.onPlaybackFinished(() => heard++);
    engine.showLevel(level2);
  });

  const restTop = () => crate.scene!.groundY - crate.scene!.crateSize;

  /** Plays the typed forces: one refresh at 0 ms, one at `ms`, then past the end. */
  function play(
    values: ReturnType<typeof rest>,
    correct = false,
    ms?: number,
  ): void {
    engine.showResult({ submittedAnswer: values, correct, feedback: "" });
    engine.play(buildNetForceLevel2Run(values, level2));
    frames.tick(0);
    if (ms !== undefined) frames.tick(ms);
    else frames.tick(5000);
  }

  it("draws the crate at rest in front of the gate, with no line", () => {
    const scene = crate.scene!;
    expect(scene.label).toBe("10 kg crate at rest, g = 9.81 m/s²");
    expect(scene.finishX).toBeUndefined();
    expect(scene.gateX).toBeGreaterThan(scene.startX);
    expect(scene.gateX).toBeLessThan(stage.width);
    expect(crate.front).toBe(scene.startX);
    expect(crate.position?.top).toBe(restTop());
    expect(crate.message).toBeUndefined();
  });

  it("labels F_g and F_N with ? before an answer, and draws no net force", () => {
    expect(crate.state).toBe("beforeAnswer");
    expect(crate.labels()).toEqual(["F_g = ?", "F_N = ?"]);
    expect(crate.forces.map((force) => [force.side, force.pointing])).toEqual([
      ["bottom", "away"],
      ["top", "away"],
    ]);
  });

  it("shows the typed values once answered, still with no net force arrow", () => {
    engine.showResult({
      submittedAnswer: rest(98.1, 90, 8.1),
      correct: false,
      feedback: "",
    });

    expect(crate.state).toBe("afterAnswer");
    expect(crate.labels()).toEqual(["F_g = 98.1 N", "F_N = 90 N"]);
  });

  it("draws no arrow for a typed force of 0", () => {
    engine.showResult({
      submittedAnswer: rest(98.1, 0),
      correct: false,
      feedback: "",
    });

    expect(crate.labels()).toEqual(["F_g = 98.1 N"]);
  });

  it("keeps the right answer still and says the forces balance", () => {
    play(rest(98.1, 98.1), true);

    expect(crate.positions.every((at) => at.top === restTop())).toBe(true);
    expect(crate.message).toEqual({
      text: "Balanced: net force = 0 N",
      correct: true,
    });
    expect(heard).toBe(1);
  });

  it("lifts the crate off when F_N is too big, then puts it back", () => {
    // 10 N too much on 10 kg: 1 m/s², 0.5 m up after 1 s; one crate size per meter.
    play(rest(98.1, 108.1), false, 1000);

    expect(crate.position?.top).toBeCloseTo(
      restTop() - 0.5 * crate.scene!.crateSize,
      6,
    );
    expect(crate.message).toBeUndefined();

    frames.tick(5000);

    expect(crate.position?.top).toBe(restTop());
    expect(crate.message).toEqual({
      text: "F_N is 10 N too high",
      correct: false,
    });
  });

  it("sinks the crate into the floor when F_N is too small", () => {
    play(rest(98.1, 93.1), false, 1000);

    expect(crate.position!.top).toBeGreaterThan(restTop());

    frames.tick(5000);

    expect(crate.message?.text).toBe("F_N is 5 N too low");
  });

  it("sinks no deeper than half the crate, so the gravity label stays on stage", () => {
    play(rest(98.1, 0), false, 1000);

    expect(crate.position?.top).toBe(restTop() + crate.scene!.crateSize / 2);
    // F_g's label sits beside the middle of its arrow.
    const labelY =
      crate.position!.top +
      crate.scene!.crateSize +
      crate.scene!.maxArrowLength / 2;
    expect(labelY).toBeLessThan(stage.height - 10);
  });

  it("keeps a lifted crate's arrow under the level's numbers", () => {
    play(rest(0, 5000), false, 1000);

    expect(crate.position!.top - crate.scene!.maxArrowLength).toBe(34);
  });

  it("says when gravity is off, too high or too low", () => {
    // Both wrong by the same amount: balanced, so the crate stays still.
    play(rest(108.1, 108.1));

    expect(crate.positions.every((at) => at.top === restTop())).toBe(true);
    expect(crate.message?.text).toBe(
      "F_g is 10 N too high\nF_N is 10 N too high",
    );

    play(rest(9.8, 9.8));
    expect(crate.message?.text).toBe(
      "F_g is 88.3 N too low\nF_N is 88.3 N too low",
    );
  });

  it("gives a wrong net force its own message", () => {
    play(rest(98.1, 98.1, 98.1));

    expect(crate.message).toEqual({
      text: "A crate at rest has no net force",
      correct: false,
    });
  });

  it("lists every wrong answer, one per line, in the order asked", () => {
    play(rest(100, 50, -50));

    expect(crate.message?.text).toBe(
      [
        "F_g is 1.9 N too high",
        "F_N is 48.1 N too low",
        "A crate at rest has no net force",
      ].join("\n"),
    );
  });

  it("gives two places for a miss that one place would round to 0", () => {
    play(rest(98.13, 98.1));

    expect(crate.message?.text).toBe("F_g is 0.03 N too high");
  });

  it("uses the level's tolerance, absolute and relative", () => {
    const loose = {
      ...level2,
      toleranceRule: { absolute: 0.5, relative: 0.05 },
    } as LevelDataConfig;
    engine.showLevel(loose);
    // 98.1 ± (0.5 + 4.905): 103 is in, 104 is out.
    engine.showResult({
      submittedAnswer: rest(103, 104, 0.4),
      correct: false,
      feedback: "",
    });
    engine.play(buildNetForceLevel2Run(rest(103, 104, 0.4), loose));
    frames.tick(0);
    frames.tick(5000);

    expect(crate.message?.text).toBe("F_N is 5.9 N too high");
  });

  it("says only 'Not quite' when no single answer is outside the tolerance", () => {
    play(rest(98.1, 98.1));

    expect(crate.message).toEqual({ text: "Not quite", correct: false });
  });

  it("skips answers missing from the submission", () => {
    engine.showResult({
      submittedAnswer: { ...rest(1, 1), values: { normalForce: 1 } },
      correct: false,
      feedback: "",
    });
    engine.play(buildNetForceLevel2Run(rest(98.1, 1), level2));
    frames.tick(0);
    frames.tick(5000);

    expect(crate.message?.text).toBe("F_N is 97.1 N too low");
  });

  it("hides the verdict while a replay runs and shows it again at the end", () => {
    play(rest(98.1, 108.1));

    engine.replay();
    expect(crate.message).toBeUndefined();
    frames.tick(6000);
    frames.tick(9000);

    expect(crate.message?.text).toBe("F_N is 10 N too high");
    expect(heard).toBe(2);
  });

  it("goes back to the ? labels on a new level", () => {
    play(rest(98.1, 108.1));
    engine.showLevel(level2);

    expect(crate.labels()).toEqual(["F_g = ?", "F_N = ?"]);
    expect(crate.message).toBeUndefined();
  });

  it("keeps the crate at rest on a stage too short to lift it", () => {
    const short = new RecordingCrate();
    new CrateAnimation(
      short,
      { width: 300, height: 120 },
      frames.schedule,
    ).showLevel(level2);

    expect(short.position?.top).toBe(
      short.scene!.groundY - short.scene!.crateSize,
    );
  });
});
