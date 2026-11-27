import { describe, expect, it } from "vitest";
import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import { DEFAULT_STEP_MS } from "../SimulationRunner.ts";
import {
  buildNetForceLevel1Run,
  buildNetForceLevel2Run,
  CRATE_ID,
  crateMass,
  crateRun,
  PUSH_SECONDS,
  pushFinish,
  REST_HOLD_SECONDS,
  REST_MOVE_SECONDS,
} from "./netForceRun.ts";

/** A 10 kg crate that should speed up at 3 m/s², so the right push is 30 N. */
const level = {
  gameId: "netForce",
  levelId: 1,
  problemStatementVariablesValues: { mass: 10, acceleration: 3 },
  expectedUserInput: { force: 30 },
} as unknown as LevelDataConfig;

function push(force: number) {
  return {
    gameId: "netForce",
    levelId: 1,
    values: { force },
    units: { force: "N" },
  };
}

function withValues(values: Record<string, number>): LevelDataConfig {
  return { ...level, problemStatementVariablesValues: values };
}

type Run = ReturnType<typeof buildNetForceLevel1Run>;

function crateAt(states: Run, i: number) {
  return states[i].objects[CRATE_ID].position;
}

function last(states: Run) {
  return crateAt(states, states.length - 1);
}

describe("pushFinish", () => {
  it("puts the line where the real acceleration takes the crate, x = a T² / 2", () => {
    expect(PUSH_SECONDS).toBe(2);
    expect(pushFinish(level)).toBeCloseTo(6, 12);
  });

  it.each([0, -2, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects a level acceleration of %s",
    (acceleration) => {
      expect(() => pushFinish(withValues({ mass: 10, acceleration }))).toThrow(
        /acceleration/,
      );
    },
  );

  it("rejects a level with no acceleration", () => {
    expect(() => pushFinish(withValues({ mass: 10 }))).toThrow(/acceleration/);
  });
});

describe("crateMass", () => {
  it("reads the level's mass", () => {
    expect(crateMass(level)).toBe(10);
  });

  it.each([0, -5, Number.NaN, Number.NEGATIVE_INFINITY])(
    "rejects a mass of %s",
    (mass) => {
      expect(() => crateMass(withValues({ mass, acceleration: 3 }))).toThrow(
        /mass/,
      );
    },
  );

  it("rejects a level with no mass", () => {
    expect(() => crateMass(withValues({ acceleration: 3 }))).toThrow(/mass/);
  });
});

describe("crateRun", () => {
  it("keeps a final frame for a time that is not a whole number of steps", () => {
    const states = crateRun(1.005, (t) => ({ x: t, y: 0 }));

    expect(states.at(-1)?.timeMs).toBeCloseTo(1005, 9);
    expect(last(states).x).toBeCloseTo(1.005, 10);
  });
});

describe("buildNetForceLevel1Run", () => {
  it("starts the crate at rest at x = 0 on the floor at time 0", () => {
    const states = buildNetForceLevel1Run(push(30), level);

    expect(states[0].step).toBe(0);
    expect(states[0].timeMs).toBe(0);
    expect(crateAt(states, 0)).toEqual({ x: 0, y: 0 });
    expect(states[0].objects[CRATE_ID].angle).toBe(0);
  });

  it("ends the right push exactly on the line after the push time", () => {
    const states = buildNetForceLevel1Run(push(30), level);

    expect(states.at(-1)?.timeMs).toBe(PUSH_SECONDS * 1000);
    expect(last(states).x).toBeCloseTo(pushFinish(level), 10);
    expect(last(states).y).toBe(0);
  });

  it("speeds up from rest: x = (F / m) t² / 2 halfway through", () => {
    const states = buildNetForceLevel1Run(push(30), level);
    const half = states.findIndex((state) => state.timeMs >= 1000 - 1e-9);

    expect(crateAt(states, half).x).toBeCloseTo(1.5, 10);
  });

  it("stops a weak push short of the line", () => {
    // 20 N on 10 kg is 2 m/s², so 4 m in 2 s instead of 6 m.
    expect(last(buildNetForceLevel1Run(push(20), level)).x).toBeCloseTo(4, 10);
  });

  it("sends a strong push past the line", () => {
    // 50 N on 10 kg is 5 m/s², so 10 m in 2 s.
    expect(last(buildNetForceLevel1Run(push(50), level)).x).toBeCloseTo(10, 10);
  });

  it("leaves the crate where it is with no push", () => {
    const states = buildNetForceLevel1Run(push(0), level);

    expect(
      states.every((state) => state.objects[CRATE_ID].position.x === 0),
    ).toBe(true);
  });

  it("moves a negative push backward, as the numbers say", () => {
    expect(last(buildNetForceLevel1Run(push(-30), level)).x).toBeCloseTo(
      -6,
      10,
    );
  });

  it("steps at 60 frames per second with increasing time", () => {
    const states = buildNetForceLevel1Run(push(30), level);

    expect(states[1].timeMs).toBeCloseTo(DEFAULT_STEP_MS, 10);
    expect(states).toHaveLength(
      Math.ceil((PUSH_SECONDS * 1000) / DEFAULT_STEP_MS) + 1,
    );
    for (let i = 1; i < states.length; i++) {
      expect(states[i].timeMs).toBeGreaterThan(states[i - 1].timeMs);
      expect(crateAt(states, i).x).toBeGreaterThanOrEqual(
        crateAt(states, i - 1).x,
      );
    }
  });

  it("freezes every frame", () => {
    const states = buildNetForceLevel1Run(push(30), level);

    expect(Object.isFrozen(states[5])).toBe(true);
    expect(Object.isFrozen(crateAt(states, 5))).toBe(true);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects a force of %s",
    (force) => {
      expect(() => buildNetForceLevel1Run(push(force), level)).toThrow(/force/);
    },
  );

  it("rejects a submission with no force", () => {
    expect(() =>
      buildNetForceLevel1Run({ ...push(30), values: {} }, level),
    ).toThrow(/force/);
  });

  it.each([0, -10, Number.NaN])("rejects a level mass of %s", (mass) => {
    expect(() =>
      buildNetForceLevel1Run(push(30), withValues({ mass, acceleration: 3 })),
    ).toThrow(/mass/);
  });
});

/** A 10 kg crate at rest: F_g = F_N = 98.1 N. */
const level2 = {
  gameId: "netForce",
  levelId: 2,
  problemStatementVariablesValues: {
    mass: 10,
    gravitationalAcceleration: 9.81,
  },
  expectedUserInput: {
    gravitationalForce: 98.1,
    normalForce: 98.1,
    netForce: 0,
  },
} as unknown as LevelDataConfig;

function rest(gravitationalForce: number, normalForce: number, netForce = 0) {
  return {
    gameId: "netForce",
    levelId: 2,
    values: { gravitationalForce, normalForce, netForce },
    units: { gravitationalForce: "N", normalForce: "N", netForce: "N" },
  };
}

describe("buildNetForceLevel2Run", () => {
  const endOfMove = (states: Run) =>
    states.findIndex(
      (state) => state.timeMs >= REST_MOVE_SECONDS * 1000 - 1e-9,
    );

  it("keeps balanced forces' crate still the whole run", () => {
    const states = buildNetForceLevel2Run(rest(98.1, 98.1), level2);

    expect(crateAt(states, 0)).toEqual({ x: 0, y: 0 });
    expect(
      states.every(
        (state) =>
          state.objects[CRATE_ID].position.x === 0 &&
          state.objects[CRATE_ID].position.y === 0,
      ),
    ).toBe(true);
  });

  it("lifts the crate off when the normal force beats gravity", () => {
    // 10 N more on 10 kg is 1 m/s² up: 0.5 m in 1 s.
    const states = buildNetForceLevel2Run(rest(98.1, 108.1), level2);

    expect(crateAt(states, endOfMove(states)).y).toBeCloseTo(0.5, 10);
  });

  it("sinks the crate into the floor when gravity beats the normal force", () => {
    // A normal force of 0 leaves gravity alone: 9.81 m/s² down, 4.905 m in 1 s.
    const states = buildNetForceLevel2Run(rest(98.1, 0), level2);

    expect(crateAt(states, endOfMove(states)).y).toBeCloseTo(-4.905, 10);
  });

  it("speeds up from rest: a quarter of the way at half time", () => {
    const states = buildNetForceLevel2Run(rest(98.1, 108.1), level2);
    const half = states.findIndex((state) => state.timeMs >= 500 - 1e-9);

    expect(crateAt(states, half).y).toBeCloseTo(0.125, 10);
  });

  it("holds after the move, then ends back at rest", () => {
    const states = buildNetForceLevel2Run(rest(98.1, 108.1), level2);
    const lastFrame = states[states.length - 1];
    const beforeLast = states[states.length - 2];

    expect(beforeLast.timeMs).toBeCloseTo(REST_MOVE_SECONDS * 1000, 9);
    expect(lastFrame.timeMs).toBeCloseTo(
      (REST_MOVE_SECONDS + REST_HOLD_SECONDS) * 1000,
      9,
    );
    expect(lastFrame.step).toBe(beforeLast.step + 1);
    expect(last(states)).toEqual({ x: 0, y: 0 });
  });

  it("steps at 60 frames per second during the move", () => {
    const states = buildNetForceLevel2Run(rest(98.1, 108.1), level2);

    expect(states[1].timeMs).toBeCloseTo(DEFAULT_STEP_MS, 10);
    expect(states).toHaveLength(
      Math.ceil((REST_MOVE_SECONDS * 1000) / DEFAULT_STEP_MS) + 2,
    );
    for (let i = 1; i < states.length; i++) {
      expect(states[i].timeMs).toBeGreaterThan(states[i - 1].timeMs);
    }
  });

  it("ignores the typed net force: only F_N and F_g move the crate", () => {
    const states = buildNetForceLevel2Run(rest(98.1, 98.1, 50), level2);

    expect(
      states.every((state) => state.objects[CRATE_ID].position.y === 0),
    ).toBe(true);
  });

  it("freezes every frame, the reset included", () => {
    const states = buildNetForceLevel2Run(rest(98.1, 108.1), level2);

    expect(Object.isFrozen(states.at(-1))).toBe(true);
    expect(Object.isFrozen(last(states))).toBe(true);
  });

  it.each([
    ["gravitationalForce", rest(Number.NaN, 98.1)],
    ["normalForce", rest(98.1, Number.POSITIVE_INFINITY)],
  ])("rejects a %s that is not a finite number", (name, submission) => {
    expect(() => buildNetForceLevel2Run(submission, level2)).toThrow(name);
  });

  it.each(["gravitationalForce", "normalForce"])(
    "rejects a submission with no %s",
    (name) => {
      const values: Record<string, number> = {
        ...rest(98.1, 98.1).values,
      };
      delete values[name];
      expect(() =>
        buildNetForceLevel2Run({ ...rest(98.1, 98.1), values }, level2),
      ).toThrow(name);
    },
  );

  it.each([0, -10, Number.NaN])("rejects a level mass of %s", (mass) => {
    expect(() =>
      buildNetForceLevel2Run(rest(98.1, 98.1), {
        ...level2,
        problemStatementVariablesValues: {
          mass,
          gravitationalAcceleration: 9.81,
        },
      }),
    ).toThrow(/mass/);
  });
});
