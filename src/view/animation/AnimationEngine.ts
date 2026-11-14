import type { SimulationState } from "../../model/SimulationState.ts";

/**
 * Plays a run on screen (#23). Each game owns how it draws things (Strategy);
 * GameController and the overworld only know this interface.
 *
 * Input is the SimulationState[] that PhysicsEngine.simulate returns (#57),
 * or the overworld walk helper's frames (#22).
 */
export interface AnimationEngine {
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
