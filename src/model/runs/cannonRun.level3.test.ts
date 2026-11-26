import { describe, expect, it } from "vitest";
import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { SimulationState } from "../SimulationState.ts";
import { DEFAULT_STEP_MS } from "../SimulationRunner.ts";
import {
  buildCannonLevel3Run,
  CANNON_BALL_ID,
  CANNON_TARGET_MIN_HALF_HEIGHT,
  CANNON_TARGET_TOLERANCE_MARGIN,
  cannonStop,
  cannonTargetArena,
  cannonTargetOutcome,
} from "./cannonRun.ts";

const g = 9.81;
// A net 30 m out and 5 m up, at 45°: v = 30 * sqrt(g / 25) = 18.79 m/s,
// which lands at R = v² / g = 36 m after peaking at R / 4 = 9 m.
const level = {
  gameId: "cannonTrajectory",
  levelId: 3,
  problemStatementVariablesValues: {
    horizontalDistance: 30,
    targetHeight: 5,
    launchAngle: 45,
    gravitationalAcceleration: g,
  },
  expectedUserInput: { launchSpeed: 30 * Math.sqrt(g / 25) },
  toleranceRule: { absolute: 0.005 },
} as unknown as LevelDataConfig;
const right = 30 * Math.sqrt(g / 25);

function submit(launchSpeed: number) {
  return {
    gameId: "cannonTrajectory",
    levelId: 3,
    values: { launchSpeed },
    units: {},
  };
}

function ball(states: readonly SimulationState[], i: number) {
  return states.at(i)!.objects[CANNON_BALL_ID].position;
}

function withValues(values: Record<string, number>): LevelDataConfig {
  return {
    ...level,
    problemStatementVariablesValues: {
      ...level.problemStatementVariablesValues,
      ...values,
    },
  };
}

/** The ball's height where it crosses x, read off the frames. */
function heightAcross(states: readonly SimulationState[], x: number): number {
  const i = states.findIndex((s) => s.objects[CANNON_BALL_ID].position.x >= x);
  const a = ball(states, i - 1);
  const b = ball(states, i);
  return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
}

describe("cannonTargetArena", () => {
  it("hangs the net at the level's distance and height", () => {
    const arena = cannonTargetArena(level);

    expect(arena.targetX).toBe(30);
    expect(arena.targetY).toBe(5);
  });

  it("fits the right answer's whole flight inside the tent", () => {
    const arena = cannonTargetArena(level);

    expect(arena.leftX).toBeLessThan(0);
    expect(arena.wallX).toBeGreaterThan(36);
    expect(arena.ceilingY).toBeGreaterThan(9);
    expect(arena.ceilingY).toBeGreaterThan(arena.targetY);
  });

  it("never draws the net smaller than its minimum size", () => {
    const arena = cannonTargetArena(level);

    expect(arena.targetHalfHeight).toBeCloseTo(
      CANNON_TARGET_MIN_HALF_HEIGHT * 30,
      10,
    );
  });

  it("sizes the net from a loose tolerance, so accepted speeds pass inside it", () => {
    const loose = { ...level, toleranceRule: { absolute: 1 } };
    const arena = cannonTargetArena(loose);
    const slowest = cannonTargetOutcome(right - 1, loose);
    const fastest = cannonTargetOutcome(right + 1, loose);

    // dy/dv = g x² / (v³ cos²θ), times the tolerance and the margin.
    const band = ((g * 900) / (right ** 3 * 0.5)) * 1;
    expect(arena.targetHalfHeight).toBeCloseTo(
      CANNON_TARGET_TOLERANCE_MARGIN * band,
      10,
    );
    for (const outcome of [slowest, fastest]) {
      expect(outcome.kind).toBe("passed");
      if (outcome.kind === "passed") {
        expect(Math.abs(outcome.offset)).toBeLessThan(arena.targetHalfHeight);
      }
    }
  });

  it("counts a relative tolerance toward the net's size", () => {
    const relative = {
      ...level,
      toleranceRule: { absolute: 0, relative: 0.05 },
    };
    const band = ((g * 900) / (right ** 3 * 0.5)) * 0.05 * right;

    expect(cannonTargetArena(relative).targetHalfHeight).toBeCloseTo(
      CANNON_TARGET_TOLERANCE_MARGIN * band,
      10,
    );
  });

  it.each([
    ["horizontalDistance", { horizontalDistance: 0 }],
    ["horizontalDistance", { horizontalDistance: Number.NaN }],
    ["targetHeight", { targetHeight: -1 }],
    ["targetHeight", { targetHeight: 30 }],
    ["targetHeight", { targetHeight: Number.POSITIVE_INFINITY }],
    ["launchAngle", { launchAngle: 0 }],
    ["launchAngle", { launchAngle: 90 }],
    ["gravitationalAcceleration", { gravitationalAcceleration: 0 }],
  ])("rejects a level with a bad %s", (name, values) => {
    expect(() => cannonTargetArena(withValues(values))).toThrow(
      new RegExp(name),
    );
  });

  it("rejects a level with no values", () => {
    expect(() =>
      cannonTargetArena({ ...level, problemStatementVariablesValues: {} }),
    ).toThrow(RangeError);
  });
});

describe("cannonTargetOutcome", () => {
  it("passes the right speed through the net's center", () => {
    const outcome = cannonTargetOutcome(right, level);

    expect(outcome.kind).toBe("passed");
    if (outcome.kind === "passed") expect(outcome.offset).toBeCloseTo(0, 10);
  });

  it("passes a slow speed below the net: y = x - g x² / v² at 45°", () => {
    const outcome = cannonTargetOutcome(17.5, level);

    expect(outcome).toEqual({
      kind: "passed",
      offset: expect.closeTo(30 - (g * 900) / 17.5 ** 2 - 5, 10),
    });
    if (outcome.kind === "passed") expect(outcome.offset).toBeLessThan(0);
  });

  it("passes a fast speed above the net", () => {
    const outcome = cannonTargetOutcome(20, level);

    expect(outcome).toEqual({
      kind: "passed",
      offset: expect.closeTo(30 - (g * 900) / 400 - 5, 10),
    });
  });

  it("lands a speed too slow to reach the net short of it", () => {
    expect(cannonTargetOutcome(15, level)).toEqual({
      kind: "short",
      gap: expect.closeTo(30 - 225 / g, 10),
    });
  });

  it("lands a zero speed the whole distance short", () => {
    expect(cannonTargetOutcome(0, level)).toEqual({ kind: "short", gap: 30 });
  });

  it("sends a very fast speed out the tent top before the net", () => {
    expect(cannonTargetOutcome(40, level)).toEqual({ kind: "ceiling" });
  });

  it("sends a steep shot out the tent top before its arc reaches the net", () => {
    // At 80°, the arc peaks at x = peak * 2 / tan 80° < 30 m.
    const steep = withValues({ launchAngle: 80 });
    const arena = cannonTargetArena(steep);
    const sin = Math.sin((80 * Math.PI) / 180);
    const speed = Math.sqrt((2 * g * arena.ceilingY) / (sin * sin)) + 0.1;
    const apexX = (speed * speed * Math.sin((160 * Math.PI) / 180)) / (2 * g);

    expect(apexX).toBeLessThan(30);
    expect(cannonTargetOutcome(speed, steep)).toEqual({ kind: "ceiling" });
  });

  it.each([Number.NaN, -1, Number.POSITIVE_INFINITY])(
    "rejects a launch speed of %s",
    (speed) => {
      expect(() => cannonTargetOutcome(speed, level)).toThrow(/launchSpeed/);
    },
  );
});

describe("buildCannonLevel3Run", () => {
  it("starts at the cannon's mouth at time 0", () => {
    const states = buildCannonLevel3Run(submit(right), level);

    expect(states[0].step).toBe(0);
    expect(states[0].timeMs).toBe(0);
    expect(ball(states, 0)).toEqual({ x: 0, y: 0 });
  });

  it("flies the right speed through the net's center", () => {
    const states = buildCannonLevel3Run(submit(right), level);

    expect(heightAcross(states, 30)).toBeCloseTo(5, 2);
  });

  it("lands the right speed on the floor at R = v² / g, after 2 v sinθ / g", () => {
    const states = buildCannonLevel3Run(submit(right), level);
    const arena = cannonTargetArena(level);

    expect(ball(states, -1).y).toBe(0);
    expect(ball(states, -1).x).toBeCloseTo(36, 6);
    expect(states.at(-1)!.timeMs / 1000).toBeCloseTo(
      (2 * right * Math.SQRT1_2) / g,
      6,
    );
    expect(cannonStop(ball(states, -1), arena)).toBe("landed");
  });

  it("steps 60 frames a second along x = v cosθ t, y = v sinθ t - g t² / 2", () => {
    const states = buildCannonLevel3Run(submit(right), level);
    const t = (30 * DEFAULT_STEP_MS) / 1000;
    const v = right * Math.SQRT1_2;

    expect(states[1].timeMs).toBe(DEFAULT_STEP_MS);
    expect(states[30].timeMs).toBeCloseTo(30 * DEFAULT_STEP_MS, 10);
    expect(ball(states, 30).x).toBeCloseTo(v * t, 10);
    expect(ball(states, 30).y).toBeCloseTo(v * t - (g * t * t) / 2, 10);
  });

  it("flies a slow speed below the net, by the outcome's offset", () => {
    const states = buildCannonLevel3Run(submit(17.5), level);
    const outcome = cannonTargetOutcome(17.5, level);

    if (outcome.kind !== "passed") throw new Error("expected a pass");
    expect(heightAcross(states, 30) - 5).toBeCloseTo(outcome.offset, 2);
  });

  it("lands a too-slow speed on the floor short of the net", () => {
    const states = buildCannonLevel3Run(submit(15), level);

    expect(ball(states, -1)).toEqual({
      x: expect.closeTo(225 / g, 6),
      y: 0,
    });
  });

  it("stops a fast, flat-enough speed at the tent wall", () => {
    const states = buildCannonLevel3Run(submit(25), level);
    const arena = cannonTargetArena(level);

    expect(ball(states, -1).x).toBe(arena.wallX);
    expect(cannonStop(ball(states, -1), arena)).toBe("wall");
  });

  it("stops a very fast speed at the tent top", () => {
    const states = buildCannonLevel3Run(submit(40), level);
    const arena = cannonTargetArena(level);

    expect(ball(states, -1).y).toBe(arena.ceilingY);
    expect(cannonStop(ball(states, -1), arena)).toBe("ceiling");
  });

  it("drops a zero speed straight onto the floor", () => {
    const states = buildCannonLevel3Run(submit(0), level);

    expect(states).toHaveLength(2);
    expect(ball(states, -1)).toEqual({ x: 0, y: 0 });
  });

  it("returns frames that cannot be changed", () => {
    const states = buildCannonLevel3Run(submit(right), level);

    expect(Object.isFrozen(states[1])).toBe(true);
  });

  it.each([Number.NaN, -0.5, Number.NEGATIVE_INFINITY])(
    "rejects a launch speed of %s",
    (speed) => {
      expect(() => buildCannonLevel3Run(submit(speed), level)).toThrow(
        /launchSpeed/,
      );
    },
  );

  it("rejects a missing launch speed", () => {
    expect(() =>
      buildCannonLevel3Run({ ...submit(1), values: {} }, level),
    ).toThrow(/launchSpeed/);
  });

  it("rejects a level with a bad angle", () => {
    expect(() =>
      buildCannonLevel3Run(submit(right), withValues({ launchAngle: 95 })),
    ).toThrow(/launchAngle/);
  });
});
