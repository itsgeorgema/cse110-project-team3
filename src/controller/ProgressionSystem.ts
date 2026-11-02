import type { LevelAddress } from "../model/LevelAddress.ts";
import type { ProgressTracker } from "../model/ProgressTracker";

/** The caller supplies the level order; this service does not load levels or render UI. */
export class ProgressionSystem {
  private readonly levels: readonly LevelAddress[];
  private readonly tracker: Pick<ProgressTracker, "isCompleted">;
  private readonly positions = new Map<string, Map<number, number>>();

  constructor(
    tracker: Pick<ProgressTracker, "isCompleted">,
    levels: readonly LevelAddress[],
  ) {
    this.tracker = tracker;
    this.levels = levels.map((level) => Object.freeze({ ...level }));
    this.levels.forEach((level, index) => {
      const ids = this.positions.get(level.gameId) ?? new Map<number, number>();
      if (ids.has(level.levelId))
        throw new Error("Duplicate game and level in progression order");
      ids.set(level.levelId, index);
      this.positions.set(level.gameId, ids);
    });
  }

  /** Completed levels remain replayable; new levels require all earlier levels. */
  isAvailable(current: LevelAddress): boolean {
    const index = this.indexOf(current);
    if (index < 0) return false;
    return (
      this.tracker.isCompleted(current) ||
      this.levels
        .slice(0, index)
        .every((level) => this.tracker.isCompleted(level))
    );
  }

  getNextLevel(current: LevelAddress): LevelAddress | undefined {
    const index = this.indexOf(current);
    if (index < 0 || !this.tracker.isCompleted(current)) {
      return undefined;
    }
    if (index >= this.levels.length - 1) return undefined;
    return this.levels[index + 1];
  }

  private indexOf(current: LevelAddress): number {
    if (
      current === null ||
      current === undefined ||
      !current.gameId ||
      current.levelId === null ||
      current.levelId === undefined
    )
      return -1;
    return this.positions.get(current.gameId)?.get(current.levelId) ?? -1;
  }
}
