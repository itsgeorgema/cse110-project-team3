/**
 * Shared subscribe/notify logic for AnimationEngine implementations (#23).
 * Each engine holds one of these (composition, not a base class):
 *
 * - call start() when a playback begins,
 * - call finish() when it reaches its last frame,
 * - call stop() when it is stopped early.
 *
 * Listeners hear about a playback at most once, and never about a stopped one,
 * even if a late animation callback still calls finish() afterwards.
 */
export class PlaybackListeners {
  private readonly listeners = new Set<() => void>();
  private playing = false;

  /** Returns a function that removes this listener. Calling it twice is harmless. */
  add(listener: () => void): () => void {
    // Wrap so the same function added twice counts as two listeners.
    const entry = () => listener();
    this.listeners.add(entry);
    return () => {
      this.listeners.delete(entry);
    };
  }

  /** Marks a new playback as running. Replaces any playback that has not finished. */
  start(): void {
    this.playing = true;
  }

  /** Ends the running playback without notifying anyone. */
  stop(): void {
    this.playing = false;
  }

  /**
   * Ends the running playback and notifies every current listener once.
   * Does nothing if no playback is running (already finished, or stopped).
   * A listener added during the notification waits for the next finish.
   */
  finish(): void {
    if (!this.playing) return;
    this.playing = false;
    for (const listener of [...this.listeners]) listener();
  }

  get isPlaying(): boolean {
    return this.playing;
  }
}
