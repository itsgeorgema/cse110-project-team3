import { describe, expect, it } from "vitest";
import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import { DEFAULT_STEP_MS } from "../SimulationRunner.ts";
import { buildKinematicsLevel1Run, CAR_ID } from "./kinematicsRun.ts";

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
