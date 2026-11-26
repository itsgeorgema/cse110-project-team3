import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { AnswerValidationResult } from "../../model/AnswerValidator.ts";
import type { SimulationState, Vec2 } from "../../model/SimulationState.ts";
import {
  COASTER_CART_ID,
  coasterTrack,
  turnRadius,
  type CoasterTrack,
} from "../../model/runs/circularMotionRun.ts";
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
  /** The level's numbers, e.g. "20 m/s" and "r = 12 m". */
  readonly speedLabel: string;
  readonly radiusLabel: string;
}

/** The acceleration arrow at the top of the loop, in stage pixels. */
export interface CoasterArrow {
  readonly from: Vec2;
  readonly to: Vec2;
  /** The player's acceleration, e.g. "a = 33.33 m/s²". */
  readonly label: string;
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
  /** Shows the acceleration arrow; undefined hides it. */
  showArrow(arrow: CoasterArrow | undefined): void;
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
 * The Breakout's roller coaster for Minigame 4 (#9, #139). Frames come from
 * the circular motion run builders in meters with y up. The cart climbs onto
 * the loop and pauses at the top, where a green arrow points to the center
 * with the player's acceleration. A right answer finishes the loop; a wrong
 * one leaves it on the circle that acceleration turns, and the verdict says
 * how big that circle is.
 */
export class CoasterAnimation implements AnimationEngine {
  private readonly view: CoasterView;
  private readonly cart: CartView;
  private readonly stage: { readonly width: number; readonly height: number };
  private readonly playback: FramePlayback;
  private track: CoasterTrack | undefined;
  private world: WorldView;
  private result: AnswerValidationResult | undefined;
  private states: readonly SimulationState[] = [];
  private trail: readonly Vec2[] = [];
  private arrowShown = false;

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

  /** Throws a RangeError when the level has no valid speed or radius. */
  showLevel(level: LevelDataConfig): void {
    const track = coasterTrack(level);
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
      speedLabel: `${track.speed} m/s`,
      radiusLabel: `r = ${track.radius} m`,
    });
    this.hideOverlays();
    this.cart.setLength(CART_LENGTH * track.radius * this.world.scale);
    this.cart.moveTo(
      screen(track.rampStart),
      toRotation(
        this.world,
        Math.atan2(
          track.bottom.y - track.rampStart.y,
          track.bottom.x - track.rampStart.x,
        ),
      ),
    );
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
  private worldFor(track: CoasterTrack): WorldView {
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
    this.view.drawTrail([]);
    this.arrowShown = false;
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
    if (
      !this.arrowShown &&
      track !== undefined &&
      state.timeMs >= track.topS * 1000
    ) {
      this.arrowShown = true;
      this.view.showArrow(this.arrowFor(track));
    }
  }

  /** Down from just under the cart at the top, toward the loop's center. */
  private arrowFor(track: CoasterTrack): CoasterArrow {
    const top = toScreen(this.world, track.top);
    const pixelsPerRadius = track.radius * this.world.scale;
    const fromY = top.y + ARROW_GAP * CART_LENGTH * pixelsPerRadius;
    const a = this.result?.submittedAnswer.values.acceleration;
    return {
      from: { x: top.x, y: fromY },
      to: { x: top.x, y: fromY + ARROW_LENGTH * pixelsPerRadius },
      label: Number.isFinite(a) ? `a = ${round(a!, 2)} m/s²` : "a",
    };
  }

  private showVerdict(): void {
    const result = this.result;
    if (result === undefined) return;
    if (result.correct) {
      this.view.showMessage({ text: "Correct!", correct: true });
      return;
    }
    this.view.showMessage({
      text: this.missText(result.submittedAnswer.values.acceleration),
      correct: false,
    });
  }

  /** What the typed acceleration does at this speed, in words. */
  private missText(acceleration: number | undefined): string {
    const track = this.track;
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
