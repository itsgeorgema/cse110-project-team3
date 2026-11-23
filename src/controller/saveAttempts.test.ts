import { describe, expect, it, vi } from "vitest";
import { SaveManager } from "../data/SaveManager.ts";
import { saveAttempts } from "./saveAttempts.ts";

const answer = {
  submittedAnswer: {
    gameId: "kinematics",
    levelId: 1,
    values: { velocity: 20 },
    units: { velocity: "m/s" },
  },
  correct: false,
  feedback: "Not quite.",
};

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("saveAttempts", () => {
  it("adds each checked answer to the save", () => {
    const save = new SaveManager(memoryStorage());
    saveAttempts(save).recordAttempt(answer);
    expect(save.load().attempts).toEqual([
      {
        gameId: "kinematics",
        levelId: 1,
        values: { velocity: 20 },
        correct: false,
      },
    ]);
  });

  it("does nothing when browser storage is unavailable", () => {
    expect(() => saveAttempts(undefined).recordAttempt(answer)).not.toThrow();
  });

  it("keeps the level playable when saving fails", () => {
    const save = {
      recordAttempt: vi.fn(() => {
        throw new Error("storage full");
      }),
    };
    expect(() => saveAttempts(save).recordAttempt(answer)).not.toThrow();
    expect(save.recordAttempt).toHaveBeenCalledOnce();
  });
});
