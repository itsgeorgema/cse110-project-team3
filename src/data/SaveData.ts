import type { LevelAddress } from "../model/LevelAddress.ts";

/** One checked answer, kept so the attempy history survives a reload */
export interface SavedAttempt {
  readonly gameId: string;
  readonly levelId: number;
  readonly values: Readonly<Record<string, number>>;
  readonly correct: boolean;
}

/** Persisted progress: completed levels, the map position and every checked answer.  */
export interface SaveData {
  readonly schemaVersion: 2;
  readonly completedLevels: readonly LevelAddress[];
  readonly currentLevel: LevelAddress | null;
  readonly attempts: readonly SavedAttempt[];
}
