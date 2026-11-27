import { beforeEach, describe, expect, it } from "vitest";
import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { AnswerValidationResult } from "../../model/AnswerValidator.ts";
import { buildNetForceLevel1Run } from "../../model/runs/netForceRun.ts";
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
