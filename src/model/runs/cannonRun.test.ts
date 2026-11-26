import { describe, expect, it } from "vitest";
import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { SimulationState } from "../SimulationState.ts";
import { DEFAULT_STEP_MS } from "../SimulationRunner.ts";
import {
  buildCannonLevel1Run,
  CANNON_BALL_ID,
  CANNON_TIME_CAP_S,
  cannonArena,
  cannonStop,
} from "./cannonRun.ts";

const g = 9.81;
// 10 m/s at 30°: vx = 8.660, vy = 5, flight 1.019 s, range 8.828 m.
const level = {
  gameId: "cannonTrajectory",
  levelId: 1,
  problemStatementVariablesValues: {
    launchSpeed: 10,
    launchAngle: 30,
    gravitationalAcceleration: g,
  },
} as unknown as LevelDataConfig;
const vx = 10 * Math.cos(Math.PI / 6);
const vy = 5;
const range = (2 * vx * vy) / g;

function submit(
  values: Partial<Record<string, number>> = {},
): Parameters<typeof buildCannonLevel1Run>[0] {
  return {
    gameId: "cannonTrajectory",
    levelId: 1,
    values: {
      initialHorizontalVelocity: vx,
      horizontalVelocityRate: 0,
      initialVerticalVelocity: vy,
      verticalVelocityRate: g,
      ...values,
    } as Record<string, number>,
    units: {},
  };
}

function ball(states: readonly SimulationState[], i: number) {
  return states.at(i)!.objects[CANNON_BALL_ID].position;
}

function withLevel(values: Record<string, number>): LevelDataConfig {
  return {
    ...level,
    problemStatementVariablesValues: {
      ...level.problemStatementVariablesValues,
      ...values,
    },
  };
}

describe("cannonArena", () => {
  it("centers the net on the real range, R = 2 * vx * vy / g", () => {
    const arena = cannonArena(level);

    expect(arena.netX).toBeCloseTo(range, 10);
    expect(arena.netWidth).toBeGreaterThan(0);
    expect(arena.leftX).toBeLessThan(0);
    expect(arena.wallX).toBeGreaterThan(arena.netX + arena.netWidth / 2);
  });

  it("puts the tent top above the real flight's peak", () => {
    const peak = (vy * vy) / (2 * g);

    expect(cannonArena(level).ceilingY).toBeGreaterThan(peak);
    // A steep launch is limited by its peak, not the tent's width.
    const steep = cannonArena(withLevel({ launchAngle: 80 }));
    const steepVy = 10 * Math.sin((80 * Math.PI) / 180);
    expect(steep.ceilingY).toBeCloseTo((1.5 * steepVy ** 2) / (2 * g), 10);
  });

  it.each([
    ["launchSpeed", 0],
    ["launchSpeed", Number.NaN],
    ["launchAngle", 0],
    ["launchAngle", 90],
    ["launchAngle", Number.POSITIVE_INFINITY],
    ["gravitationalAcceleration", -9.81],
  ])("rejects %s = %s", (name, value) => {
    expect(() => cannonArena(withLevel({ [name]: value }))).toThrow(
      new RegExp(name),
    );
  });

  it("rejects a level with no launch values", () => {
    expect(() =>
      cannonArena({ ...level, problemStatementVariablesValues: {} }),
    ).toThrow(/launchSpeed/);
  });
});

describe("cannonStop", () => {
  const arena = cannonArena(level);

  it.each([
    [{ x: 3, y: 0 }, "landed"],
    [{ x: arena.wallX, y: 1 }, "wall"],
    [{ x: arena.leftX, y: 1 }, "left"],
    [{ x: 3, y: arena.ceilingY }, "ceiling"],
    [{ x: 3, y: 1 }, "timeCap"],
  ] as const)("reads %o as %s", (position, stop) => {
    expect(cannonStop(position, arena)).toBe(stop);
  });
});

describe("buildCannonLevel1Run", () => {
  it("starts the ball at the cannon's mouth at time 0", () => {
    const states = buildCannonLevel1Run(submit(), level);

    expect(states[0].step).toBe(0);
    expect(states[0].timeMs).toBe(0);
    expect(ball(states, 0)).toEqual({ x: 0, y: 0 });
  });

  it("lands the right equations in the net center at the real flight time", () => {
    const states = buildCannonLevel1Run(submit(), level);
    const last = states.at(-1)!;

    expect(last.timeMs).toBeCloseTo(((2 * vy) / g) * 1000, 6);
    expect(ball(states, -1).y).toBe(0);
    expect(ball(states, -1).x).toBeCloseTo(range, 6);
    expect(cannonStop(ball(states, -1), cannonArena(level))).toBe("landed");
  });

  it("steps at 60 frames per second, following x = vx*t and y = vy*t - g*t²/2", () => {
    const states = buildCannonLevel1Run(submit(), level);
    const t = (10 * DEFAULT_STEP_MS) / 1000;

    expect(states[10].timeMs).toBeCloseTo(10 * DEFAULT_STEP_MS, 9);
    expect(ball(states, 10).x).toBeCloseTo(vx * t, 10);
    expect(ball(states, 10).y).toBeCloseTo(vy * t - (g * t * t) / 2, 10);
    for (let i = 1; i < states.length; i++) {
      expect(states[i].step).toBe(i);
      expect(states[i].timeMs).toBeGreaterThan(states[i - 1].timeMs);
    }
  });

  it("lands short when the horizontal velocity is too small", () => {
    const states = buildCannonLevel1Run(
      submit({ initialHorizontalVelocity: vx / 2 }),
      level,
    );

    expect(ball(states, -1)).toEqual({ x: expect.closeTo(range / 2, 6), y: 0 });
  });

  it("curves with a non-zero horizontal rate, x = vx*t + rx*t²/2", () => {
    const states = buildCannonLevel1Run(
      submit({ horizontalVelocityRate: 2 }),
      level,
    );
    const t = (2 * vy) / g;

    expect(ball(states, -1).x).toBeCloseTo(vx * t + t * t, 6);
  });

  it("stops at the tent wall when the shot is far too strong", () => {
    const states = buildCannonLevel1Run(
      submit({ initialHorizontalVelocity: 100 }),
      level,
    );
    const arena = cannonArena(level);

    expect(ball(states, -1).x).toBe(arena.wallX);
    expect(cannonStop(ball(states, -1), arena)).toBe("wall");
  });

  it("stops at the tent top when gravity is left out", () => {
    const states = buildCannonLevel1Run(
      submit({ initialHorizontalVelocity: 0, verticalVelocityRate: 0 }),
      level,
    );
    const arena = cannonArena(level);

    expect(ball(states, -1)).toEqual({ x: 0, y: arena.ceilingY });
    expect(states.at(-1)!.timeMs).toBeCloseTo((arena.ceilingY / vy) * 1000, 6);
  });

  it("stops at the left edge when it flies backward", () => {
    const states = buildCannonLevel1Run(
      submit({ initialHorizontalVelocity: -vx }),
      level,
    );

    expect(cannonStop(ball(states, -1), cannonArena(level))).toBe("left");
  });

  it("hits the floor at once when it starts with no upward velocity", () => {
    const states = buildCannonLevel1Run(
      submit({ initialVerticalVelocity: 0 }),
      level,
    );

    expect(states).toHaveLength(2);
    expect(ball(states, -1).y).toBe(0);
    expect(states.at(-1)!.timeMs).toBeLessThan(1e-6);
  });

  it("stops at the time cap when a slow float never reaches a boundary", () => {
    // Rises 0.5 m/s with no gravity, staying inside the tent for 10 s.
    const states = buildCannonLevel1Run(
      submit({
        initialHorizontalVelocity: 0.1,
        initialVerticalVelocity: 0.5,
        verticalVelocityRate: 0,
      }),
      level,
    );

    expect(states.at(-1)!.timeMs).toBe(CANNON_TIME_CAP_S * 1000);
    expect(ball(states, -1).y).toBeCloseTo(5, 10);
    expect(cannonStop(ball(states, -1), cannonArena(level))).toBe("timeCap");
  });

  it("returns frozen frames", () => {
    const states = buildCannonLevel1Run(submit(), level);

    expect(Object.isFrozen(states[1])).toBe(true);
  });

  it.each([
    "initialHorizontalVelocity",
    "horizontalVelocityRate",
    "initialVerticalVelocity",
    "verticalVelocityRate",
  ])("rejects a %s that is not a finite number", (name) => {
    expect(() =>
      buildCannonLevel1Run(submit({ [name]: Number.NaN }), level),
    ).toThrow(new RegExp(name));
  });

  it("rejects a missing answer", () => {
    expect(() =>
      buildCannonLevel1Run({ ...submit(), values: {} }, level),
    ).toThrow(/initialHorizontalVelocity/);
  });

  it("rejects a bad level value", () => {
    expect(() =>
      buildCannonLevel1Run(submit(), withLevel({ launchAngle: -5 })),
    ).toThrow(/launchAngle/);
  });
});
