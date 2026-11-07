import type { AnswerValidationResult } from "../model/AnswerValidator";
import type { LevelAddress } from "../model/LevelAddress";
import type { ProgressTracker } from "../model/ProgressTracker";
import type { SaveManager } from "../data/SaveManager";
import { ProgressionSystem } from "./ProgressionSystem";

/** Keeps in-session attempts and saved progress in sync for the controller and the overworld */
export class ProgressController {
  private readonly tracker: ProgressTracker;
  private readonly saveManager: SaveManager;
  private readonly progression: ProgressionSystem;

  constructor(
    tracker: ProgressTracker,
    saveManager: SaveManager,
    levels: readonly LevelAddress[],
  ) {
    this.tracker = tracker;
    this.saveManager = saveManager;
    this.progression = new ProgressionSystem(this, levels);
  }

  /** True if this session has a correct attempt, or the save says it was completed earlier */
  isCompleted(level: LevelAddress): boolean {
    if (this.tracker.isCompleted(level)) return true;
    return this.saveManager
      .load()
      .completedLevels.some(
        (saved) =>
          saved.gameId === level.gameId && saved.levelId === level.levelId,
      );
  }

  /** Call once after playback finishes. Saves the level only when the answer was correct */
  recordAttempt(result: AnswerValidationResult): void {
    this.tracker.recordAttempt(result);
    if (result.correct) {
      const { gameId, levelId } = result.submittedAnswer;
      this.saveManager.recordCompletedLevel({ gameId, levelId });
    }
  }

  isAvailable(level: LevelAddress): boolean {
    return this.progression.isAvailable(level);
  }

  getNextLevel(level: LevelAddress): LevelAddress | undefined {
    return this.progression.getNextLevel(level);
  }
}
