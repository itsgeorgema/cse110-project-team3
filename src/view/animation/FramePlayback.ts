import type { SimulationState } from "../../model/SimulationState.ts";
import type { FrameScheduler } from "./FrameScheduler.ts";
import { PlaybackListeners } from "./PlaybackListeners.ts";

/**
 * The time loop every AnimationEngine shares (#116): play, stop, replay and
 * playbackFinished. A game passes in how to draw one frame and keeps only its
 * drawing code. Playback is time-based: each refresh draws the last frame whose
 * timeMs has been reached, so it plays at the same speed on any monitor.
 */
export class FramePlayback {
  private readonly listeners = new PlaybackListeners();
  private readonly draw: (state: SimulationState) => void;
  private readonly schedule: FrameScheduler;
  private states: readonly SimulationState[] = [];
  private lastStates: readonly SimulationState[] | undefined;
  /** Timestamp of the first refresh after play(); elapsed time counts from it. */
  private startMs: number | undefined;
  /** Cancels the pending refresh, while one is pending. */
  private cancelFrame: (() => void) | undefined;

  constructor(
    draw: (state: SimulationState) => void,
    schedule: FrameScheduler,
  ) {
    this.draw = draw;
    this.schedule = schedule;
  }

  /** Throws on an empty list: no frames means the run produced nothing. */
  play(states: readonly SimulationState[]): void {
    if (states.length === 0) {
      throw new Error("play needs at least one frame");
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

    if (latestState === this.states[this.states.length - 1]) {
      this.cancelFrame = undefined;
      this.listeners.finish();
    } else {
      this.cancelFrame = this.schedule(this.onFrame);
    }
  };
}
