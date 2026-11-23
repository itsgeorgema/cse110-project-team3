import type { SimulationState, Vec2 } from "../../model/SimulationState.ts";
import type { AnimationEngine } from "./AnimationEngine.ts";
import type { FrameScheduler } from "./FrameScheduler.ts";
import { FramePlayback } from "./FramePlayback.ts";

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
 * A ball following given frames (Strategy, #24): the smallest possible
 * AnimationEngine. FramePlayback runs the time loop; this class only draws.
 */
export class DemoAnimation implements AnimationEngine {
  private readonly ball: BallView;
  private readonly playback: FramePlayback;

  constructor(ball: BallView, schedule: FrameScheduler) {
    this.ball = ball;
    this.playback = new FramePlayback((state) => this.draw(state), schedule);
  }

  /** The demo has no scene: the ball appears with the first frame. */
  showLevel(): void {}

  /** The demo shows no verdict. */
  showResult(): void {}

  play(states: readonly SimulationState[]): void {
    this.playback.play(states);
  }

  stop(): void {
    this.playback.stop();
  }

  replay(): void {
    this.playback.replay();
  }

  onPlaybackFinished(listener: () => void): () => void {
    return this.playback.onPlaybackFinished(listener);
  }

  private draw(state: SimulationState): void {
    const ball = state.objects[DEMO_BALL_ID];
    if (ball !== undefined) this.ball.moveTo(ball.position);
  }
}
