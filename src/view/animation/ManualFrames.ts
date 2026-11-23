import type { FrameScheduler } from "./FrameScheduler.ts";

/**
 * Test helper for animation engines (#24, #116): plays the monitor, so
 * callbacks run only when the test calls tick(nowMs). Pass `schedule` where
 * the app passes browserFrames.
 */
export class ManualFrames {
  private readonly pending = new Map<number, (nowMs: number) => void>();
  private nextId = 0;

  readonly schedule: FrameScheduler = (callback) => {
    const id = this.nextId++;
    this.pending.set(id, callback);
    return () => {
      this.pending.delete(id);
    };
  };

  /** One screen refresh at nowMs: runs every callback that was waiting for it. */
  tick(nowMs: number): void {
    const due = [...this.pending.values()];
    this.pending.clear();
    for (const callback of due) callback(nowMs);
  }

  get waiting(): number {
    return this.pending.size;
  }
}
