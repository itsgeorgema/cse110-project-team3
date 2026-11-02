import type { LevelAddress } from "../model/LevelAddress.ts";
import type { ProgressTracker } from "../model/ProgressTracker";

/** The caller supplies the level order; this service does not load levels or render UI. */
export class ProgressionSystem {
  private readonly levels: readonly LevelAddress[];
  private readonly tracker: Pick<ProgressTracker, "isCompleted">;

  constructor(
    tracker: Pick<ProgressTracker, "isCompleted">,
    levels: readonly LevelAddress[],
  ) {
    this.tracker = tracker;
    this.levels = levels.map((level) => Object.freeze({ ...level }));
    const seen = new Map<string, Set<number>>();
    for (const level of this.levels) {
      const ids = seen.get(level.gameId) ?? new Set<number>();
      if (ids.has(level.levelId))
        throw new Error("Duplicate game and level in progression order");
      ids.add(level.levelId);
      seen.set(level.gameId, ids);
    }
  }

  getNextLevel(current: LevelAddress): LevelAddress | undefined {
    if (!current || !current.gameId || current.levelId == null)
      return undefined;
    const index = this.levels.findIndex(
      (level) =>
        level.gameId === current.gameId && level.levelId === current.levelId,
    );
    if (index < 0 || !this.tracker.isCompleted(current)) {
      return undefined;
    }
    if (index >= this.levels.length - 1) return undefined;
    return this.levels[index + 1];
  }
}
