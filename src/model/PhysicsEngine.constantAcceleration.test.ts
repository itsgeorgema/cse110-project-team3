import { describe, expect, it } from "vitest";
import { PhysicsEngine } from "./PhysicsEngine.ts";

describe("constant-acceleration calculations (#17)", () => {
  it.each([
    [3, 18, 5, 25.5, 127.5],
    [0, 10, 4, 10, 40],
    [-2, 10, 3, 7, 21],
    [2, 0, 4, 4, 16],
    [3, 18, 0, 18, 0],
    [0, -5, 2, -5, -10],
  ])("a=%s, v0=%s, t=%s", (a, v0, t, average, distance) => {
    expect(PhysicsEngine.calculateAverageVelocity(a, v0, t)).toBe(average);
    expect(PhysicsEngine.calculateDistance(a, v0, t)).toBe(distance);
  });

  for (const method of [
    "calculateAverageVelocity",
    "calculateDistance",
  ] as const) {
    it.each([NaN, Infinity, -Infinity, "3", null, undefined])(
      `${method} rejects invalid arguments %s`,
      (invalid) => {
        for (let index = 0; index < 3; index++) {
          const args: [number, number, number] = [3, 18, 5];
          args[index] = invalid as number;
          expect(() => PhysicsEngine[method](...args)).toThrow();
        }
      },
    );
    it(`${method} rejects negative time and overflow`, () => {
      expect(() => PhysicsEngine[method](3, 18, -1)).toThrow(RangeError);
      expect(() => PhysicsEngine[method](Number.MAX_VALUE, 18, 5)).toThrow(
        RangeError,
      );
      expect(() =>
        PhysicsEngine[method](Number.MAX_VALUE, Number.MAX_VALUE, 1),
      ).toThrow(RangeError);
    });
  }
  it("rejects overflow in the final distance", () => {
    expect(() =>
      PhysicsEngine.calculateDistance(0, Number.MAX_VALUE, 2),
    ).toThrow(RangeError);
  });
});
