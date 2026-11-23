import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { AnswerValidationResult } from "../../model/AnswerValidator.ts";
import type { SimulationState } from "../../model/SimulationState.ts";
import type { AnimationEngine } from "./AnimationEngine.ts";
import { PlaybackListeners } from "./PlaybackListeners.ts";

/**
 * Test double for AnimationEngine (#23): no canvas, and every playback
 * finishes right away, so controller tests can run in Node. The app also uses
 * it for levels that have no run builder yet (#116).
 */
export class FakeAnimationEngine implements AnimationEngine {
  private readonly listeners = new PlaybackListeners();
  private lastStates: readonly SimulationState[] | undefined;

  /** Every level passed to showLevel(), in order. */
  readonly shownLevels: LevelDataConfig[] = [];
  /** Every result passed to showResult(), in order. */
  readonly shownResults: AnswerValidationResult[] = [];
  /** Every list of frames played, including replays, in order. */
  readonly played: (readonly SimulationState[])[] = [];
  /** How many times stop() was called. */
  stopCount = 0;

  showLevel(level: LevelDataConfig): void {
    this.shownLevels.push(level);
  }

  showResult(result: AnswerValidationResult): void {
    this.shownResults.push(result);
  }

  play(states: readonly SimulationState[]): void {
    this.lastStates = states;
    this.played.push(states);
    this.listeners.start();
    this.listeners.finish();
  }

  /** Playback has always finished already, so there is nothing to stop. */
  stop(): void {
    this.stopCount++;
  }

  replay(): void {
    if (this.lastStates === undefined) return;
    this.play(this.lastStates);
  }

  onPlaybackFinished(listener: () => void): () => void {
    return this.listeners.add(listener);
  }
}
