import type { LevelAddress } from "../model/LevelAddress.ts";
import type { AttemptRecorder } from "./GameController.ts";

/** Where cleared levels live, e.g. the overworld's completion set plus the save. */
export interface ClearedLevels {
  isCleared(level: LevelAddress): boolean;
  markCleared(level: LevelAddress): void;
}

/**
 * The AttemptRecorder for the level screen: a correct answer clears its level,
 * which unlocks the next node on the story map. Wrong answers change nothing,
 * and a level already cleared is not marked again.
 */
export function clearOnCorrect(levels: ClearedLevels): AttemptRecorder {
  return {
    recordAttempt(result) {
      if (!result.correct) return;
      const { gameId, levelId } = result.submittedAnswer;
      const level: LevelAddress = { gameId, levelId };
      if (levels.isCleared(level)) return;
      levels.markCleared(level);
    },
  };
}
