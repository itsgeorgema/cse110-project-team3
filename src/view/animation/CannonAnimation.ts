import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { AnswerValidationResult } from "../../model/AnswerValidator.ts";
import type { SimulationState, Vec2 } from "../../model/SimulationState.ts";
import {
  CANNON_BALL_ID,
  cannonArena,
  cannonStop,
  cannonTargetArena,
  cannonTargetOutcome,
  type CannonArena,
  type CannonBounds,
  type CannonTargetArena,
} from "../../model/runs/cannonRun.ts";
import type { AnimationEngine } from "./AnimationEngine.ts";
import type { BallView } from "./DemoAnimation.ts";
import type { FrameScheduler } from "./FrameScheduler.ts";
import { FramePlayback } from "./FramePlayback.ts";
import { fitScale, toScreen, type WorldView } from "./worldToScreen.ts";

/** What the tent scene needs drawn, already in stage pixels. */
export interface CannonScene {
  /** Top of the floor band; the ball rests on it at y = 0 meters. */
  readonly floorY: number;
  /** The cannon's mouth, where the ball starts. */
  readonly cannon: Vec2;
  /** Launch angle in degrees above the horizontal. */
  readonly angleDeg: number;
  /** The angle's label beside the cannon, e.g. "30°". */
  readonly angleLabel: string;
  /** The launch speed's label, e.g. "12 m/s", or "v = ?" before an answer. */
  readonly speedLabel: string;
  /** Level 1's landing net on the floor, by its left and right edges. */
  readonly net?: { readonly leftX: number; readonly rightX: number };
  /** Level 3's hanging net and the distance guides to it. */
  readonly target?: CannonTargetScene;
  /** Where the tent wall starts on the right. */
  readonly wallX: number;
  /** The underside of the tent top. */
  readonly ceilingY: number;
}

/** A guide line with its label, e.g. "Horizontal distance = 30 m". */
export interface CannonGuide {
  readonly from: Vec2;
  readonly to: Vec2;
  readonly label: string;
}

/** Level 3's net (#143), hanging at the level's distance and height. */
export interface CannonTargetScene {
  /** The net's center line, through which the ball must pass. */
  readonly x: number;
  /** Its top and bottom edges; the center is the level's height. */
  readonly topY: number;
  readonly bottomY: number;
  /** Level with the cannon's mouth, from it to below the net. */
  readonly horizontal: CannonGuide;
  /** Up from below the net to the net's center. */
  readonly vertical: CannonGuide;
}

export interface CannonMessage {
  readonly text: string;
  readonly correct: boolean;
}

/**
 * Where CannonAnimation draws (Humble Object). KonvaCannon is the real one;
 * tests record the calls instead, so no canvas is needed. The ball itself is
 * a separate BallView, so the plain KonvaBall draws it.
 */
export interface CannonView {
  drawScene(scene: CannonScene): void;
  /** The dashed path flown so far, in stage pixels; empty hides it. */
  drawTrail(points: readonly Vec2[]): void;
  /** Shows a verdict over the scene; undefined hides it. */
  showMessage(message: CannonMessage | undefined): void;
}

/** Pixels kept clear at the top and sides of the stage. */
const MARGIN = 24;
/** Height of the floor band at the bottom of the stage, in pixels. */
const FLOOR = 28;
/** The ball's radius in pixels; registry passes the same size to KonvaBall. */
export const CANNON_BALL_RADIUS = 9;

/** "4.7", "12", never "4.70" or "-0". */
function meters(value: number): string {
  return String(Math.round(Math.abs(value) * 10) / 10);
}

/** Like meters, with two places when one would read 0: "0.03". */
function smallMeters(value: number): string {
  const one = meters(value);
  return one === "0" ? String(Math.round(Math.abs(value) * 100) / 100) : one;
}

/** Which tent is up: Level 1's floor net or Level 3's hanging net. */
type CannonLayout =
  | { readonly kind: "net"; readonly arena: CannonArena }
  | {
      readonly kind: "target";
      readonly arena: CannonTargetArena;
      readonly level: LevelDataConfig;
    };

/**
 * The Breakout's cannon for Minigame 3 (#5, #138). Frames come from the
 * cannon run builders in meters with y up; the ball flies from the cannon and
 * leaves a dashed trail. The verdict appears when the run stops: "Correct!",
 * how far short of or past the net it landed, or what it hit instead.
 * Level 3 (#143) hangs the net in the air instead, and says how far above or
 * below it the player's launch speed passed.
 */
export class CannonAnimation implements AnimationEngine {
  private readonly view: CannonView;
  private readonly ball: BallView;
  private readonly stage: { readonly width: number; readonly height: number };
  private readonly playback: FramePlayback;
  private layout: CannonLayout | undefined;
  private scene: CannonScene | undefined;
  private world: WorldView;
  private result: AnswerValidationResult | undefined;
  private states: readonly SimulationState[] = [];
  private trail: readonly Vec2[] = [];
  private lastBall: Vec2 = { x: 0, y: 0 };

  constructor(
    view: CannonView,
    ball: BallView,
    stage: { readonly width: number; readonly height: number },
    schedule: FrameScheduler,
  ) {
    this.view = view;
    this.ball = ball;
    this.stage = stage;
    this.world = { scale: 1, origin: this.originFor(0, 1), yUp: true };
    this.playback = new FramePlayback((state) => this.draw(state), schedule);
    // Subscribed first, so the verdict is on screen before anyone else hears.
    this.playback.onPlaybackFinished(() => this.showVerdict());
  }

  /**
   * Throws a RangeError when the level's launch values are missing or out of
   * range: speed, angle and gravity for Level 1; distance, height, angle and
   * gravity for Level 3.
   */
  showLevel(level: LevelDataConfig): void {
    const v = level.problemStatementVariablesValues;
    this.result = undefined;
    if (level.levelId === 3) {
      const arena = cannonTargetArena(level);
      this.layout = { kind: "target", arena, level };
      this.world = this.worldFor(arena);
      this.drawScene({
        ...this.baseScene(arena, v.launchAngle),
        speedLabel: "v = ?",
        target: this.targetScene(arena),
      });
    } else {
      const arena = cannonArena(level);
      this.layout = { kind: "net", arena };
      this.world = this.worldFor(arena);
      const screen = (x: number) => toScreen(this.world, { x, y: 0 }).x;
      this.drawScene({
        ...this.baseScene(arena, v.launchAngle),
        speedLabel: `${v.launchSpeed} m/s`,
        net: {
          leftX: screen(arena.netX - arena.netWidth / 2),
          rightX: screen(arena.netX + arena.netWidth / 2),
        },
      });
    }
    this.view.showMessage(undefined);
    this.view.drawTrail([]);
    this.lastBall = { x: 0, y: 0 };
    this.ball.moveTo(toScreen(this.world, { x: 0, y: 0 }));
  }

  showResult(result: AnswerValidationResult): void {
    this.result = result;
  }

  play(states: readonly SimulationState[]): void {
    this.states = states;
    // Level 3 asks for the speed, so label the cannon with the typed one.
    const typed = this.result?.submittedAnswer.values.launchSpeed;
    if (this.layout?.kind === "target" && this.scene && typed !== undefined) {
      this.drawScene({ ...this.scene, speedLabel: `${typed} m/s` });
    }
    this.trail = states.map((state) =>
      toScreen(this.world, this.ballIn(state) ?? { x: 0, y: 0 }),
    );
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

  private drawScene(scene: CannonScene): void {
    this.scene = scene;
    this.view.drawScene(scene);
  }

  /** The floor, cannon, wall and tent top every level shares. */
  private baseScene(
    arena: CannonBounds,
    angleDeg: number,
  ): Omit<CannonScene, "speedLabel"> {
    const cannon = toScreen(this.world, { x: 0, y: 0 });
    return {
      floorY: cannon.y + CANNON_BALL_RADIUS,
      cannon,
      angleDeg,
      angleLabel: `${angleDeg}°`,
      wallX: toScreen(this.world, { x: arena.wallX, y: 0 }).x,
      ceilingY: toScreen(this.world, { x: 0, y: arena.ceilingY }).y,
    };
  }

  /** Level 3's hanging net and its guides, in pixels. */
  private targetScene(arena: CannonTargetArena): CannonTargetScene {
    const screen = (x: number, y: number) => toScreen(this.world, { x, y });
    const { targetX: x, targetY: y } = arena;
    const center = screen(x, y);
    // Both distances are from the cannon's mouth, so the guides start there.
    const below = screen(x, 0);
    return {
      x: center.x,
      topY: screen(x, y + arena.targetHalfHeight).y,
      bottomY: screen(x, y - arena.targetHalfHeight).y,
      horizontal: {
        from: screen(0, 0),
        to: below,
        label: `Horizontal distance = ${x} m`,
      },
      vertical: {
        from: below,
        to: center,
        label: `Vertical distance = ${y} m`,
      },
    };
  }

  /** Fits the whole tent, left edge to wall and floor to top, on the stage. */
  private worldFor(arena: CannonBounds): WorldView {
    const width = arena.wallX - arena.leftX;
    const scale = fitScale(
      { width, height: arena.ceilingY },
      {
        width: Math.max(this.stage.width - 2 * MARGIN, 0),
        height: Math.max(
          this.stage.height - MARGIN - FLOOR - CANNON_BALL_RADIUS,
          0,
        ),
      },
    );
    return { scale, origin: this.originFor(arena.leftX, scale), yUp: true };
  }

  /** The cannon's mouth on screen: just above the floor, right of the left edge. */
  private originFor(leftX: number, scale: number): Vec2 {
    return {
      x: MARGIN - leftX * scale,
      y: this.stage.height - FLOOR - CANNON_BALL_RADIUS,
    };
  }

  private ballIn(state: SimulationState): Vec2 | undefined {
    return state.objects[CANNON_BALL_ID]?.position;
  }

  private draw(state: SimulationState): void {
    const position = this.ballIn(state);
    if (position === undefined) return;
    this.lastBall = position;
    this.ball.moveTo(toScreen(this.world, position));
    const index = this.states.indexOf(state);
    this.view.drawTrail(this.trail.slice(0, index + 1));
  }

  private showVerdict(): void {
    const result = this.result;
    if (result === undefined) return;
    if (result.correct) {
      this.view.showMessage({ text: "Correct!", correct: true });
      return;
    }
    this.view.showMessage({ text: this.missText(), correct: false });
  }

  /** What a wrong answer's run did, in words. */
  private missText(): string {
    const layout = this.layout;
    if (layout === undefined) return "Not quite";
    if (layout.kind === "target") return this.targetMissText(layout);
    const arena = layout.arena;
    switch (cannonStop(this.lastBall, arena)) {
      case "wall":
        return "Hit the tent wall";
      case "ceiling":
        return "Flew out the top of the tent";
      case "left":
        return "Flew backward out of the tent";
      case "timeCap":
        return "Never came down";
      case "landed": {
        const gap = arena.netX - this.lastBall.x;
        if (Math.abs(gap) <= arena.netWidth / 2) {
          return "In the net, but an answer is off";
        }
        return gap > 0
          ? `Landed ${meters(gap)} m short of the net`
          : `Landed ${meters(gap)} m past the net`;
      }
    }
  }

  /** Level 3: where the player's launch speed passed the hanging net. */
  private targetMissText(
    layout: Extract<CannonLayout, { kind: "target" }>,
  ): string {
    const speed = this.result?.submittedAnswer.values.launchSpeed;
    if (speed === undefined) return "Not quite";
    const outcome = cannonTargetOutcome(speed, layout.level);
    switch (outcome.kind) {
      case "ceiling":
        return "Flew out the top of the tent";
      case "short":
        return `Landed ${meters(outcome.gap)} m short of the net`;
      case "passed": {
        const offset = outcome.offset;
        const side = offset > 0 ? "above" : "below";
        const distance = smallMeters(offset);
        if (Math.abs(offset) <= layout.arena.targetHalfHeight) {
          return distance === "0"
            ? "Through the net, but the speed is a little off"
            : `Through the net, but ${distance} m ${side} its center`;
        }
        return `Passed ${distance} m ${side} the net`;
      }
    }
  }
}
