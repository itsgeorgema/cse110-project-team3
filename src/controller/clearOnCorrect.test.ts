import { describe, expect, it } from "vitest";
import type { AnswerValidationResult } from "../model/AnswerValidator.ts";
import type { LevelAddress } from "../model/LevelAddress.ts";
import { clearOnCorrect } from "./clearOnCorrect.ts";
import type { ClearedLevels } from "./clearOnCorrect.ts";

/** In-memory ClearedLevels that records every markCleared call. */
function fakeLevels(initial: readonly LevelAddress[] = []) {
  const cleared = new Set(initial.map((l) => `${l.gameId}:${l.levelId}`));
  const marked: LevelAddress[] = [];
  const levels: ClearedLevels = {
    isCleared: (l) => cleared.has(`${l.gameId}:${l.levelId}`),
    markCleared: (l) => {
      marked.push(l);
      cleared.add(`${l.gameId}:${l.levelId}`);
    },
  };
  return { levels, marked, cleared };
}

function attempt(
  correct: boolean,
  gameId = "kinematics",
  levelId = 1,
): AnswerValidationResult {
  return {
    submittedAnswer: {
      gameId,
      levelId,
      values: { velocity: 12 },
      units: { velocity: "m/s" },
    },
    correct,
    feedback: correct ? "Correct!" : "Try again.",
  };
}

describe("clearOnCorrect", () => {
  it("clears the level of a correct answer", () => {
    const { levels, marked } = fakeLevels();
    clearOnCorrect(levels).recordAttempt(attempt(true));
    expect(marked).toEqual([{ gameId: "kinematics", levelId: 1 }]);
  });

  it("passes only the level address, not the submitted values", () => {
    const { levels, marked } = fakeLevels();
    clearOnCorrect(levels).recordAttempt(attempt(true, "netForce", 2));
    expect(Object.keys(marked[0]!)).toEqual(["gameId", "levelId"]);
    expect(marked[0]).toEqual({ gameId: "netForce", levelId: 2 });
  });

  it("does nothing for a wrong answer", () => {
    const { levels, marked } = fakeLevels();
    clearOnCorrect(levels).recordAttempt(attempt(false));
    expect(marked).toEqual([]);
  });

  it("marks a level only once across repeated correct answers", () => {
    const { levels, marked } = fakeLevels();
    const recorder = clearOnCorrect(levels);
    recorder.recordAttempt(attempt(true));
    recorder.recordAttempt(attempt(true));
    expect(marked).toHaveLength(1);
  });

  it("skips a level that was already cleared, e.g. loaded from the save", () => {
    const { levels, marked } = fakeLevels([
      { gameId: "kinematics", levelId: 1 },
    ]);
    clearOnCorrect(levels).recordAttempt(attempt(true));
    expect(marked).toEqual([]);
  });

  it("keeps a cleared level cleared after a later wrong answer", () => {
    const { levels, cleared } = fakeLevels();
    const recorder = clearOnCorrect(levels);
    recorder.recordAttempt(attempt(true));
    recorder.recordAttempt(attempt(false));
    expect(cleared.has("kinematics:1")).toBe(true);
  });

  it("clears different levels independently", () => {
    const { levels, marked } = fakeLevels();
    const recorder = clearOnCorrect(levels);
    recorder.recordAttempt(attempt(true, "kinematics", 1));
    recorder.recordAttempt(attempt(false, "kinematics", 2));
    recorder.recordAttempt(attempt(true, "netForce", 2));
    expect(marked).toEqual([
      { gameId: "kinematics", levelId: 1 },
      { gameId: "netForce", levelId: 2 },
    ]);
  });

  it("clears the same level again after progress is reset", () => {
    const { levels, marked, cleared } = fakeLevels();
    const recorder = clearOnCorrect(levels);
    recorder.recordAttempt(attempt(true));
    cleared.clear();
    recorder.recordAttempt(attempt(true));
    expect(marked).toHaveLength(2);
  });
});
