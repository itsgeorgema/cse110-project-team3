import { describe, expect, expectTypeOf, it } from "vitest";
import { ProgressTracker } from "./ProgressTracker";
import type { LevelAddress } from "./LevelAddress.ts";

function result(correct: boolean, gameId = "launch", levelId = 1) {
  return {
    submittedAnswer: {
      gameId,
      levelId,
      values: { speed: 5 },
      units: { speed: "m/s" },
    },
    correct,
    feedback: correct ? "Correct" : "Try again",
  };
}

describe("ProgressTracker", () => {
  it("accepts one shared level address, including level zero", () => {
    expectTypeOf<ProgressTracker["isCompleted"]>().parameters.toEqualTypeOf<
      [LevelAddress]
    >();
    const tracker = new ProgressTracker();
    const level = Object.freeze({ gameId: "launch", levelId: 0 });
    expect(tracker.isCompleted(level)).toBe(false);
    tracker.recordAttempt(result(true, level.gameId, level.levelId));
    expect(tracker.isCompleted(level)).toBe(true);
    expect(level).toEqual({ gameId: "launch", levelId: 0 });
  });

  it("marks completion only when a correct attempt is recorded", () => {
    const tracker = new ProgressTracker();
    expect(tracker.isCompleted({ gameId: "launch", levelId: 1 })).toBe(false);
    tracker.recordAttempt(result(false));
    expect(tracker.isCompleted({ gameId: "launch", levelId: 1 })).toBe(false);
    tracker.recordAttempt(result(true));
    expect(tracker.isCompleted({ gameId: "launch", levelId: 1 })).toBe(true);
    expect(
      new ProgressTracker().isCompleted({ gameId: "launch", levelId: 1 }),
    ).toBe(false);
  });

  it("preserves completion across successful and failed replays", () => {
    const tracker = new ProgressTracker();
    tracker.recordAttempt(result(true));
    tracker.recordAttempt(result(true));
    tracker.recordAttempt(result(false));
    expect(tracker.isCompleted({ gameId: "launch", levelId: 1 })).toBe(true);
    expect(tracker.getAttempts()).toHaveLength(3);
  });

  it("keeps completion separate for each game and level", () => {
    const tracker = new ProgressTracker();
    tracker.recordAttempt(result(true));
    expect(tracker.isCompleted({ gameId: "collision", levelId: 1 })).toBe(
      false,
    );
    expect(tracker.isCompleted({ gameId: "launch", levelId: 2 })).toBe(false);
    tracker.recordAttempt(result(true, "collision"));
    expect(tracker.isCompleted({ gameId: "collision", levelId: 1 })).toBe(true);
    expect(tracker.isCompleted({ gameId: "launch", levelId: 1 })).toBe(true);
    expect(tracker.isCompleted({ gameId: "launch", levelId: 2 })).toBe(false);
  });

  it("starts empty and keeps state separate between sessions", () => {
    const tracker = new ProgressTracker();
    expect(tracker.getAttempts()).toEqual([]);
    tracker.recordAttempt(result(true));
    expect(new ProgressTracker().getAttempts()).toEqual([]);
  });

  it("records incorrect and correct attempts in order", () => {
    const tracker = new ProgressTracker();
    tracker.recordAttempt(result(false));
    tracker.recordAttempt(result(true));
    expect(tracker.getAttempts().map((attempt) => attempt.correct)).toEqual([
      false,
      true,
    ]);
  });

  it("preserves game and level identity in history", () => {
    const tracker = new ProgressTracker();
    tracker.recordAttempt(result(true));
    tracker.recordAttempt(result(true, "collision"));
    tracker.recordAttempt(result(false, "launch", 2));
    expect(
      tracker
        .getAttempts()
        .map((attempt) => [
          attempt.submittedAnswer.gameId,
          attempt.submittedAnswer.levelId,
        ]),
    ).toEqual([
      ["launch", 1],
      ["collision", 1],
      ["launch", 2],
    ]);
  });

  it("protects history from changes to input objects and returned collections", () => {
    const tracker = new ProgressTracker();
    const input = result(true);
    tracker.recordAttempt(input);
    const history = tracker.getAttempts();
    input.submittedAnswer.values.speed = 99;
    input.submittedAnswer.units.speed = "changed";
    input.feedback = "changed";
    input.correct = false;
    expect(history[0].submittedAnswer.values.speed).toBe(5);
    expect(history[0].correct).toBe(true);
    expect(history[0].submittedAnswer.units.speed).toBe("m/s");
    expect(history[0].feedback).toBe("Correct");
    expect(Object.isFrozen(history)).toBe(true);
    expect(Object.isFrozen(history[0].submittedAnswer.values)).toBe(true);
    tracker.recordAttempt(result(false));
    expect(history).toHaveLength(1);
    expect(tracker.getAttempts()).toHaveLength(2);
  });
});
