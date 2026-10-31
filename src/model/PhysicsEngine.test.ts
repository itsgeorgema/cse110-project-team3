import { describe, expect, it } from "vitest";
import { PhysicsEngine } from "./PhysicsEngine";

/* Used in Vite to check if a decimal is within the expected value by
 * 10 ^ (-DECIMAL_PRECISION) / 2. Since DECIMAL_PRECISION = 6, we can be off
 * by the expected value by (10^(-6)) / 2. This is to ensure accuracy of
 * decimal calculations.
 */
const DECIMAL_PRECISION = 6;

describe("PhysicsEngine.divide", () => {

  // Normal behavior
  it.each([
    [10, 2, 5],
    [-10, 2, -5],
    [-10, -2, 5],
    [5, 1, 5],
    [-5, 1, -5],
    [300, 2, 150],
    [5, 2, 2.5],
    [-5, 2, -2.5],
    [2562, 32, 80.0625],
    [2562, -32, -80.0625],
    [152526, 2434, 62.6647493837],
    [-152526, 2434, -62.6647493837],
    [-152526, -2434, 62.6647493837],
    [1832649, 343, 5343],
    [-1832649, 5343, -343],
    [70290108, 278929, 252],
    [-70290108, 278929, -252],
    [52859234, 73473, 719.4375348768],
    [52859234, -719.4375348768, -73472.9999999957],
    [0, 3252, 0],
    [-0, 635498352.24234, 0]
  ])("divides numbers correctly / within error margin: %s / %s = %s", (a, b, c) => {
    expect(PhysicsEngine.divide(a, b)).toBeCloseTo(c, DECIMAL_PRECISION);
  });

  it("allows small denominators: 1 / 0.000001 = 1000000", () => {
    expect(PhysicsEngine.divide(1, 0.000001)).toBe(1000000);
  });

  // Division by zero
  it("rejects division by positive zero 10 / 0", () => {
    expect(() => PhysicsEngine.divide(10, 0))
      .toThrow("PhysicsEngine.divide: Cannot divide by zero.");
  });

  it("rejects division by positive zero 0 / 0", () => {
    expect(() => PhysicsEngine.divide(0, 0))
      .toThrow("PhysicsEngine.divide: Cannot divide by zero.");
  });

  it("rejects division by negative zero 10 / -0", () => {
    expect(() => PhysicsEngine.divide(10, -0))
      .toThrow("PhysicsEngine.divide: Cannot divide by zero.");
  });

  // Non-finite inputs
  it.each([
    [NaN, 2],
    [10, NaN],
    [Infinity, 2],
    [-Infinity, 2],
    [10, Infinity],
    [10, -Infinity],
    [Infinity, Infinity],
    [Infinity, NaN],
    [NaN, Infinity],
    [Infinity, -Infinity],
    [-Infinity, -Infinity],
    [NaN, NaN]
  ])("rejects non-finite inputs: %s / %s", (a, b) => {
    expect(() => PhysicsEngine.divide(a, b))
      .toThrow(/PhysicsEngine\.divide input variable (a|b) must be finite/);
  });

  // Overflow
  it.each([
    [Number.MAX_VALUE, 0.5],
    [-Number.MAX_VALUE, -0.5],
    [Number.MAX_VALUE, 0.42],
    [1e300, 1e-9],
    [-1e308, -1e-9],
    [1e100, 1e-300]
  ])("rejects infinite results: %s / %s", (a, b) => {
    expect(() => PhysicsEngine.divide(a, b))
      .toThrow("PhysicsEngine.divide produced a non-finite result.");
  });

  // Runtime type validation
  it.each([
    ["10", 2],
    [10, "2"],
    [null, 2],
    [10, null],
    [undefined, 2],
    [10, undefined],
    [true, 2],
    ["3343.3a", "4543.a"],
    ["343432.aa", 3343.335],
    [[], 2],
    [{}, 2],
    [[], {}],
    [[], []]
  ])("rejects invalid runtime types: %s and %s", (a, b) => {
    expect(() => PhysicsEngine.divide(a as number, b as number))
      .toThrow(/PhysicsEngine\.divide input variable (a|b) must be a number/);
  });

  // Boundary values
  it("accepts Number.MAX_VALUE divided by 1", () => {
    expect(PhysicsEngine.divide(Number.MAX_VALUE, 1)).toBe(Number.MAX_VALUE);
  });

  it("accepts Number.MIN_VALUE divided by itself", () => {
    expect(PhysicsEngine.divide(Number.MIN_VALUE, Number.MIN_VALUE)).toBe(1);
  });
});


describe("PhysicsEngine.calculateVelocity", () => {
  it.each([
    [10, 5, 2],
    [-10, 5, -2],
    [10, 3, 3.333333333],
    [-10, 3, -3.333333333],
    [142, 5, 28.4],
    [-142, 5, -28.4],
    [21136596, 6123, 3452],
    [-21136596, 6123, -3452],
    [5334113, 817, 6528.902080783],
    [-5334113, 817, -6528.902080783],
    [0, 817, 0],
    [-0, 817, 0]
  ])("calculates velocity correctly: displacement of %s meters and time of %s sec = %s m/s", (displacement, time, velocity) => {
    expect(PhysicsEngine.divide(displacement, time)).toBeCloseTo(velocity, DECIMAL_PRECISION);
  });

  it("test displacement of 0meters and time of 0sec, expect error", () => {
    const displacement = 0;
    const time = 0;
    expect(() => PhysicsEngine.calculateVelocity(displacement, time)).
      toThrow("PhysicsEngine.calculateVelocity.time must be positive. Received: 0");
  });

  it("test displacement of 516meters and time of 0sec, expect error", () => {
    const displacement = 516;
    const time = 0;
    expect(() => PhysicsEngine.calculateVelocity(displacement, time)).
      toThrow("PhysicsEngine.calculateVelocity.time must be positive. Received: 0");
  });

  // Non-finite inputs
  it.each([
    [NaN, 2],
    [10, NaN],
    [Infinity, 2],
    [-Infinity, 2],
    [10, Infinity],
    [10, -Infinity],
    [Infinity, Infinity],
    [Infinity, NaN],
    [NaN, Infinity],
    [Infinity, -Infinity],
    [-Infinity, -Infinity],
    [NaN, NaN]
  ])("rejects non-finite inputs: %s (displacement) / %s (time)", (displacement, time) => {
    expect(() => PhysicsEngine.calculateVelocity(displacement, time))
      .toThrow(/PhysicsEngine\.calculateVelocity input variable (displacement|time) must be finite/);
  });

  // Overflow
  it.each([
    [Number.MAX_VALUE, 0.5],
    [-Number.MAX_VALUE, -0.5],
    [Number.MAX_VALUE, 0.42],
    [1e300, 1e-9],
    [-1e308, -1e-9],
    [1e100, 1e-300]
  ])("rejects infinite results: %s (displacement) / %s (time)", (displacement, time) => {
    expect(() => PhysicsEngine.divide(displacement, time))
      .toThrow("PhysicsEngine.divide produced a non-finite result.");
  });

  // Runtime type validation
  it.each([
    ["10", 2],
    [10, "2"],
    [null, 2],
    [10, null],
    [undefined, 2],
    [10, undefined],
    [true, 2],
    ["3343.3a", "4543.a"],
    ["343432.aa", 3343.335],
    [[], 2],
    [{}, 2],
    [[], {}],
    [[], []]
  ])("rejects invalid runtime types: %s (displacement) and %s (time)", (displacement, time) => {
    expect(() => PhysicsEngine.calculateVelocity(displacement as number, time as number))
      .toThrow(/PhysicsEngine\.calculateVelocity input variable (displacement|time) must be a number./);
  });

  // Boundary values
  it("accepts Number.MAX_VALUE meters (displacement) divided by 1 sec (time)", () => {
    expect(PhysicsEngine.calculateVelocity(Number.MAX_VALUE, 1)).toBe(Number.MAX_VALUE);
  });

  it("accepts Number.MIN_VALUE meters divided by Number.MIN_VALUE sec", () => {
    expect(PhysicsEngine.calculateVelocity(Number.MIN_VALUE, Number.MIN_VALUE)).toBe(1);
  });
});