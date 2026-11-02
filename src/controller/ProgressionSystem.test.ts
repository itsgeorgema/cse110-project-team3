import { describe, expect, it, vi } from "vitest";
import { ProgressTracker } from "../model/ProgressTracker";
import { ProgressionSystem } from "./ProgressionSystem";
import type { LevelIdentity } from "./ProgressionSystem";

const first = { gameId: "carKinematics", levelId: 1 };
const second = { gameId: "netForce", levelId: 1 };

function record(tracker: ProgressTracker, correct: boolean, level = first) {
  tracker.recordAttempt({
    submittedAnswer: { ...level, values: {}, units: {} },
    correct,
    feedback: "",
  });
}

describe("ProgressionSystem", () => {
  it.each([
    null,
    undefined,
    {},
    { levelId: 1 },
    { gameId: "", levelId: 1 },
    { gameId: "carKinematics" },
    { gameId: "carKinematics", levelId: null },
  ])(
    "rejects malformed runtime input %j without querying the tracker",
    (current) => {
      const tracker = { isCompleted: vi.fn(() => true) };
      const progression = new ProgressionSystem(tracker, [first, second]);
      // Simulate an untyped caller crossing the TypeScript interface.
      expect(
        progression.getNextLevel(current as unknown as LevelIdentity),
      ).toBeUndefined();
      expect(tracker.isCompleted).not.toHaveBeenCalled();
    },
  );

  it("accepts level zero and follows the configured order rather than numeric order", () => {
    const tracker = { isCompleted: vi.fn(() => true) };
    const zero = { gameId: "carKinematics", levelId: 0 };
    const progression = new ProgressionSystem(tracker, [zero, second, first]);
    expect(progression.getNextLevel(zero)).toEqual(second);
    expect(tracker.isCompleted).toHaveBeenCalledWith(zero.gameId, 0);
    expect(progression.getNextLevel(second)).toEqual(first);
    expect(progression.getNextLevel(first)).toBeUndefined();
  });

  it("does not query completion for an unknown game or level", () => {
    const tracker = { isCompleted: vi.fn(() => true) };
    const progression = new ProgressionSystem(tracker, [first, second]);
    expect(
      progression.getNextLevel({ gameId: "missing", levelId: 1 }),
    ).toBeUndefined();
    expect(progression.getNextLevel({ ...first, levelId: 99 })).toBeUndefined();
    expect(tracker.isCompleted).not.toHaveBeenCalled();
  });

  it("rejects a repeated pair later in the same game but allows distinct level numbers", () => {
    const tracker = { isCompleted: () => true };
    const other = { ...first, levelId: 2 };
    expect(() => new ProgressionSystem(tracker, [first, other])).not.toThrow();
    expect(
      () => new ProgressionSystem(tracker, [first, other, { ...first }]),
    ).toThrow("Duplicate");
  });

  it("offers the next configured level only after success and preserves it after replay", () => {
    const tracker = new ProgressTracker();
    const progression = new ProgressionSystem(tracker, [first, second]);
    expect(progression.getNextLevel(first)).toBeUndefined();
    record(tracker, false);
    expect(progression.getNextLevel(first)).toBeUndefined();
    record(tracker, true);
    expect(progression.getNextLevel(first)).toEqual(second);
    record(tracker, false);
    expect(progression.getNextLevel(first)).toEqual(second);
  });

  it("returns no next level for the final level, unknown levels, or an empty order", () => {
    const tracker = new ProgressTracker();
    record(tracker, true, second);
    const progression = new ProgressionSystem(tracker, [first, second]);
    expect(progression.getNextLevel(second)).toBeUndefined();
    expect(progression.getNextLevel({ ...first, levelId: 99 })).toBeUndefined();
    expect(
      new ProgressionSystem(tracker, []).getNextLevel(first),
    ).toBeUndefined();
  });

  it("uses the supplied order and copies it independently of later caller edits", () => {
    const tracker = new ProgressTracker();
    record(tracker, true);
    const order = [{ ...first }, { ...second }];
    const progression = new ProgressionSystem(tracker, order);
    order[1].levelId = 99;
    order.reverse();
    expect(progression.getNextLevel(first)).toEqual(second);
    expect(Object.isFrozen(progression.getNextLevel(first))).toBe(true);
  });

  it("rejects duplicate identities while allowing the same number in different games", () => {
    const tracker = new ProgressTracker();
    expect(() => new ProgressionSystem(tracker, [first, first])).toThrow(
      "Duplicate",
    );
    expect(() => new ProgressionSystem(tracker, [first, second])).not.toThrow();
  });
});
