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
    [-0.121519, 0.425828, -0.05174619],
  ])(
    "multiplies numbers correctly / within error margin: %s * %s = %s",
    (a, b, c) => {
      expect(PhysicsEngine.multiply(a, b)).toBeCloseTo(c, DECIMAL_PRECISION);
    },
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
    [NaN, NaN],
  ])("rejects non-finite inputs: %s * %s", (a, b) => {
    expect(() => PhysicsEngine.multiply(a, b)).toThrow(
      /PhysicsEngine\.multiply input variable (a|b) must be finite/,
    );
  });

  // Overflow
  it.each([
    [Number.MAX_VALUE, 2],
    [-Number.MAX_VALUE, 2],
    [1e300, 1e100],
    [-1e308, 1e10],
    [1e200, 1e200],
  ])("rejects infinite results: %s * %s", (a, b) => {
    expect(() => PhysicsEngine.multiply(a, b)).toThrow(
      "PhysicsEngine.multiply produced a non-finite result.",
    );
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
    [[], []],
  ])("rejects invalid runtime types: %s and %s", (a, b) => {
    expect(() => PhysicsEngine.multiply(a as number, b as number)).toThrow(
      /PhysicsEngine\.multiply input variable (a|b) must be a number/,
    );
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
    [-0, 635498352.24234, 0],
  ])(
    "divides numbers correctly / within error margin: %s / %s = %s",
    (a, b, c) => {
      expect(PhysicsEngine.divide(a, b)).toBeCloseTo(c, DECIMAL_PRECISION);
    },
  );

  it("allows small denominators: 1 / 0.000001 = 1000000", () => {
    expect(PhysicsEngine.divide(1, 0.000001)).toBe(1000000);
  });

  // Division by zero
  it("rejects division by positive zero 10 / 0", () => {
    expect(() => PhysicsEngine.divide(10, 0)).toThrow(
      "PhysicsEngine.divide: Cannot divide by zero.",
    );
  });

  it("rejects division by positive zero 0 / 0", () => {
    expect(() => PhysicsEngine.divide(0, 0)).toThrow(
      "PhysicsEngine.divide: Cannot divide by zero.",
    );
  });

  it("rejects division by negative zero 10 / -0", () => {
    expect(() => PhysicsEngine.divide(10, -0)).toThrow(
      "PhysicsEngine.divide: Cannot divide by zero.",
    );
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
    [NaN, NaN],
  ])("rejects non-finite inputs: %s / %s", (a, b) => {
    expect(() => PhysicsEngine.divide(a, b)).toThrow(
      /PhysicsEngine\.divide input variable (a|b) must be finite/,
    );
  });

  // Overflow
  it.each([
    [Number.MAX_VALUE, 0.5],
    [-Number.MAX_VALUE, -0.5],
    [Number.MAX_VALUE, 0.42],
    [1e300, 1e-9],
    [-1e308, -1e-9],
    [1e100, 1e-300],
  ])("rejects infinite results: %s / %s", (a, b) => {
    expect(() => PhysicsEngine.divide(a, b)).toThrow(
      "PhysicsEngine.divide produced a non-finite result.",
    );
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
    [[], []],
  ])("rejects invalid runtime types: %s and %s", (a, b) => {
    expect(() => PhysicsEngine.divide(a as number, b as number)).toThrow(
      /PhysicsEngine\.divide input variable (a|b) must be a number/,
    );
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
    [-0, 817, 0],
  ])(
    "calculates velocity correctly: displacement of %s meters and time of %s sec = %s m/s",
    (displacement, time, velocity) => {
      expect(PhysicsEngine.calculateVelocity(displacement, time)).toBeCloseTo(
        velocity,
        DECIMAL_PRECISION,
      );
    },
  );

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
    [Number.MIN_VALUE, -252.345],
  ])(
    "rejects zero or negative time correctly: displacement of %s meters and time of %s sec, expect error",
    (displacement, time) => {
      expect(() => PhysicsEngine.calculateVelocity(displacement, time)).toThrow(
        `PhysicsEngine.calculateVelocity.time must be positive. Received: ${time}`,
      );
    },
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
    [NaN, NaN],
  ])(
    "rejects non-finite inputs: %s (displacement) / %s (time)",
    (displacement, time) => {
      expect(() => PhysicsEngine.calculateVelocity(displacement, time)).toThrow(
        /PhysicsEngine\.calculateVelocity input variable (displacement|time) must be finite/,
      );
    },
  );

  // Overflow
  it.each([
    [Number.MAX_VALUE, 0.5],
    [-Number.MAX_VALUE, 0.5],
    [Number.MAX_VALUE, 0.42],
    [1e300, 1e-9],
    [-1e308, 1e-9],
    [1e100, 1e-300],
  ])(
    "rejects infinite results: %s (displacement) / %s (time)",
    (displacement, time) => {
      expect(() => PhysicsEngine.calculateVelocity(displacement, time)).toThrow(
        "PhysicsEngine.divide produced a non-finite result.",
      );
    },
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
    [[], []],
  ])(
    "rejects invalid runtime types: %s (displacement) and %s (time)",
    (displacement, time) => {
      expect(() =>
        PhysicsEngine.calculateVelocity(displacement as number, time as number),
      ).toThrow(
        /PhysicsEngine\.calculateVelocity input variable (displacement|time) must be a number./,
      );
    },
  );

  // Boundary values
  it("accepts Number.MAX_VALUE meters (displacement) divided by 1 sec (time)", () => {
    expect(PhysicsEngine.calculateVelocity(Number.MAX_VALUE, 1)).toBe(
      Number.MAX_VALUE,
    );
  });

  it("accepts Number.MIN_VALUE meters divided by Number.MIN_VALUE sec", () => {
    expect(
      PhysicsEngine.calculateVelocity(Number.MIN_VALUE, Number.MIN_VALUE),
    ).toBe(1);
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
    [-3838.1581, 0, 0],
  ])(
    "calculates displacement correctly: velocity of %s m/s and time of %s sec = %s meters",
    (velocity, time, displacement) => {
      expect(PhysicsEngine.calculateDisplacement(velocity, time)).toBeCloseTo(
        displacement,
        DECIMAL_PRECISION,
      );
    },
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
    [Number.MIN_VALUE, -252.345],
  ])(
    "rejects negative time correctly: velocity of %s m/s and time of %s sec, expect error",
    (velocity, time) => {
      expect(() => PhysicsEngine.calculateDisplacement(velocity, time)).toThrow(
        `PhysicsEngine.calculateDisplacement.time must be >= 0. Received: ${time}`,
      );
    },
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
    [NaN, NaN],
  ])(
    "rejects non-finite inputs: %s (velocity) / %s (time)",
    (velocity, time) => {
      expect(() => PhysicsEngine.calculateDisplacement(velocity, time)).toThrow(
        /PhysicsEngine\.calculateDisplacement input variable (velocity|time) must be finite/,
      );
    },
  );

  // Overflow
  it.each([
    [Number.MAX_VALUE, 2],
    [-Number.MAX_VALUE, 2],
    [Number.MAX_VALUE, 10],
    [1e300, 1e9],
    [-1e308, 1e10],
    [1e100, 1e300],
  ])(
    "rejects infinite results: %s (velocity) / %s (time)",
    (velocity, time) => {
      expect(() => PhysicsEngine.calculateDisplacement(velocity, time)).toThrow(
        "PhysicsEngine.multiply produced a non-finite result.",
      );
    },
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
    [[], []],
  ])(
    "rejects invalid runtime types: %s (velocity) and %s (time)",
    (velocity, time) => {
      expect(() =>
        PhysicsEngine.calculateDisplacement(velocity as number, time as number),
      ).toThrow(
        /PhysicsEngine\.calculateDisplacement input variable (velocity|time) must be a number./,
      );
    },
  );

  // Boundary values
  it("accepts Number.MAX_VALUE m/s multiplied by 1 sec", () => {
    expect(PhysicsEngine.calculateDisplacement(Number.MAX_VALUE, 1)).toBe(
      Number.MAX_VALUE,
    );
  });

  it("accepts Number.MIN_VALUE m/s multiplied by 1 sec", () => {
    expect(PhysicsEngine.calculateDisplacement(Number.MIN_VALUE, 1)).toBe(
      Number.MIN_VALUE,
    );
  });

  it("accepts zero velocity with Number.MAX_VALUE time", () => {
    expect(PhysicsEngine.calculateDisplacement(0, Number.MAX_VALUE)).toBe(0);
  });
});

describe("PhysicsEngine.subtract", () => {
  // Normal behavior
  it.each([
    [10, 2, 8],
    [-10, 2, -12],
    [-10, -2, -8],
    [2, 10, -8],
    [5, 1, 4],
    [-5, 1, -6],
    [300, 2, 298],
    [2562, 32, 2530],
    [2562, -32, 2594],
    [152526, 2434, 150092],
    [-152526, 2434, -154960],
    [-152526, -2434, -150092],
    [1832649, 343, 1832306],
    [-1832649, 5343, -1837992],
    [70290108, 278929, 70011179],
    [-70290108, 278929, -70569037],
    [0, 3252, -3252],
    [-0, 635498352.24234, -635498352.24234],
    [242.34522, 0, 242.34522],
    [-3629.2342, 0, -3629.2342],
    [2.5, 2, 0.5],
    [-2.5, 2, -4.5],
    [0.3, 0.1, 0.2],
    [322.4353, 2342.355, -2019.9197],
    [322.4353, -2342.355, 2664.7903],
    [15252.2349141, 92347.8250721, -77095.590158],
    [0.72421, 0.684893, 0.039317],
    [0.72421, -0.684893, 1.409103],
    [-0.121519, 0.425828, -0.547347],
    [7, 7, 0],
  ])(
    "subtracts numbers correctly / within error margin: %s - %s = %s",
    (a, b, c) => {
      expect(PhysicsEngine.subtract(a, b)).toBeCloseTo(c, DECIMAL_PRECISION);
    },
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
    [NaN, NaN],
  ])("rejects non-finite inputs: %s - %s", (a, b) => {
    expect(() => PhysicsEngine.subtract(a, b)).toThrow(
      /PhysicsEngine\.subtract input variable (a|b) must be finite/,
    );
  });

  // Overflow
  it.each([
    [Number.MAX_VALUE, -Number.MAX_VALUE],
    [-Number.MAX_VALUE, Number.MAX_VALUE],
    [1e308, -1e308],
    [-1e308, 1e308],
    [1.5e308, -1.5e308],
  ])("rejects infinite results: %s - %s", (a, b) => {
    expect(() => PhysicsEngine.subtract(a, b)).toThrow(
      "PhysicsEngine.subtract produced a non-finite result.",
    );
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
    [[], []],
  ])("rejects invalid runtime types: %s and %s", (a, b) => {
    expect(() => PhysicsEngine.subtract(a as number, b as number)).toThrow(
      /PhysicsEngine\.subtract input variable (a|b) must be a number/,
    );
  });

  // Boundary values
  it("accepts Number.MAX_VALUE minus zero", () => {
    expect(PhysicsEngine.subtract(Number.MAX_VALUE, 0)).toBe(Number.MAX_VALUE);
  });

  it("returns zero when Number.MAX_VALUE is subtracted from itself", () => {
    expect(PhysicsEngine.subtract(Number.MAX_VALUE, Number.MAX_VALUE)).toBe(0);
  });

  it("returns zero when Number.MIN_VALUE is subtracted from itself", () => {
    expect(PhysicsEngine.subtract(Number.MIN_VALUE, Number.MIN_VALUE)).toBe(0);
  });

  it("accepts zero minus Number.MIN_VALUE", () => {
    expect(PhysicsEngine.subtract(0, Number.MIN_VALUE)).toBe(-Number.MIN_VALUE);
  });
});

describe("PhysicsEngine.calculateAcceleration", () => {
  // Normal behavior
  it.each([
    [10, 30, 5, 4],
    [30, 10, 5, -4],
    [10, 10, 5, 0],
    [0, 100, 10, 10],
    [-10, 10, 4, 5],
    [-20, -5, 3, 5],
    [0, 9.81, 1, 9.81],
    [5, 7.5, 2.5, 1],
    [0, 1, 3, 0.3333333333],
    [0.5, 0.75, 0.25, 1],
    [100, 0, 4, -25],
    [-0, 5, 5, 1],
    [12, 47, 7, 5],
    [-30, -50, 2, -10],
  ])(
    "calculates acceleration correctly: %s to %s m/s in %s sec = %s m/s^2",
    (initialVelocity, finalVelocity, time, acceleration) => {
      expect(
        PhysicsEngine.calculateAcceleration(
          initialVelocity,
          finalVelocity,
          time,
        ),
      ).toBeCloseTo(acceleration, DECIMAL_PRECISION);
    },
  );

  // Zero or negative time
  it.each([
    [10, 30, 0],
    [10, 30, -5],
    [0, 0, 0],
    [10, 30, -0],
    [10, 30, -0.001],
    [Number.MAX_VALUE, 0, -10],
    [10, 30, -Number.MAX_VALUE],
  ])(
    "rejects zero or negative time: %s to %s m/s in %s sec, expect error",
    (initialVelocity, finalVelocity, time) => {
      expect(() =>
        PhysicsEngine.calculateAcceleration(
          initialVelocity,
          finalVelocity,
          time,
        ),
      ).toThrow(
        /PhysicsEngine\.calculateAcceleration\.time must be (positive|> 0)\. Received: /,
      );
    },
  );

  // Non-finite inputs
  it.each([
    [NaN, 30, 5],
    [10, NaN, 5],
    [10, 30, NaN],
    [Infinity, 30, 5],
    [-Infinity, 30, 5],
    [10, Infinity, 5],
    [10, -Infinity, 5],
    [10, 30, Infinity],
    [10, 30, -Infinity],
    [NaN, NaN, NaN],
    [Infinity, Infinity, Infinity],
  ])(
    "rejects non-finite inputs: %s (initial velocity), %s (final velocity), %s (time)",
    (initialVelocity, finalVelocity, time) => {
      expect(() =>
        PhysicsEngine.calculateAcceleration(
          initialVelocity,
          finalVelocity,
          time,
        ),
      ).toThrow(
        /PhysicsEngine\.calculateAcceleration input variable (initial.?[vV]elocity|final.?[vV]elocity|time) must be finite/,
      );
    },
  );

  // Overflow
  it.each([
    [-Number.MAX_VALUE, Number.MAX_VALUE, 1, "subtract"],
    [Number.MAX_VALUE, -Number.MAX_VALUE, 1, "subtract"],
    [1e308, -1e308, 1, "subtract"],
    [0, Number.MAX_VALUE, 0.5, "divide"],
    [0, -Number.MAX_VALUE, 0.5, "divide"],
    [0, 1e300, 1e-9, "divide"],
    [0, 10, Number.MIN_VALUE, "divide"],
  ])(
    "rejects infinite results: %s to %s m/s in %s sec (thrown by %s)",
    (initialVelocity, finalVelocity, time, operation) => {
      expect(() =>
        PhysicsEngine.calculateAcceleration(
          initialVelocity,
          finalVelocity,
          time,
        ),
      ).toThrow(`PhysicsEngine.${operation} produced a non-finite result.`);
    },
  );

  // Runtime type validation
  it.each([
    ["10", 30, 5],
    [10, "30", 5],
    [10, 30, "5"],
    [null, 30, 5],
    [10, null, 5],
    [10, 30, null],
    [undefined, 30, 5],
    [10, undefined, 5],
    [10, 30, undefined],
    [true, 30, 5],
    ["3343.3a", "4543.a", "5"],
    [[], 30, 5],
    [{}, 30, 5],
    [10, [], 5],
    [10, 30, {}],
    [[], {}, []],
  ])(
    "rejects invalid runtime types: %s, %s, and %s",
    (initialVelocity, finalVelocity, time) => {
      expect(() =>
        PhysicsEngine.calculateAcceleration(
          initialVelocity as number,
          finalVelocity as number,
          time as number,
        ),
      ).toThrow(
        /PhysicsEngine\.calculateAcceleration input variable (initial.?[vV]elocity|final.?[vV]elocity|time) must be a number/,
      );
    },
  );

  // Boundary values
  it("returns zero when Number.MAX_VALUE velocity does not change", () => {
    expect(
      PhysicsEngine.calculateAcceleration(
        Number.MAX_VALUE,
        Number.MAX_VALUE,
        1,
      ),
    ).toBe(0);
  });

  it("accepts a change of Number.MAX_VALUE m/s in 1 sec", () => {
    expect(PhysicsEngine.calculateAcceleration(0, Number.MAX_VALUE, 1)).toBe(
      Number.MAX_VALUE,
    );
  });

  it("accepts Number.MAX_VALUE m/s change in Number.MAX_VALUE sec", () => {
    expect(
      PhysicsEngine.calculateAcceleration(
        0,
        Number.MAX_VALUE,
        Number.MAX_VALUE,
      ),
    ).toBe(1);
  });

  it("accepts no velocity change over Number.MIN_VALUE sec", () => {
    expect(PhysicsEngine.calculateAcceleration(0, 0, Number.MIN_VALUE)).toBe(0);
  });
});

describe("PhysicsEngine.calculateForce", () => {
  // Normal behavior (force = mass * acceleration)
  it.each([
    [10, 2, 20],
    [10, -2, -20],
    [5, 1, 5],
    [300, 2, 600],
    [2562, 32, 81984],
    [2562, -32, -81984],
    [152526, 2434, 371248284],
    [1832649, 343, 628598607],
    [70290108, 278929, 19605949534332],
    [0.5, 4, 2],
    [2.5, 2, 5],
    [322.4353, 2342.355, 755257.9371315],
    [322.4353, -2342.355, -755257.9371315],
    [0.72421, 0.684893, 0.49600636],
    [0.72421, -0.684893, -0.49600636],
    [0.121519, 0.425828, 0.05174619],
    // Weight of a crate on Earth (acceleration from gravity of 9.81 m/s^2)
    [5, 9.81, 49.05],
    [18, 9.81, 176.58],
    [30, 9.81, 294.3],
    [7, 9.81, 68.67],
    // No acceleration means no force
    [10, 0, 0],
    [242.34522, 0, 0],
  ])(
    "calculates force correctly: mass of %s kg and acceleration of %s m/s^2 = %s N",
    (mass, acceleration, force) => {
      expect(PhysicsEngine.calculateForce(mass, acceleration)).toBeCloseTo(
        force,
        DECIMAL_PRECISION,
      );
    },
  );

  // Zero or negative mass
  it.each([
    [0, 0],
    [0, 9.81],
    [-0, 9.81],
    [-1, 9.81],
    [-50, 9.81],
    [-1e300, 9.81],
    [-Number.MAX_VALUE, 2],
  ])(
    "rejects zero or negative mass: mass of %s kg and acceleration of %s m/s^2, expect error",
    (mass, acceleration) => {
      expect(() => PhysicsEngine.calculateForce(mass, acceleration)).toThrow(
        /PhysicsEngine\.calculateForce\.mass must be (positive|> 0)\. Received: /,
      );
    },
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
    [NaN, NaN],
  ])(
    "rejects non-finite inputs: %s (mass) and %s (acceleration)",
    (mass, acceleration) => {
      expect(() => PhysicsEngine.calculateForce(mass, acceleration)).toThrow(
        /PhysicsEngine\.calculateForce input variable (mass|acceleration) must be finite/,
      );
    },
  );

  // Overflow (the error comes from PhysicsEngine.multiply)
  it.each([
    [Number.MAX_VALUE, 2],
    [Number.MAX_VALUE, -2],
    [1e300, 1e100],
    [1e308, 10],
    [1e200, 1e200],
  ])(
    "rejects infinite results: %s (mass) and %s (acceleration)",
    (mass, acceleration) => {
      expect(() => PhysicsEngine.calculateForce(mass, acceleration)).toThrow(
        "PhysicsEngine.multiply produced a non-finite result.",
      );
    },
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
    [[], []],
  ])(
    "rejects invalid runtime types: %s (mass) and %s (acceleration)",
    (mass, acceleration) => {
      expect(() =>
        PhysicsEngine.calculateForce(mass as number, acceleration as number),
      ).toThrow(
        /PhysicsEngine\.calculateForce input variable (mass|acceleration) must be a number/,
      );
    },
  );

  // Boundary values
  it("accepts a Number.MAX_VALUE mass with an acceleration of 1 m/s^2", () => {
    expect(PhysicsEngine.calculateForce(Number.MAX_VALUE, 1)).toBe(
      Number.MAX_VALUE,
    );
  });

  it("returns zero when a Number.MAX_VALUE mass has no acceleration", () => {
    expect(PhysicsEngine.calculateForce(Number.MAX_VALUE, 0)).toBe(0);
  });

  it("accepts a Number.MIN_VALUE mass with an acceleration of 1 m/s^2", () => {
    expect(PhysicsEngine.calculateForce(Number.MIN_VALUE, 1)).toBe(
      Number.MIN_VALUE,
    );
  });

  it("accepts a Number.MIN_VALUE mass with a negative acceleration", () => {
    expect(PhysicsEngine.calculateForce(Number.MIN_VALUE, -1)).toBe(
      -Number.MIN_VALUE,
    );
  });
});

describe("PhysicsEngine.calculateNetForce", () => {
  // Normal behavior (net force = normal force - gravitational force)
  it.each([
    [10, 2, 8],
    [-10, 2, -12],
    [-10, -2, -8],
    [2, 10, -8],
    [5, 1, 4],
    [-5, 1, -6],
    [300, 2, 298],
    [2562, 32, 2530],
    [2562, -32, 2594],
    [152526, 2434, 150092],
    [-152526, 2434, -154960],
    [-152526, -2434, -150092],
    [1832649, 343, 1832306],
    [-1832649, 5343, -1837992],
    [70290108, 278929, 70011179],
    [-70290108, 278929, -70569037],
    [0, 3252, -3252],
    [-0, 635498352.24234, -635498352.24234],
    [242.34522, 0, 242.34522],
    [-3629.2342, 0, -3629.2342],
    [2.5, 2, 0.5],
    [-2.5, 2, -4.5],
    [0.3, 0.1, 0.2],
    [322.4353, 2342.355, -2019.9197],
    [322.4353, -2342.355, 2664.7903],
    [15252.2349141, 92347.8250721, -77095.590158],
    [0.72421, 0.684893, 0.039317],
    [0.72421, -0.684893, 1.409103],
    [-0.121519, 0.425828, -0.547347],
    [7, 7, 0],
    // Crate at rest: the normal force balances the weight
    [176.58, 176.58, 0],
    [294.3, 294.3, 0],
    // Forces that do not cancel, so a flipped sign would fail
    [50, 49, 1],
    [49, 50, -1],
    [0, 176.58, -176.58],
  ])(
    "calculates net force correctly: normal force of %s N and gravitational force of %s N = %s N",
    (normalForce, gravitationalForce, netForce) => {
      expect(
        PhysicsEngine.calculateNetForce(normalForce, gravitationalForce),
      ).toBeCloseTo(netForce, DECIMAL_PRECISION);
    },
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
    [NaN, NaN],
  ])(
    "rejects non-finite inputs: %s (normal force) and %s (gravitational force)",
    (normalForce, gravitationalForce) => {
      expect(() =>
        PhysicsEngine.calculateNetForce(normalForce, gravitationalForce),
      ).toThrow(
        /PhysicsEngine\.calculateNetForce input variable (normal.?[fF]orce|gravitational.?[fF]orce) must be finite/,
      );
    },
  );

  // Overflow (the error comes from PhysicsEngine.subtract)
  it.each([
    [Number.MAX_VALUE, -Number.MAX_VALUE],
    [-Number.MAX_VALUE, Number.MAX_VALUE],
    [1e308, -1e308],
    [-1e308, 1e308],
    [1.5e308, -1.5e308],
  ])(
    "rejects infinite results: %s (normal force) and %s (gravitational force)",
    (normalForce, gravitationalForce) => {
      expect(() =>
        PhysicsEngine.calculateNetForce(normalForce, gravitationalForce),
      ).toThrow("PhysicsEngine.subtract produced a non-finite result.");
    },
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
    [[], []],
  ])(
    "rejects invalid runtime types: %s (normal force) and %s (gravitational force)",
    (normalForce, gravitationalForce) => {
      expect(() =>
        PhysicsEngine.calculateNetForce(
          normalForce as number,
          gravitationalForce as number,
        ),
      ).toThrow(
        /PhysicsEngine\.calculateNetForce input variable (normal.?[fF]orce|gravitational.?[fF]orce) must be a number/,
      );
    },
  );

  // Boundary values
  it("accepts a Number.MAX_VALUE normal force with no gravitational force", () => {
    expect(PhysicsEngine.calculateNetForce(Number.MAX_VALUE, 0)).toBe(
      Number.MAX_VALUE,
    );
  });

  it("returns zero when Number.MAX_VALUE normal and gravitational forces balance", () => {
    expect(
      PhysicsEngine.calculateNetForce(Number.MAX_VALUE, Number.MAX_VALUE),
    ).toBe(0);
  });

  it("returns zero when Number.MIN_VALUE normal and gravitational forces balance", () => {
    expect(
      PhysicsEngine.calculateNetForce(Number.MIN_VALUE, Number.MIN_VALUE),
    ).toBe(0);
  });

  it("accepts no normal force with a Number.MIN_VALUE gravitational force", () => {
    expect(PhysicsEngine.calculateNetForce(0, Number.MIN_VALUE)).toBe(
      -Number.MIN_VALUE,
    );
  });
});
