import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { AnswerValidationResult } from "../../model/AnswerValidator.ts";
import { withinTolerance } from "../../model/DefaultAnswerValidator.ts";
import type { SimulationState, Vec2 } from "../../model/SimulationState.ts";
import {
  COASTER_CART_ID,
  coasterTrack,
  forceLoop,
  minimumSpeedLoop,
  staysOnLoop,
  turnRadius,
  type CoasterTrack,
  type ForceLoop,
  type LoopTrack,
  type MinimumSpeedLoop,
} from "../../model/runs/circularMotionRun.ts";
import type { CrateBox, DiagramState, Force } from "../forces/ForceData.ts";
import type { AnimationEngine } from "./AnimationEngine.ts";
import type { FrameScheduler } from "./FrameScheduler.ts";
import { FramePlayback } from "./FramePlayback.ts";
import {
  fitScale,
  toRotation,
  toScreen,
  type WorldView,
} from "./worldToScreen.ts";

/** What the loop scene needs drawn, already in stage pixels. */
export interface CoasterScene {
  /** Top of the floor band. */
  readonly floorY: number;
  /** The loop's center and radius. */
  readonly loopCenter: Vec2;
  readonly loopRadius: number;
  /** The loop's bottom, where the ramps meet it. */
  readonly loopBottom: Vec2;
  /** Where the left ramp leaves the floor and the right ramp reaches it. */
  readonly rampStart: Vec2;
  readonly rampEnd: Vec2;
  /** The level's numbers, e.g. "20 m/s" and "r = 12 m", in order. */
  readonly labels: readonly string[];
}

/** The arrow at the top of the loop, in stage pixels. */
export interface CoasterArrow {
  readonly from: Vec2;
  readonly to: Vec2;
  /**
   * Level 1: the player's acceleration, e.g. "a = 33.33 m/s²".
   * Level 3: the normal force, "F_Normal".
   */
  readonly label: string;
}

/**
 * Level 2's forces on the cart at the top of the loop, for ForceRenderer
 * (#96), in stage pixels.
 */
export interface CoasterForces {
  /**
   * The box the arrows hang from: as tall as the upside-down cart, centred on
   * it and wider, so the two arrows are apart. Nothing draws it.
   */
  readonly cart: CrateBox;
  /** The longest arrow, in pixels. */
  readonly maxArrowLength: number;
  /** F_gravity and F_Normal, both down toward the loop's center. */
  readonly forces: readonly Force[];
  /** "?" labels before an answer, the typed sizes after. */
  readonly state: DiagramState;
}

export interface CoasterMessage {
  readonly text: string;
  readonly correct: boolean;
}

/**
 * Where CoasterAnimation draws the track (Humble Object). KonvaCoaster is the
 * real one; tests record the calls instead, so no canvas is needed.
 */
export interface CoasterView {
  drawScene(scene: CoasterScene): void;
  /** The dashed path ridden so far, in stage pixels; empty hides it. */
  drawTrail(points: readonly Vec2[]): void;
  /** Shows the arrow at the top of the loop; undefined hides it. */
  showArrow(arrow: CoasterArrow | undefined): void;
  /** Shows Level 2's force arrows on the cart; undefined hides them. */
  showForces(forces: CoasterForces | undefined): void;
  /** Shows a verdict over the scene; undefined hides it. */
  showMessage(message: CoasterMessage | undefined): void;
}

/** The cart: a block with two wheels. KonvaCoasterCart is the real one. */
export interface CartView {
  /** The cart's length in pixels, set once per level. */
  setLength(length: number): void;
  /**
   * Puts the cart's wheels on `position`, turned `rotationDeg` clockwise on
   * screen. At 0 the wheels are under the body.
   */
  moveTo(position: Vec2, rotationDeg: number): void;
}

/** Pixels kept clear at the top and sides of the stage. */
const MARGIN = 16;
/** Height of the floor band at the bottom of the stage, in pixels. */
const FLOOR = 28;
/** The cart's length, in loop radii (about the #110 mockup's). */
const CART_LENGTH = 0.5;
/** The cart's height from its wheels' bottom, in cart lengths (KonvaCoasterCart). */
const CART_HEIGHT = 0.56;
/**
 * Width of the box Level 2's arrows hang from, in cart lengths. ForceRenderer
 * spaces two arrows at 1/3 and 2/3 of it, so 2.4 puts them 0.4 cart lengths
 * either side of the middle: apart, but still under the cart's body.
 */
const FORCE_BOX_WIDTH = 2.4;
/** How far below the track the arrow starts, in cart lengths. */
const ARROW_GAP = 0.55;
/** The arrow's length, in loop radii. */
const ARROW_LENGTH = 0.45;

/** "4.7", "12", never "4.70" or "-0". */
function round(value: number, places: number): string {
  const f = 10 ** places;
  return String(Math.round(Math.abs(value) * f) / f);
}

/**
 * Level 2's answers in the #111 mockup's order, with the symbol the verdict
 * calls each one and what it should be when it is off.
 */
const LEVEL2_FIELDS = [
  ["acceleration", "a", "a should be v² / r"],
  ["netForce", "F_net", "F_net should equal F_N + F_g"],
  ["normalForce", "F_N", "F_N should be F_net − F_g"],
  ["gravitationalForce", "F_g", "F_g should be m × g"],
] as const;

/** Level 2's arrows: both hang from the cart's bottom, toward the center. */
const LEVEL2_FORCES = [
  ["gravitationalForce", "F_gravity", "left"],
  ["normalForce", "F_Normal", "right"],
] as const;

/**
 * The Breakout's roller coaster for Minigame 4 (#9, #139, #145). Frames come
 * from the circular motion run builders in meters with y up.
 *
 * Level 1: the cart climbs onto the loop and pauses at the top, where a green
 * arrow points to the center with the player's acceleration. A right answer
 * finishes the loop; a wrong one leaves it on the circle that acceleration
 * turns, and the verdict says how big that circle is.
 *
 * Level 2: the cart waits at the top under F_gravity and F_Normal arrows
 * labelled "?", drawn by ForceRenderer. Once the player answers, it climbs the
 * loop as in Level 1 and the arrows come back at the top, sized and labelled
 * with the typed forces. Its path turns the circle the typed net force gives,
 * r = m v² / F_net. The verdict marks each answer and says what is off.
 *
 * Level 3: the cart waits at the top under an F_Normal arrow until the player
 * answers, then goes over at the typed speed. The verdict says whether it
 * stayed on, fell off below v_min, or stayed on at more than the minimum.
 */
export class CoasterAnimation implements AnimationEngine {
  private readonly view: CoasterView;
  private readonly cart: CartView;
  private readonly stage: { readonly width: number; readonly height: number };
  private readonly playback: FramePlayback;
  private track: LoopTrack | undefined;
  /** Level 1's track, with its speed; undefined on Level 3. */
  private level1: CoasterTrack | undefined;
  /** Level 2's loop, mass and gravity, with its config; undefined otherwise. */
  private level2:
    { readonly loop: ForceLoop; readonly config: LevelDataConfig } | undefined;
  /** Level 3's loop, with v_min; undefined on Level 1. */
  private level3: MinimumSpeedLoop | undefined;
  private world: WorldView;
  private result: AnswerValidationResult | undefined;
  private states: readonly SimulationState[] = [];
  private trail: readonly Vec2[] = [];
  private arrowShown = false;
  private forcesShown = false;

  constructor(
    view: CoasterView,
    cart: CartView,
    stage: { readonly width: number; readonly height: number },
    schedule: FrameScheduler,
  ) {
    this.view = view;
    this.cart = cart;
    this.stage = stage;
    this.world = { scale: 1, origin: { x: 0, y: 0 }, yUp: true };
    this.playback = new FramePlayback((state) => this.draw(state), schedule);
    // Subscribed first, so the verdict is on screen before anyone else hears.
    this.playback.onPlaybackFinished(() => this.showVerdict());
  }

  /**
   * Throws a RangeError when the level has no valid radius, or no valid speed
   * (Levels 1 and 2), mass (Level 2) or gravity (Levels 2 and 3).
   */
  showLevel(level: LevelDataConfig): void {
    if (level.levelId === 2) {
      const loop = forceLoop(level);
      this.level1 = undefined;
      this.level2 = { loop, config: level };
      this.level3 = undefined;
      const { track } = loop;
      this.drawTrack(track, [
        `${track.speed} m/s`,
        `m = ${loop.mass} kg`,
        `r = ${track.radius} m`,
        `g = ${loop.gravity} m/s²`,
      ]);
      // Waiting at the top, upside down, under the forces to label.
      this.cart.moveTo(
        toScreen(this.world, track.top),
        toRotation(this.world, Math.PI),
      );
      this.setForces(true, track);
      return;
    }
    if (level.levelId === 3) {
      const loop = minimumSpeedLoop(level);
      this.level1 = undefined;
      this.level2 = undefined;
      this.level3 = loop;
      const { mass } = level.problemStatementVariablesValues;
      this.drawTrack(loop.track, [
        ...(Number.isFinite(mass) ? [`m = ${mass} kg`] : []),
        `r = ${loop.track.radius} m`,
        `g = ${loop.gravity} m/s²`,
      ]);
      // Waiting at the top, upside down, under the normal force's arrow.
      this.cart.moveTo(
        toScreen(this.world, loop.track.top),
        toRotation(this.world, Math.PI),
      );
      this.setArrow(true, loop.track);
      return;
    }
    const track = coasterTrack(level);
    this.level1 = track;
    this.level2 = undefined;
    this.level3 = undefined;
    this.drawTrack(track, [`${track.speed} m/s`, `r = ${track.radius} m`]);
    this.cart.moveTo(
      toScreen(this.world, track.rampStart),
      toRotation(
        this.world,
        Math.atan2(
          track.bottom.y - track.rampStart.y,
          track.bottom.x - track.rampStart.x,
        ),
      ),
    );
  }

  /** Fits and draws the track, clears the overlays and sizes the cart. */
  private drawTrack(track: LoopTrack, labels: readonly string[]): void {
    this.track = track;
    this.result = undefined;
    this.world = this.worldFor(track);
    const screen = (p: Vec2) => toScreen(this.world, p);
    this.view.drawScene({
      floorY: screen({ x: 0, y: 0 }).y,
      loopCenter: screen(track.center),
      loopRadius: track.radius * this.world.scale,
      loopBottom: screen(track.bottom),
      rampStart: screen(track.rampStart),
      rampEnd: screen(track.rampEnd),
      labels,
    });
    this.hideOverlays();
    this.cart.setLength(CART_LENGTH * track.radius * this.world.scale);
  }

  showResult(result: AnswerValidationResult): void {
    this.result = result;
  }

  play(states: readonly SimulationState[]): void {
    this.states = states;
    this.trail = states.map((state) =>
      toScreen(this.world, this.cartIn(state)?.position ?? { x: 0, y: 0 }),
    );
    this.hideOverlays();
    this.playback.play(states);
  }

  stop(): void {
    this.playback.stop();
  }

  replay(): void {
    this.hideOverlays();
    this.playback.replay();
  }

  onPlaybackFinished(listener: () => void): () => void {
    return this.playback.onPlaybackFinished(listener);
  }

  /** Fits the whole stage, edge to edge and floor to top, on screen. */
  private worldFor(track: LoopTrack): WorldView {
    const scale = fitScale(
      { width: track.rightX - track.leftX, height: track.ceilingY },
      {
        width: Math.max(this.stage.width - 2 * MARGIN, 0),
        height: Math.max(this.stage.height - MARGIN - FLOOR, 0),
      },
    );
    return {
      scale,
      origin: { x: this.stage.width / 2, y: this.stage.height - FLOOR },
      yUp: true,
    };
  }

  private hideOverlays(): void {
    this.view.showMessage(undefined);
    this.view.showArrow(undefined);
    this.view.showForces(undefined);
    this.view.drawTrail([]);
    this.arrowShown = false;
    this.forcesShown = false;
  }

  private cartIn(state: SimulationState) {
    return state.objects[COASTER_CART_ID];
  }

  private draw(state: SimulationState): void {
    const cart = this.cartIn(state);
    if (cart === undefined) return;
    this.cart.moveTo(
      toScreen(this.world, cart.position),
      toRotation(this.world, cart.angle),
    );
    const index = this.states.indexOf(state);
    this.view.drawTrail(this.trail.slice(0, index + 1));
    const track = this.track;
    if (track === undefined) return;
    if (this.level3 !== undefined) {
      // Under the waiting cart, gone once it moves.
      this.setArrow(state.timeMs === 0, track);
    } else if (this.level2 !== undefined) {
      if (state.timeMs >= track.topS * 1000) this.setForces(true, track);
    } else if (state.timeMs >= track.topS * 1000) {
      this.setArrow(true, track);
    }
  }

  private setArrow(shown: boolean, track: LoopTrack): void {
    if (shown === this.arrowShown) return;
    this.arrowShown = shown;
    this.view.showArrow(shown ? this.arrowFor(track) : undefined);
  }

  private setForces(shown: boolean, track: LoopTrack): void {
    if (shown === this.forcesShown) return;
    this.forcesShown = shown;
    this.view.showForces(shown ? this.forcesFor(track) : undefined);
  }

  /**
   * F_gravity and F_Normal from the bottom of the upside-down cart at the
   * top. Before an answer both read "?"; after, each takes the typed size, and
   * a typed force that is not a finite number > 0 has no arrow.
   */
  private forcesFor(track: LoopTrack): CoasterForces {
    const top = toScreen(this.world, track.top);
    const pixelsPerRadius = track.radius * this.world.scale;
    const length = CART_LENGTH * pixelsPerRadius;
    const typed = this.result?.submittedAnswer.values;
    const forces: Force[] = [];
    for (const [field, label, labelPosition] of LEVEL2_FORCES) {
      const base = {
        label,
        side: "bottom",
        pointing: "away",
        labelPosition,
      } as const;
      if (typed === undefined) {
        forces.push(base);
        continue;
      }
      const size = typed[field];
      if (Number.isFinite(size) && size > 0) forces.push({ ...base, size });
    }
    return {
      cart: {
        x: top.x - (FORCE_BOX_WIDTH * length) / 2,
        y: top.y,
        width: FORCE_BOX_WIDTH * length,
        height: CART_HEIGHT * length,
      },
      maxArrowLength: ARROW_LENGTH * pixelsPerRadius,
      forces,
      state: typed === undefined ? "beforeAnswer" : "afterAnswer",
    };
  }

  /** Down from just under the cart at the top, toward the loop's center. */
  private arrowFor(track: LoopTrack): CoasterArrow {
    const top = toScreen(this.world, track.top);
    const pixelsPerRadius = track.radius * this.world.scale;
    const fromY = top.y + ARROW_GAP * CART_LENGTH * pixelsPerRadius;
    const a = this.result?.submittedAnswer.values.acceleration;
    return {
      from: { x: top.x, y: fromY },
      to: { x: top.x, y: fromY + ARROW_LENGTH * pixelsPerRadius },
      label:
        this.level3 !== undefined
          ? "F_Normal"
          : Number.isFinite(a)
            ? `a = ${round(a!, 2)} m/s²`
            : "a",
    };
  }

  private showVerdict(): void {
    const result = this.result;
    if (result === undefined) return;
    if (this.level3 !== undefined) {
      this.view.showMessage(this.minimumSpeedVerdict(this.level3, result));
      return;
    }
    if (this.level2 !== undefined) {
      this.view.showMessage(this.forcesVerdict(this.level2, result));
      return;
    }
    if (result.correct) {
      this.view.showMessage({ text: "Correct!", correct: true });
      return;
    }
    this.view.showMessage({
      text: this.missText(result.submittedAnswer.values.acceleration),
      correct: false,
    });
  }

  /** Level 3: whether the typed speed stays on, as in the #112 mockup. */
  private minimumSpeedVerdict(
    loop: MinimumSpeedLoop,
    result: AnswerValidationResult,
  ): CoasterMessage {
    if (result.correct) {
      return {
        text: "Correct minimum velocity. Roller coaster stays on the tracks.",
        correct: true,
      };
    }
    const speed = result.submittedAnswer.values.minimumSpeed;
    if (!(Number.isFinite(speed) && speed >= 0)) {
      return { text: "Not quite", correct: false };
    }
    return {
      text: staysOnLoop(speed, loop)
        ? "Roller coaster stays on the tracks, but your value is too high."
        : "Incorrect minimum velocity. Roller coaster falls off the tracks.",
      correct: false,
    };
  }

  /**
   * Level 2: what the typed net force did and the first answer that is off,
   * over each answer marked as in the #111 mockup. Two short lines, so the
   * banner stays clear of the arrows' labels on a small stage, e.g.
   * "Too little net force. F_net should equal F_N + F_g" over
   * "a ✓ · F_net ✗ · F_N ✓ · F_g ✓". The path shows how far off it went.
   */
  private forcesVerdict(
    level2: { readonly loop: ForceLoop; readonly config: LevelDataConfig },
    result: AnswerValidationResult,
  ): CoasterMessage {
    if (result.correct) {
      return { text: "Correct! The cart finishes the loop.", correct: true };
    }
    const values = result.submittedAnswer.values;
    if (!LEVEL2_FIELDS.every(([field]) => Number.isFinite(values[field]))) {
      return { text: "Not quite", correct: false };
    }
    const { config, loop } = level2;
    const right = LEVEL2_FIELDS.map(([field]) =>
      withinTolerance(
        values[field],
        config.expectedUserInput[field],
        config.toleranceRule,
      ),
    );
    const marks = LEVEL2_FIELDS.map(
      ([, symbol], i) => `${symbol} ${right[i] ? "✓" : "✗"}`,
    ).join(" · ");
    const firstOff = right.indexOf(false);
    // Every answer within tolerance but still refused: nothing to point at.
    if (firstOff === -1) return { text: `Not quite\n${marks}`, correct: false };
    const hint = LEVEL2_FIELDS[firstOff][2];
    const path = right[1]
      ? "The cart stays on the loop"
      : this.netForceText(loop, values.netForce);
    return { text: `${path}. ${hint}\n${marks}`, correct: false };
  }

  /** Whether a wrong net force is too little, too much or none at all. */
  private netForceText(loop: ForceLoop, netForce: number): string {
    if (!(netForce > 0)) return "No net force";
    const { speed, radius } = loop.track;
    return turnRadius(speed, netForce / loop.mass) > radius
      ? "Too little net force"
      : "Too much net force";
  }

  /** What the typed acceleration does at this speed, in words. */
  private missText(acceleration: number | undefined): string {
    const track = this.level1;
    if (
      track === undefined ||
      acceleration === undefined ||
      !(Number.isFinite(acceleration) && acceleration >= 0)
    ) {
      return "Not quite";
    }
    if (acceleration === 0) {
      return "No acceleration: the cart flies straight off the loop";
    }
    const circle = turnRadius(track.speed, acceleration);
    // One decimal, or two when one would read the same as the loop.
    let size = round(circle, 1);
    if (size === round(track.radius, 1)) size = round(circle, 2);
    // The loop's radius is labelled on the stage, so the circle is enough.
    const at = `at ${track.speed} m/s`;
    return circle > track.radius
      ? `Too small: ${at} that only turns a ${size} m circle`
      : `Too big: ${at} that turns a tight ${size} m circle`;
  }
}
