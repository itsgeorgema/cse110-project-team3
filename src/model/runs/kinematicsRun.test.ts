import { describe, expect, it } from "vitest";
import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import { DEFAULT_STEP_MS } from "../SimulationRunner.ts";
import {
  buildKinematicsLevel1Run,
  buildKinematicsLevel2Run,
  buildKinematicsLevel3Run,
  buildKinematicsLevel4Run,
  CAR_ID,
} from "./kinematicsRun.ts";

const level = {
  gameId: "kinematics",
  levelId: 1,
  problemStatementVariablesValues: { displacement: 10, time: 2 },
} as unknown as LevelDataConfig;

function submit(velocity: number) {
  return {
    gameId: "kinematics",
    levelId: 1,
    values: { velocity },
    units: { velocity: "m/s" },
  };
}

function carX(states: ReturnType<typeof buildKinematicsLevel1Run>, i: number) {
  return states[i].objects[CAR_ID].position.x;
}

describe("buildKinematicsLevel1Run", () => {
  it("starts the car at x = 0 on the ground at time 0", () => {
    const states = buildKinematicsLevel1Run(submit(5), level);

    expect(states[0].step).toBe(0);
    expect(states[0].timeMs).toBe(0);
    expect(states[0].objects[CAR_ID].position).toEqual({ x: 0, y: 0 });
  });

  it("ends exactly at the level's time, at velocity times time", () => {
    const states = buildKinematicsLevel1Run(submit(5), level);
    const last = states[states.length - 1];

    expect(last.timeMs).toBe(2000);
    expect(carX(states, states.length - 1)).toBeCloseTo(10, 10);
  });

  it("puts a wrong velocity's car short of the gate", () => {
    const states = buildKinematicsLevel1Run(submit(3), level);

    expect(carX(states, states.length - 1)).toBeCloseTo(6, 10);
  });

  it("steps at 60 frames per second with increasing time", () => {
    const states = buildKinematicsLevel1Run(submit(5), level);

    expect(states[1].timeMs).toBeCloseTo(DEFAULT_STEP_MS, 10);
    expect(states).toHaveLength(Math.ceil(2000 / DEFAULT_STEP_MS) + 1);
    for (let i = 1; i < states.length; i++) {
      expect(states[i].timeMs).toBeGreaterThan(states[i - 1].timeMs);
    }
  });

  it("keeps a final frame for a time that is not a whole number of steps", () => {
    const states = buildKinematicsLevel1Run(submit(4), {
      ...level,
      problemStatementVariablesValues: { displacement: 4, time: 1.005 },
    });

    expect(states[states.length - 1].timeMs).toBeCloseTo(1005, 9);
    expect(carX(states, states.length - 1)).toBeCloseTo(4.02, 10);
  });

  it("rejects a velocity that is not a finite number", () => {
    expect(() => buildKinematicsLevel1Run(submit(Number.NaN), level)).toThrow(
      /velocity/,
    );
  });

  it.each([0, -1, Number.POSITIVE_INFINITY, Number.NaN])(
    "rejects a level time of %s",
    (time) => {
      expect(() =>
        buildKinematicsLevel1Run(submit(5), {
          ...level,
          problemStatementVariablesValues: { displacement: 10, time },
        }),
      ).toThrow(/time/);
    },
  );
});

const level2 = {
  gameId: "kinematics",
  levelId: 2,
  problemStatementVariablesValues: { velocity: 6, time: 3 },
} as unknown as LevelDataConfig;

function submitDisplacement(displacement: number) {
  return {
    gameId: "kinematics",
    levelId: 2,
    values: { displacement },
    units: { displacement: "m" },
  };
}

describe("buildKinematicsLevel2Run", () => {
  it("drives at a steady speed from 0 to the player's displacement", () => {
    const states = buildKinematicsLevel2Run(submitDisplacement(18), level2);
    const last = states.length - 1;

    expect(carX(states, 0)).toBe(0);
    expect(states[last].timeMs).toBe(3000);
    expect(carX(states, last)).toBeCloseTo(18, 10);
    const half = states.findIndex((s) => s.timeMs >= 1500);
    expect(carX(states, half)).toBeCloseTo(
      (18 * states[half].timeMs) / 3000,
      10,
    );
  });

  it("stops a wrong displacement where the player said", () => {
    const states = buildKinematicsLevel2Run(submitDisplacement(10), level2);

    expect(carX(states, states.length - 1)).toBeCloseTo(10, 10);
  });

  it("rejects a displacement that is not a finite number", () => {
    expect(() =>
      buildKinematicsLevel2Run(submitDisplacement(Number.NaN), level2),
    ).toThrow(/displacement/);
  });

  it("rejects a level time of 0", () => {
    expect(() =>
      buildKinematicsLevel2Run(submitDisplacement(18), {
        ...level2,
        problemStatementVariablesValues: { velocity: 6, time: 0 },
      }),
    ).toThrow(/time/);
  });
});

const level3 = {
  gameId: "kinematics",
  levelId: 3,
  problemStatementVariablesValues: {
    initialVelocity: 5,
    finalVelocity: 13,
    time: 4,
  },
} as unknown as LevelDataConfig;

function submitAcceleration(acceleration: number) {
  return {
    gameId: "kinematics",
    levelId: 3,
    values: { acceleration },
    units: { acceleration: "m/s^2" },
  };
}

describe("buildKinematicsLevel3Run", () => {
  it("ends the right acceleration at the average velocity times time", () => {
    const states = buildKinematicsLevel3Run(submitAcceleration(2), level3);
    const last = states.length - 1;

    expect(carX(states, 0)).toBe(0);
    expect(states[last].timeMs).toBe(4000);
    // (5 + 13) / 2 * 4 = 36 m, the same as 5 * 4 + 2 * 16 / 2.
    expect(carX(states, last)).toBeCloseTo(36, 10);
  });

  it("speeds up: each frame covers more road than the one before", () => {
    const states = buildKinematicsLevel3Run(submitAcceleration(2), level3);

    for (let i = 2; i < states.length - 1; i++) {
      const before = carX(states, i - 1) - carX(states, i - 2);
      const now = carX(states, i) - carX(states, i - 1);
      expect(now).toBeGreaterThan(before);
    }
  });

  it("puts a too-small acceleration short of the right spot", () => {
    const states = buildKinematicsLevel3Run(submitAcceleration(1), level3);

    expect(carX(states, states.length - 1)).toBeCloseTo(28, 10);
  });

  it("rejects an acceleration that is not a finite number", () => {
    expect(() =>
      buildKinematicsLevel3Run(submitAcceleration(Number.NaN), level3),
    ).toThrow(/acceleration/);
  });

  it("rejects a level with no initial velocity", () => {
    expect(() =>
      buildKinematicsLevel3Run(submitAcceleration(2), {
        ...level3,
        problemStatementVariablesValues: { time: 4 },
      }),
    ).toThrow(/initialVelocity/);
  });
});

const level4 = {
  gameId: "kinematics",
  levelId: 4,
  problemStatementVariablesValues: {
    initialVelocity: 5,
    acceleration: 2,
    time: 4,
  },
} as unknown as LevelDataConfig;

function submitLevel4(distance: number, averageVelocity = 9) {
  return {
    gameId: "kinematics",
    levelId: 4,
    values: { averageVelocity, distance },
    units: { averageVelocity: "m/s", distance: "m" },
  };
}

describe("buildKinematicsLevel4Run", () => {
  it("ends the right distance at v0*t + a*t^2/2", () => {
    const states = buildKinematicsLevel4Run(submitLevel4(36), level4);
    const last = states.length - 1;

    expect(carX(states, 0)).toBe(0);
    expect(states[last].timeMs).toBe(4000);
    // 5 * 4 + 2 * 16 / 2 = 36 m
    expect(carX(states, last)).toBeCloseTo(36, 10);
  });

  it("speeds up: each frame covers more road than the one before", () => {
    const states = buildKinematicsLevel4Run(submitLevel4(36), level4);

    for (let i = 2; i < states.length - 1; i++) {
      const before = carX(states, i - 1) - carX(states, i - 2);
      const now = carX(states, i) - carX(states, i - 1);
      expect(now).toBeGreaterThan(before);
    }
  });

  it("keeps its speeding-up shape but ends at the player's distance", () => {
    const states = buildKinematicsLevel4Run(submitLevel4(18), level4);
    const last = states.length - 1;
    const mid = states.findIndex((s) => s.timeMs >= 2000);
    const t = states[mid].timeMs / 1000;

    expect(carX(states, last)).toBeCloseTo(18, 10);
    // x(t) = distance * s(t) / s(T), with s(t) = 5t + t^2 and s(4) = 36.
    expect(carX(states, mid)).toBeCloseTo((18 * (5 * t + t * t)) / 36, 10);
  });

  it("moves the same whatever average velocity the player typed", () => {
    const a = buildKinematicsLevel4Run(submitLevel4(30, 1), level4);
    const b = buildKinematicsLevel4Run(submitLevel4(30, 9), level4);

    expect(a.map((s) => s.objects[CAR_ID].position.x)).toEqual(
      b.map((s) => s.objects[CAR_ID].position.x),
    );
  });

  it("rejects a distance that is not a finite number", () => {
    expect(() =>
      buildKinematicsLevel4Run(submitLevel4(Number.NaN), level4),
    ).toThrow(/distance/);
  });

  it.each(["initialVelocity", "acceleration"])(
    "rejects a level with no %s",
    (missing) => {
      const values: Record<string, number> = {
        initialVelocity: 5,
        acceleration: 2,
        time: 4,
      };
      delete values[missing];

      expect(() =>
        buildKinematicsLevel4Run(submitLevel4(36), {
          ...level4,
          problemStatementVariablesValues: values,
        }),
      ).toThrow(new RegExp(missing));
    },
  );

  it("rejects a level time of 0", () => {
    expect(() =>
      buildKinematicsLevel4Run(submitLevel4(36), {
        ...level4,
        problemStatementVariablesValues: {
          initialVelocity: 5,
          acceleration: 2,
          time: 0,
        },
      }),
    ).toThrow(/time/);
  });

  it("rejects a level whose own distance is not > 0", () => {
    expect(() =>
      buildKinematicsLevel4Run(submitLevel4(36), {
        ...level4,
        problemStatementVariablesValues: {
          initialVelocity: 5,
          acceleration: -10,
          time: 4,
        },
      }),
    ).toThrow(/distance/);
  });
});
