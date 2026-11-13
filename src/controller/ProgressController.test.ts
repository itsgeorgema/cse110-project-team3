import { describe, expect, it } from "vitest";
import { SaveManager } from "../data/SaveManager";
import { ProgressTracker } from "../model/ProgressTracker";
import type { LevelAddress } from "../model/LevelAddress";
import { ProgressController } from "./ProgressController";

const first = { gameId: "carKinematics", levelId: 1 };
const second = { gameId: "carKinematics", levelId: 2 };

describe("ProgressController", () => {
  it("unlocks and saves the next level after a correct attempt", () => {
    const save = new SaveManager(memoryStorage());
    const progress = new ProgressController(new ProgressTracker(), save, [
      first,
      second,
    ]);

    expect(progress.isAvailable(second)).toBe(false);
    progress.recordAttempt(attempt(first, true));

    expect(progress.isAvailable(second)).toBe(true);
    expect(progress.getNextLevel(first)).toEqual(second);
    expect(save.load().completedLevels).toEqual([first]);
  });

  it("does not unlock or save after an incorrect attempt", () => {
    const save = new SaveManager(memoryStorage());
    const progress = new ProgressController(new ProgressTracker(), save, [
      first,
      second,
    ]);

    progress.recordAttempt(attempt(first, false));

    expect(progress.isAvailable(second)).toBe(false);
    expect(save.load().completedLevels).toEqual([]);
  });

  it("keeps saved progress after a refresh", () => {
    const storage = memoryStorage();
    const before = new ProgressController(
      new ProgressTracker(),
      new SaveManager(storage),
      [first, second],
    );
    before.recordAttempt(attempt(first, true));

    const after = new ProgressController(
      new ProgressTracker(),
      new SaveManager(storage),
      [first, second],
    );

    expect(after.isCompleted(first)).toBe(true);
    expect(after.isAvailable(second)).toBe(true);
  });

  it("does not undo completion after a wrong replay", () => {
    const save = new SaveManager(memoryStorage());
    const progress = new ProgressController(new ProgressTracker(), save, [
      first,
      second,
    ]);

    progress.recordAttempt(attempt(first, true));
    progress.recordAttempt(attempt(first, false));

    expect(progress.isCompleted(first)).toBe(true);
    expect(progress.isAvailable(second)).toBe(true);
    expect(save.load().completedLevels).toEqual([first]);
  });
});

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

function attempt(level: LevelAddress, correct: boolean) {
  return {
    submittedAnswer: { ...level, values: {}, units: {} },
    correct,
    feedback: "",
  };
}
