import type { AnswerSubmission } from "../model/AnswerValidator";
import type { ProgressTracker } from "../model/ProgressTracker";

export type LevelIdentity = Pick<AnswerSubmission, "gameId" | "levelId">;

/** The caller supplies the level order; this service does not load levels or render UI. */
export class ProgressionSystem {
  private readonly levels: readonly LevelIdentity[];

  constructor(
    privateTracker: Pick<ProgressTracker, "isCompleted">,
    levels: readonly LevelIdentity[],
  ) {
    this.tracker = privateTracker;
    this.levels = levels.map(level => Object.freeze({ ...level }));
    const seen = new Map<string, Set<number>>();
    for (const level of this.levels) {
      const ids = seen.get(level.gameId) ?? new Set<number>();
      if (ids.has(level.levelId)) throw new Error("Duplicate game and level in progression order");
      ids.add(level.levelId);
      seen.set(level.gameId, ids);
    }
  }

  private readonly tracker: Pick<ProgressTracker, "isCompleted">;

  /** Completed levels remain replayable; new levels require all earlier levels. */
  isAvailable(current: LevelIdentity): boolean {
    const index = this.levels.findIndex(level =>
      level.gameId === current.gameId && level.levelId === current.levelId,
    );
    if (index < 0) return false;
    return this.tracker.isCompleted(current.gameId, current.levelId) ||
      this.levels.slice(0, index).every(level =>
        this.tracker.isCompleted(level.gameId, level.levelId),
      );
  }

  getNextLevel(current: LevelIdentity): LevelIdentity | undefined {
    const index = this.levels.findIndex(level =>
      level.gameId === current.gameId && level.levelId === current.levelId,
    );
    if (index < 0 || !this.tracker.isCompleted(current.gameId, current.levelId)) {
      return undefined;
    }
    return this.levels[index + 1];
  }
}
