import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { AnswerValidationResult } from "../../model/AnswerValidator.ts";
import type { SimulationState } from "../../model/SimulationState.ts";

/**
 * Plays a run on screen (#23). Each game owns how it draws things (Strategy);
 * GameController and the overworld only know this interface.
 *
 * Input is the SimulationState[] that a level's RunBuilder returns (#57),
 * or the overworld walk helper's frames (#22).
 */
export interface AnimationEngine {
  /** Draws the level's scene before any answer, e.g. the car at the start line. */
  showLevel(level: LevelDataConfig): void;
  /**
   * The verdict on the run about to be played. GameController calls this just
   * before play(); the engine shows it when that playback reaches its end.
   */
  showResult(result: AnswerValidationResult): void;
  /** Plays these frames from the first one, replacing any playback in progress. */
  play(states: readonly SimulationState[]): void;
  /** Stops playback. A stopped playback never fires playbackFinished. */
  stop(): void;
  /** Plays the last frames passed to play() again. Does nothing before the first play(). */
  replay(): void;
  /**
   * Called each time a playback reaches its last frame (Observer).
   * Returns a function that removes the listener.
   */
  onPlaybackFinished(listener: () => void): () => void;
}
