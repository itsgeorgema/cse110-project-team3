import type { SaveManager } from "../data/SaveManager.ts";
import type { AttemptRecorder } from "./GameController.ts";

/**
 * The AttemptRecorder that adds every checked answer to the save (#81), so the
 * attempt history survives a reload. Without browser storage it records nothing.
 */
export function saveAttempts(
  save: Pick<SaveManager, "recordAttempt"> | undefined,
): AttemptRecorder {
  return {
    recordAttempt(result) {
      try {
        save?.recordAttempt(result);
      } catch {
        // A full or blocked storage must not stop the player from continuing.
      }
    },
  };
}
