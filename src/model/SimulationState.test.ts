import { describe, expect, it } from "vitest";
import { snapshotState } from "./SimulationState";
import type { LiveBody } from "./SimulationState";

const body = (id: string, x = 0, y = 0): LiveBody => ({
  id,
  position: { x, y },
  angle: 0,
});

describe("snapshotState", () => {
  it.each(["__proto__", "constructor", "toString", "hasOwnProperty"])(
    "stores an object with the id %s as a normal key",
    (id) => {
      const state = snapshotState(0, 0, [body(id, 1, 2), body("ball")]);
      expect(Object.keys(state.objects).sort()).toEqual([id, "ball"].sort());
      expect(Object.hasOwn(state.objects, id)).toBe(true);
      expect(state.objects[id]?.position).toEqual({ x: 1, y: 2 });
    },
  );

  it.each(["__proto__", "constructor", "toString", "valueOf"])(
    "returns undefined when looking up a missing id %s",
    (id) => {
      const state = snapshotState(0, 0, [body("ball")]);
      expect(state.objects[id]).toBeUndefined();
      expect(id in state.objects).toBe(false);
    },
  );

  it("still compares equal to a plain object with the same contents", () => {
    const state = snapshotState(3, 50, [body("ball", 1, 2)]);
    expect(state).toEqual({
      step: 3,
      timeMs: 50,
      objects: { ball: { position: { x: 1, y: 2 }, angle: 0 } },
    });
  });
});
