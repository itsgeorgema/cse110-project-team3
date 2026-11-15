import type { SimulationState, Vec2 } from "../../model/SimulationState.ts";
import type { AnimationEngine } from "./AnimationEngine.ts";
import type { FrameScheduler } from "./FrameScheduler.ts";
import { PlaybackListeners } from "./PlaybackListeners.ts";

/** The object id DemoAnimation draws from each frame. */
export const DEMO_BALL_ID = "ball";

/**
 * Where DemoAnimation draws its ball. The real one wraps a Konva shape;
 * tests record positions instead, so no canvas is needed.
 */
export interface BallView {
  moveTo(position: Vec2): void;
}

/**
 * A ball following given frames (Strategy, #24): the reference for every
 * game's own AnimationEngine. Playback is time-based: each refresh draws the
 * last frame whose timeMs has been reached, so it plays at the same speed on
 * any monitor.
 */
export class DemoAnimation implements AnimationEngine {
  private readonly listeners = new PlaybackListeners();
  private readonly ball: BallView;
  private readonly schedule: FrameScheduler;
  private states: readonly SimulationState[] = [];
  private lastStates: readonly SimulationState[] | undefined;
  /** Timestamp of the first refresh after play(); elapsed time counts from it. */
  private startMs: number | undefined;
  /** Cancels the pending refresh, while one is pending. */
  private cancelFrame: (() => void) | undefined;

  constructor(ball: BallView, schedule: FrameScheduler) {
    this.ball = ball;
    this.schedule = schedule;
  }

  /** Throws on an empty list: no frames means the simulation produced nothing. */
  play(states: readonly SimulationState[]): void {
    if (states.length === 0) {
      throw new Error("DemoAnimation.play needs at least one frame");
    }
    this.cancelFrame?.();
    this.states = states;
    this.lastStates = states;
    this.startMs = undefined;
    this.listeners.start();
    this.draw(states[0]);
    this.cancelFrame = this.schedule(this.onFrame);
  }

  stop(): void {
    this.cancelFrame?.();
    this.cancelFrame = undefined;
    this.listeners.stop();
  }

  replay(): void {
    if (this.lastStates === undefined) return;
    this.play(this.lastStates);
  }

  onPlaybackFinished(listener: () => void): () => void {
    return this.listeners.add(listener);
  }

  /** One screen refresh: draw the frame for the elapsed time, then finish or ask for the next refresh. */
  private readonly onFrame = (nowMs: number): void => {
    this.startMs ??= nowMs;
    const elapsed = nowMs - this.startMs;

    let latestState = this.states[0];
    for (const state of this.states) {
      if (state.timeMs > elapsed) break;
      latestState = state;
    }
    this.draw(latestState);

    if (latestState == this.states[this.states.length - 1]) {
      this.cancelFrame = undefined;
      this.listeners.finish();
    } else {
      this.cancelFrame = this.schedule(this.onFrame);
    }
  };

  private draw(state: SimulationState): void {
    const ball = state.objects[DEMO_BALL_ID];
    if (ball !== undefined) this.ball.moveTo(ball.position);
  }
}
