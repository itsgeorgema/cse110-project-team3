import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { AnswerValidationResult } from "../../model/AnswerValidator.ts";
import type { SimulationState } from "../../model/SimulationState.ts";
import {
  CRATE_ID,
  PUSH_SECONDS,
  STANDARD_GRAVITY,
  pushFinish,
} from "../../model/runs/netForceRun.ts";
import type { DiagramState, Force } from "../forces/ForceData.ts";
import type { AnimationEngine } from "./AnimationEngine.ts";
import type { FrameScheduler } from "./FrameScheduler.ts";
import { FramePlayback } from "./FramePlayback.ts";
import { toScreen, type WorldView } from "./worldToScreen.ts";

/** What the crate scene needs drawn, already in stage pixels. */
export interface CrateScene {
  /** The floor's top edge. The crate sits on it. */
  readonly groundY: number;
  /** The crate's size, which is also the free body diagram's crate. */
  readonly crateSize: number;
  /** The longest force arrow. */
  readonly maxArrowLength: number;
  /** Where the crate's front starts. */
  readonly startX: number;
  /** The line the crate's front must reach; undefined when the level has none. */
  readonly finishX: number | undefined;
  /** The gate post; undefined when the level has none. */
  readonly gateX: number | undefined;
  /** The level's given numbers, e.g. "10 kg at 3 m/s² for 2 s". */
  readonly label: string;
}

export interface CrateMessage {
  readonly text: string;
  readonly correct: boolean;
}

/**
 * Where CrateAnimation draws (Humble Object). KonvaCrate is the real one and
 * draws the crate with ForceRenderer (#102); tests record the calls instead.
 */
export interface CrateView {
  drawScene(scene: CrateScene): void;
  /** Redraws the free body diagram on the crate, wherever it is. */
  drawForces(forces: readonly Force[], state: DiagramState): void;
  /** Places the crate's top-left corner at this stage point. */
  moveCrate(left: number, top: number): void;
  /** Shows a verdict over the scene; undefined hides it. */
  showMessage(message: CrateMessage | undefined): void;
}

/** Pixels kept clear at each side of the stage. */
const MARGIN = 12;
/**
 * Room left of the push arrow for its label, which ForceRenderer right-aligns
 * at the arrow's tail: "F_push = 150 N" at 14 px is about 105 px wide.
 */
const PUSH_LABEL_ROOM = 112;
/** Empty floor left after Level 1's line, as a share of the distance to it. */
const RUN_OFF = 0.35;
/** The crate's size as a share of the stage's shorter side, and its limits. */
const CRATE_SHARE = 0.16;
const CRATE_MIN = 28;
const CRATE_MAX = 56;
/** The longest arrow, as a multiple of the crate's size. */
const ARROW_SHARE = 1.1;
/** The floor fits the gravity arrow below the crate, plus this much. */
const FLOOR_EXTRA = 14;
/** The row the level's numbers use at the top; a lifted crate's arrow stays below it. */
const LABEL_ROW = 34;
/** How far a sinking crate goes into the floor, as a share of its height. */
const MAX_SINK = 0.5;
/** Level 2's gate stands this many crate sizes past the crate's front. */
const REST_GATE_GAP = 0.75;

/** "4.7", "12", never "4.70" or "-0". */
function meters(value: number): string {
  return String(Math.round(Math.abs(value) * 10) / 10);
}

/** Like meters, with two places when one would read 0: "0.03". */
function smallMeters(value: number): string {
  const one = meters(value);
  return one === "0" ? String(Math.round(Math.abs(value) * 100) / 100) : one;
}

/** "9.8", "12", with two places when one would read 0: "0.05". */
const newtons = smallMeters;

/** A force arrow is drawn only for a finite size > 0, as ForceRenderer needs. */
function drawable(size: number | undefined): size is number {
  return typeof size === "number" && Number.isFinite(size) && size > 0;
}

// Gravity and the normal force label to the left, so the labels stay clear of
// the gate when the crate reaches it.
const gravity = (size?: number): Force => ({
  label: "F_g",
  size,
  side: "bottom",
  pointing: "away",
  labelPosition: "left",
});

const normal = (size?: number): Force => ({
  label: "F_N",
  size,
  side: "top",
  pointing: "away",
  labelPosition: "left",
});

const push = (size?: number): Force => ({
  label: "F_push",
  size,
  side: "left",
  pointing: "into",
  labelPosition: "above",
});

/**
 * Level 2's forces, in the order the verdict lists them, with the symbol the
 * diagram uses for each.
 */
const REST_FORCES = [
  ["gravitationalForce", "F_g"],
  ["normalForce", "F_N"],
] as const;

/**
 * What each level draws. Level 1 pushes the crate to a line; Level 2 keeps it
 * at rest by the gate; a level this engine does not know yet shows the crate
 * on the floor with no forces.
 */
type CrateLayout =
  | {
      readonly kind: "push";
      readonly level: LevelDataConfig;
      readonly finish: number;
    }
  | { readonly kind: "rest"; readonly level: LevelDataConfig }
  | { readonly kind: "plain" };

function layoutFor(level: LevelDataConfig): CrateLayout {
  if (level.levelId === 1) {
    try {
      return { kind: "push", level, finish: pushFinish(level) };
    } catch {
      // A level without a usable acceleration has no line to aim for.
    }
  }
  if (level.levelId === 2) return { kind: "rest", level };
  return { kind: "plain" };
}

/** The level's given numbers, shown above the floor. */
function sceneLabel(layout: CrateLayout): string {
  if (layout.kind === "plain") return "";
  const v = layout.level.problemStatementVariablesValues;
  return layout.kind === "push"
    ? `${v.mass} kg at ${v.acceleration} m/s² for ${PUSH_SECONDS} s`
    : `${v.mass} kg crate at rest, g = ${v.gravitationalAcceleration} m/s²`;
}

/** Inside the level's tolerance, as DefaultAnswerValidator checks it. */
function withinTolerance(
  level: LevelDataConfig,
  value: number,
  expected: number,
): boolean {
  const { absolute, relative = 0 } = level.toleranceRule;
  return Math.abs(value - expected) <= absolute + relative * Math.abs(expected);
}

/**
 * The net force crate for Minigame 2 (#140, #141). Frames come from the net force
 * run builders in meters, with the crate's front at x = 0 and its bottom at
 * y = 0 to start. The crate is the free body diagram's box, so its force
 * arrows travel with it: before an answer they read "= ?", and once the
 * answer is in they show the typed values.
 */
export class CrateAnimation implements AnimationEngine {
  private readonly view: CrateView;
  private readonly stage: { readonly width: number; readonly height: number };
  private readonly playback: FramePlayback;
  private layout: CrateLayout = { kind: "plain" };
  private world: WorldView = { scale: 1, origin: { x: 0, y: 0 }, yUp: true };
  private crateSize = CRATE_MIN;
  private maxArrowLength = CRATE_MIN;
  private groundY = 0;
  private result: AnswerValidationResult | undefined;
  private lastX = 0;

  constructor(
    view: CrateView,
    stage: { readonly width: number; readonly height: number },
    schedule: FrameScheduler,
  ) {
    this.view = view;
    this.stage = stage;
    this.playback = new FramePlayback((state) => this.draw(state), schedule);
    // Subscribed first, so the verdict is on screen before anyone else hears.
    this.playback.onPlaybackFinished(() => this.showVerdict());
  }

  showLevel(level: LevelDataConfig): void {
    this.layout = layoutFor(level);
    this.result = undefined;
    const { width, height } = this.stage;
    this.crateSize = Math.round(
      Math.min(
        Math.max(Math.min(width, height) * CRATE_SHARE, CRATE_MIN),
        CRATE_MAX,
      ),
    );
    const maxArrowLength = Math.round(this.crateSize * ARROW_SHARE);
    const groundY = height - maxArrowLength - FLOOR_EXTRA;
    this.maxArrowLength = maxArrowLength;
    this.groundY = groundY;

    let startX: number;
    let finishX: number | undefined;
    let gateX: number | undefined;
    // Level 2 moves up and down: one meter is one crate size.
    let scale = this.crateSize;
    if (this.layout.kind === "push") {
      startX = MARGIN + PUSH_LABEL_ROOM + maxArrowLength + this.crateSize;
      const room = Math.max(width - MARGIN - startX, 1);
      scale = room / (this.layout.finish * (1 + RUN_OFF));
      finishX = startX + this.layout.finish * scale;
      gateX = finishX;
    } else {
      startX = (width + this.crateSize) / 2;
      if (this.layout.kind === "rest") {
        gateX = startX + this.crateSize * REST_GATE_GAP;
      }
    }
    this.world = { scale, origin: { x: startX, y: groundY }, yUp: true };

    this.view.drawScene({
      groundY,
      crateSize: this.crateSize,
      maxArrowLength,
      startX,
      finishX,
      gateX,
      label: sceneLabel(this.layout),
    });
    this.view.drawForces(this.forces(undefined), "beforeAnswer");
    this.view.showMessage(undefined);
    this.placeCrate(0, 0);
  }

  /** Keeps the verdict for the end of the run, and labels the forces with the answer. */
  showResult(result: AnswerValidationResult): void {
    this.result = result;
    this.view.drawForces(
      this.forces(result.submittedAnswer.values),
      "afterAnswer",
    );
  }

  play(states: readonly SimulationState[]): void {
    this.view.showMessage(undefined);
    this.playback.play(states);
  }

  stop(): void {
    this.playback.stop();
  }

  replay(): void {
    this.view.showMessage(undefined);
    this.playback.replay();
  }

  onPlaybackFinished(listener: () => void): () => void {
    return this.playback.onPlaybackFinished(listener);
  }

  /**
   * The diagram's forces. Before an answer (`typed` undefined), only what the
   * player is asked for, unlabelled. After, the typed values, plus the
   * forces the level implies. A typed 0 or a non-finite value has no arrow.
   */
  private forces(
    typed: Readonly<Record<string, number>> | undefined,
  ): readonly Force[] {
    if (this.layout.kind === "plain") return [];
    if (this.layout.kind === "rest") {
      // No net force arrow: the crate at rest has none (PR #102's table).
      if (typed === undefined) return [gravity(), normal()];
      const forces: Force[] = [];
      if (drawable(typed.gravitationalForce)) {
        forces.push(gravity(typed.gravitationalForce));
      }
      if (drawable(typed.normalForce)) forces.push(normal(typed.normalForce));
      return forces;
    }
    if (typed === undefined) return [push()];
    const weight =
      this.layout.level.problemStatementVariablesValues.mass * STANDARD_GRAVITY;
    const forces: Force[] = [];
    if (drawable(weight)) forces.push(gravity(weight), normal(weight));
    if (drawable(typed.force)) forces.push(push(typed.force));
    return forces;
  }

  private draw(state: SimulationState): void {
    const crate = state.objects[CRATE_ID];
    if (crate !== undefined)
      this.placeCrate(crate.position.x, crate.position.y);
  }

  /**
   * Keeps the crate on the stage even when the player's numbers send it off:
   * a lifted crate's arrow stays below the level's numbers, and a sinking
   * crate goes no deeper than half its height into the floor, so the gravity
   * arrow and its label stay on the stage.
   */
  private placeCrate(x: number, y: number): void {
    this.lastX = x;
    const front = toScreen(this.world, { x, y });
    const left = Math.min(
      Math.max(front.x - this.crateSize, 0),
      this.stage.width - this.crateSize,
    );
    const rest = this.groundY - this.crateSize;
    const highest = Math.min(LABEL_ROW + this.maxArrowLength, rest);
    const top = Math.min(
      Math.max(front.y - this.crateSize, highest),
      rest + this.crateSize * MAX_SINK,
    );
    this.view.moveCrate(left, top);
  }

  private showVerdict(): void {
    const result = this.result;
    if (result === undefined) return;
    if (result.correct) {
      const text =
        this.layout.kind === "rest" ? "Balanced: net force = 0 N" : "Correct!";
      this.view.showMessage({ text, correct: true });
      return;
    }
    let text: string;
    switch (this.layout.kind) {
      case "push":
        text = this.pushMissText(this.layout.finish);
        break;
      case "rest":
        text = restMissText(this.layout.level, result.submittedAnswer.values);
        break;
      default:
        text = "Not quite";
    }
    this.view.showMessage({ text, correct: false });
  }

  /** Level 1: how far short of or past the line the player's push left the crate. */
  private pushMissText(finish: number): string {
    const gap = finish - this.lastX;
    const distance = smallMeters(gap);
    if (gap >= 0) {
      return distance === "0"
        ? "Just short of the line"
        : `Short by ${distance} m`;
    }
    return distance === "0" ? "Just past the line" : `Past by ${distance} m`;
  }
}

/**
 * Level 2: each answer outside the level's tolerance, one per line, in the
 * order asked, e.g. "F_N is 9.8 N too low". A non-zero net force gets its own
 * line, since a crate at rest has none.
 */
function restMissText(
  level: LevelDataConfig,
  typed: Readonly<Record<string, number>>,
): string {
  const lines: string[] = [];
  for (const [field, name] of REST_FORCES) {
    const value = typed[field];
    const expected = level.expectedUserInput[field];
    if (value === undefined || expected === undefined) continue;
    if (withinTolerance(level, value, expected)) continue;
    const gap = value - expected;
    lines.push(
      `${name} is ${newtons(gap)} N ${gap > 0 ? "too high" : "too low"}`,
    );
  }
  const net = typed.netForce;
  if (net !== undefined && !withinTolerance(level, net, 0)) {
    lines.push("A crate at rest has no net force");
  }
  return lines.length > 0 ? lines.join("\n") : "Not quite";
}
