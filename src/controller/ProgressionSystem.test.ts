import { describe, expect, it } from "vitest";
import { ProgressTracker } from "../model/ProgressTracker";
import { ProgressionSystem } from "./ProgressionSystem";

const first = { gameId: "carKinematics", levelId: 1 };
const second = { gameId: "netForce", levelId: 1 };

function record(tracker: ProgressTracker, correct: boolean, level = first) {
  tracker.recordAttempt({
    submittedAnswer: { ...level, values: {}, units: {} }, correct, feedback: "",
  });
}

describe("ProgressionSystem", () => {
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
    expect(new ProgressionSystem(tracker, []).getNextLevel(first)).toBeUndefined();
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
    expect(() => new ProgressionSystem(tracker, [first, first])).toThrow("Duplicate");
    expect(() => new ProgressionSystem(tracker, [first, second])).not.toThrow();
  });
});
