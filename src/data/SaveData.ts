import type { LevelAddress } from "../model/LevelAddress.ts";

/** Persisted completion state used to restore the overworld progress display. */
export interface SaveData {
  readonly schemaVersion: 1;
  readonly completedLevels: readonly LevelAddress[];
  readonly currentLevel: LevelAddress | null;
}
