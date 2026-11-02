import { describe, expect, it } from "vitest";
import { PhysicsEngine } from "./PhysicsEngine";

/* Used in Vite to check if a decimal is within the expected value by
 * 10 ^ (-DECIMAL_PRECISION) / 2. Since DECIMAL_PRECISION = 6, we can be off
 * by the expected value by (10^(-6)) / 2. This is to ensure accuracy of
 * decimal calculations.
 */
const DECIMAL_PRECISION = 6;

describe("PhysicsEngine.multiply", () => {

  // Normal behavior
  it.each([
    [10, 2, 20],
    [-10, 2, -20],
    [-10, -2, 20],
    [5, 1, 5],
    [-5, 1, -5],
    [300, 2, 600],
    [5, 2, 10],
    [-5, 2, -10],
    [2562, 32, 81984],
    [2562, -32, -81984],
    [152526, 2434, 371248284],
    [-152526, 2434, -371248284],
    [-152526, -2434, 371248284],
    [1832649, 343, 628598607],
    [-1832649, 5343, -9791843607],
    [70290108, 278929, 19605949534332],
    [-70290108, 278929, -19605949534332],
    [0, 3252, 0],
    [-0, 635498352.24234, 0],
    [242.34522, 0, 0],
    [-3629.2342, 0, 0],
    [2.5, 2, 5],
    [-2.5, 2, -5],
    [322.4353, 2342.355, 755257.9371315],
    [322.4353, -2342.355, -755257.9371315],
    [68268.23543, 2521.1342, 172113383.116224706],
    [-68268.23543, 2521.1342, -172113383.116224706],
    [15252.2349141, 92347.8250721, 1408510721.805883],
    [15252.2349141, -92347.8250721, -1408510721.805883],
    [0.72421, 0.684893, 0.49600636],
    [0.72421, -0.684893, -0.49600636],
    [0.121519, 0.425828, 0.05174619],
    [-0.121519, 0.425828, -0.05174619]
  ])("multiplies numbers correctly / within error margin: %s * %s = %s", (a, b, c) => {
    expect(PhysicsEngine.multiply(a, b)).toBeCloseTo(c, DECIMAL_PRECISION);
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
  ])("rejects non-finite inputs: %s * %s", (a, b) => {
    expect(() => PhysicsEngine.multiply(a, b))
      .toThrow(/PhysicsEngine\.multiply input variable (a|b) must be finite/);
  });

  // Overflow
  it.each([
    [Number.MAX_VALUE, 2],
    [-Number.MAX_VALUE, 2],
    [1e300, 1e100],
    [-1e308, 1e10],
    [1e200, 1e200]
  ])("rejects infinite results: %s * %s", (a, b) => {
    expect(() => PhysicsEngine.multiply(a, b))
      .toThrow("PhysicsEngine.multiply produced a non-finite result.");
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
    expect(() => PhysicsEngine.multiply(a as number, b as number))
      .toThrow(/PhysicsEngine\.multiply input variable (a|b) must be a number/);
  });

  // Boundary values
  it("accepts Number.MAX_VALUE multiplied by 1", () => {
    expect(PhysicsEngine.multiply(Number.MAX_VALUE, 1)).toBe(Number.MAX_VALUE);
  });

  it("accepts Number.MIN_VALUE multiplied by 1", () => {
    expect(PhysicsEngine.multiply(Number.MIN_VALUE, 1)).toBe(Number.MIN_VALUE);
  });

  it("returns zero when Number.MAX_VALUE multiplied by zero", () => {
    expect(PhysicsEngine.multiply(Number.MAX_VALUE, 0)).toBe(0);
  });
});

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
    expect(PhysicsEngine.calculateVelocity(displacement, time)).toBeCloseTo(velocity, DECIMAL_PRECISION);
  });

  it.each([
    [0, 0],
    [516, 0],
    [516, -10],
    [516, -13532],
    [2432, -234251],
    [0, -1242423],
    [0, -0],
    [-0, -0],
    [-0, 0],
    [2345325, 0],
    [234532523, -433.1242134],
    [0.4252345432, -0.234532523],
    [0.2345325, -23452425.2523543],
    [Number.MAX_VALUE, -10],
    [Number.MIN_VALUE, -252.345]
  ])("rejects zero or negative time correctly: displacement of %s meters and time of %s sec, expect error", (displacement, time) => {
    expect(() => PhysicsEngine.calculateVelocity(displacement, time))
      .toThrow(`PhysicsEngine.calculateVelocity.time must be positive. Received: ${time}`);
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
    [-Number.MAX_VALUE, 0.5],
    [Number.MAX_VALUE, 0.42],
    [1e300, 1e-9],
    [-1e308, 1e-9],
    [1e100, 1e-300]
  ])("rejects infinite results: %s (displacement) / %s (time)", (displacement, time) => {
    expect(() => PhysicsEngine.calculateVelocity(displacement, time))
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

describe("PhysicsEngine.calculateDisplacement", () => {
  // Valid inputs
  it.each([
    [10, 5, 50],
    [-10, 5, -50],
    [10, 3, 30],
    [-10, 3, -30],
    [142, 5, 710],
    [-142, 5, -710],
    [21136596, 6123, 129419377308],
    [-21136596, 6123, -129419377308],
    [5334113, 817, 4357970321],
    [-5334113, 817, -4357970321],
    [0, 817, 0],
    [-0, 817, 0],
    [10.5, 2.5, 26.25],
    [-10.5, 2.5, -26.25],
    [0.1, 0.2, 0.02],
    [252, 0, 0],
    [25252, 0, 0],
    [-2342352, 0, 0],
    [-23425.43622, 0, 0],
    [9129.258158125, 0, 0],
    [-3838.1581, 0, 0]
  ])(
    "calculates displacement correctly: velocity of %s m/s and time of %s sec = %s meters",
    (velocity, time, displacement) => {
      expect(PhysicsEngine.calculateDisplacement(velocity, time))
        .toBeCloseTo(displacement, DECIMAL_PRECISION);
    }
  );

  // Negative time
  it.each([
    [0, -0.25252],
    [516, -240],
    [516, -10],
    [516, -13532],
    [2432, -234251],
    [0, -1242423],
    [0, -52],
    [-0, -6],
    [-0, -23452],
    [2345325, -15],
    [234532523, -433.1242134],
    [0.4252345432, -0.234532523],
    [0.2345325, -23452425.2523543],
    [Number.MAX_VALUE, -10],
    [Number.MIN_VALUE, -252.345]
  ])(
    "rejects negative time correctly: velocity of %s m/s and time of %s sec, expect error",
    (velocity, time) => {
      expect(() => PhysicsEngine.calculateDisplacement(velocity, time))
        .toThrow(`PhysicsEngine.calculateDisplacement.time must be >= 0. Received: ${time}`);
    }
  );

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
  ])(
    "rejects non-finite inputs: %s (velocity) / %s (time)",
    (velocity, time) => {
      expect(() => PhysicsEngine.calculateDisplacement(velocity, time))
        .toThrow(/PhysicsEngine\.calculateDisplacement input variable (velocity|time) must be finite/);
    }
  );

  // Overflow
  it.each([
    [Number.MAX_VALUE, 2],
    [-Number.MAX_VALUE, 2],
    [Number.MAX_VALUE, 10],
    [1e300, 1e9],
    [-1e308, 1e10],
    [1e100, 1e300]
  ])(
    "rejects infinite results: %s (velocity) / %s (time)",
    (velocity, time) => {
      expect(() => PhysicsEngine.calculateDisplacement(velocity, time))
        .toThrow("PhysicsEngine.multiply produced a non-finite result.");
    }
  );

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
  ])(
    "rejects invalid runtime types: %s (velocity) and %s (time)",
    (velocity, time) => {
      expect(() => PhysicsEngine.calculateDisplacement(velocity as number, time as number))
        .toThrow(/PhysicsEngine\.calculateDisplacement input variable (velocity|time) must be a number./);
    }
  );

  // Boundary values
  it("accepts Number.MAX_VALUE m/s multiplied by 1 sec", () => {
    expect(PhysicsEngine.calculateDisplacement(Number.MAX_VALUE, 1)).toBe(Number.MAX_VALUE);
  });

  it("accepts Number.MIN_VALUE m/s multiplied by 1 sec", () => {
    expect(PhysicsEngine.calculateDisplacement(Number.MIN_VALUE, 1)).toBe(Number.MIN_VALUE);
  });

  it("accepts zero velocity with Number.MAX_VALUE time", () => {
    expect(PhysicsEngine.calculateDisplacement(0, Number.MAX_VALUE)).toBe(0);
  });
});