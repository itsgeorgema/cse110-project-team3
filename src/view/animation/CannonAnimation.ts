import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { AnswerValidationResult } from "../../model/AnswerValidator.ts";
import type { SimulationState, Vec2 } from "../../model/SimulationState.ts";
import {
  CANNON_BALL_ID,
  cannonArena,
  cannonStop,
  type CannonArena,
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
  /** The launch speed's label, e.g. "12 m/s". */
  readonly speedLabel: string;
  /** The landing net's left and right edges. */
  readonly netLeftX: number;
  readonly netRightX: number;
  /** Where the tent wall starts on the right. */
  readonly wallX: number;
  /** The underside of the tent top. */
  readonly ceilingY: number;
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

/**
 * The Breakout's cannon for Minigame 3 (#5, #138). Frames come from the
 * cannon run builders in meters with y up; the ball flies from the cannon and
 * leaves a dashed trail. The verdict appears when the run stops: "Correct!",
 * how far short of or past the net it landed, or what it hit instead.
 */
export class CannonAnimation implements AnimationEngine {
  private readonly view: CannonView;
  private readonly ball: BallView;
  private readonly stage: { readonly width: number; readonly height: number };
  private readonly playback: FramePlayback;
  private arena: CannonArena | undefined;
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

  /** Throws a RangeError when the level has no valid launch speed, angle or gravity. */
  showLevel(level: LevelDataConfig): void {
    const arena = cannonArena(level);
    const v = level.problemStatementVariablesValues;
    this.arena = arena;
    this.result = undefined;
    this.world = this.worldFor(arena);
    const screen = (x: number, y: number) => toScreen(this.world, { x, y });
    const cannon = screen(0, 0);
    this.view.drawScene({
      floorY: cannon.y + CANNON_BALL_RADIUS,
      cannon,
      angleDeg: v.launchAngle,
      angleLabel: `${v.launchAngle}°`,
      speedLabel: `${v.launchSpeed} m/s`,
      netLeftX: screen(arena.netX - arena.netWidth / 2, 0).x,
      netRightX: screen(arena.netX + arena.netWidth / 2, 0).x,
      wallX: screen(arena.wallX, 0).x,
      ceilingY: screen(0, arena.ceilingY).y,
    });
    this.view.showMessage(undefined);
    this.view.drawTrail([]);
    this.lastBall = { x: 0, y: 0 };
    this.ball.moveTo(cannon);
  }

  showResult(result: AnswerValidationResult): void {
    this.result = result;
  }

  play(states: readonly SimulationState[]): void {
    this.states = states;
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

  /** Fits the whole tent, left edge to wall and floor to top, on the stage. */
  private worldFor(arena: CannonArena): WorldView {
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
    const arena = this.arena;
    if (arena === undefined) return "Not quite";
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
}
