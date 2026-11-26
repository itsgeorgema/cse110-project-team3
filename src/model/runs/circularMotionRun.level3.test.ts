import { describe, expect, it } from "vitest";
import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { SimulationState, Vec2 } from "../SimulationState.ts";
import { DEFAULT_STEP_MS } from "../SimulationRunner.ts";
import {
  buildCircularMotionLevel3Run,
  COASTER_CART_ID,
  COASTER_LAP_S,
  loopTrack,
  minimumSpeedLoop,
  staysOnLoop,
} from "./circularMotionRun.ts";

// A 10 m loop with g = 10 m/s²: v_min = √(g r) = 10 m/s.
const level = {
  gameId: "circularMotion",
  levelId: 3,
  problemStatementVariablesValues: {
    mass: 300,
    radius: 10,
    gravitationalAcceleration: 10,
  },
} as unknown as LevelDataConfig;
const r = 10;
const g = 10;
const vMin = 10;
const loop = minimumSpeedLoop(level);
const track = loop.track;

function run(minimumSpeed: number, on = level): SimulationState[] {
  return buildCircularMotionLevel3Run(
    {
      gameId: "circularMotion",
      levelId: 3,
      values: { minimumSpeed },
      units: {},
    },
    on,
  );
}

function cart(states: readonly SimulationState[], i: number) {
  return states.at(i)!.objects[COASTER_CART_ID];
}

function fromCenter(p: Vec2): number {
  return Math.hypot(p.x - track.center.x, p.y - track.center.y);
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

describe("minimumSpeedLoop", () => {
  it("builds the loop from the radius and finds v_min = √(g r)", () => {
    expect(loop.track).toEqual(loopTrack(r));
    expect(loop.gravity).toBe(g);
    expect(loop.minimumSpeed).toBe(vMin);
    expect(track.top).toEqual({ x: 0, y: track.center.y + r });
  });

  it("uses the factory level's g = 9.81", () => {
    const real = minimumSpeedLoop(
      withLevel({ radius: 12, gravitationalAcceleration: 9.81 }),
    );
    expect(real.minimumSpeed).toBeCloseTo(Math.sqrt(9.81 * 12), 12);
  });

  it.each([
    ["radius", { radius: 0 }],
    ["radius", { radius: Number.NaN }],
    ["gravitationalAcceleration", { gravitationalAcceleration: -9.81 }],
    ["gravitationalAcceleration", { gravitationalAcceleration: Infinity }],
  ])("throws a RangeError naming %s for a bad value", (name, values) => {
    expect(() => minimumSpeedLoop(withLevel(values))).toThrow(
      new RegExp(`^${name} must be`),
    );
  });

  it("throws a RangeError when gravity is missing", () => {
    expect(() =>
      minimumSpeedLoop({
        ...level,
        problemStatementVariablesValues: { radius: 10 },
      }),
    ).toThrow(RangeError);
  });
});

describe("staysOnLoop", () => {
  it("holds the cart at v_min and above, not below", () => {
    expect(staysOnLoop(vMin, loop)).toBe(true);
    expect(staysOnLoop(vMin + 0.01, loop)).toBe(true);
    expect(staysOnLoop(vMin - 0.01, loop)).toBe(false);
    expect(staysOnLoop(0, loop)).toBe(false);
  });

  it("counts the exact answer, off in its last bits, as on", () => {
    expect(staysOnLoop(vMin * (1 - 1e-12), loop)).toBe(true);
  });
});

describe("buildCircularMotionLevel3Run", () => {
  it("starts with the cart at the top, upside down, at time 0", () => {
    for (const speed of [vMin, 5, 20]) {
      const states = run(speed);
      expect(states[0].step).toBe(0);
      expect(states[0].timeMs).toBe(0);
      expect(cart(states, 0).position).toEqual(track.top);
      expect(cart(states, 0).angle).toBe(Math.PI);
    }
  });

  it("rides v_min round the rest of the loop and down the right ramp", () => {
    const states = run(vMin);
    const metersPerS = (2 * Math.PI * r) / COASTER_LAP_S;
    const arcMs = ((Math.PI * r) / metersPerS) * 1000;

    for (const state of states.filter((s) => s.timeMs <= arcMs)) {
      expect(fromCenter(state.objects[COASTER_CART_ID].position)).toBeCloseTo(
        r,
        9,
      );
    }
    // Over the top to the left: counterclockwise.
    expect(cart(states, 1).position.x).toBeLessThan(0);
    const last = cart(states, -1);
    expect(last.position.x).toBeCloseTo(track.rampEnd.x, 9);
    expect(last.position.y).toBeCloseTo(0, 9);
    expect(last.angle).toBeCloseTo(
      Math.atan2(-track.bottom.y, track.rampEnd.x),
      9,
    );
  });

  it("rides a too-high speed the same way as v_min", () => {
    expect(run(25)).toEqual(run(vMin));
  });

  it("steps 60 frames per second and ends exactly at the last time", () => {
    for (const states of [run(vMin), run(6)]) {
      states.forEach((state, i) => expect(state.step).toBe(i));
      for (let i = 1; i < states.length - 1; i++) {
        expect(states[i].timeMs).toBeCloseTo(i * DEFAULT_STEP_MS, 9);
      }
      const gap = states.at(-1)!.timeMs - states.at(-2)!.timeMs;
      expect(gap).toBeGreaterThan(0);
      expect(gap).toBeLessThanOrEqual(DEFAULT_STEP_MS + 1e-9);
    }
  });

  it("drops a too-low speed as a projectile from the top, in real seconds", () => {
    const v = 6;
    const states = run(v);
    for (const state of states.slice(0, -1)) {
      const t = state.timeMs / 1000;
      const p = state.objects[COASTER_CART_ID].position;
      expect(p.x).toBeCloseTo(-v * t, 9);
      expect(p.y).toBeCloseTo(track.top.y - (g * t * t) / 2, 9);
      // Inside the loop, off the track.
      if (t > 0) expect(fromCenter(p)).toBeLessThan(r);
      // Nothing turns it once it has left the track.
      expect(state.objects[COASTER_CART_ID].angle).toBe(Math.PI);
    }
  });

  it("stops a falling cart where it meets the loop again", () => {
    const v = 6;
    const states = run(v);
    // d² − r² = t² (v² − g r) + g² t⁴ / 4 is 0 at t = 2√(g r − v²) / g.
    const hitS = (2 * Math.sqrt(g * r - v * v)) / g;
    expect(states.at(-1)!.timeMs).toBeCloseTo(hitS * 1000, 9);
    const last = cart(states, -1).position;
    expect(fromCenter(last)).toBeCloseTo(r, 12);
    expect(last.x).toBeCloseTo(-v * hitS, 9);
    // On the lower left of the loop.
    expect(last.x).toBeLessThan(0);
    expect(last.y).toBeLessThan(track.center.y);
  });

  it("drops a cart with no speed straight down to the loop's bottom", () => {
    const states = run(0);
    const last = cart(states, -1).position;
    expect(last.x).toBeCloseTo(0, 12);
    expect(last.y).toBeCloseTo(track.bottom.y, 9);
    expect(states.at(-1)!.timeMs).toBeCloseTo(Math.sqrt((4 * r) / g) * 1000, 9);
  });

  it("falls for a speed just under v_min, by the tolerance", () => {
    const states = run(vMin - 0.01);
    expect(fromCenter(cart(states, 1).position)).toBeLessThan(r);
    expect(cart(states, -1).position.y).toBeGreaterThan(track.center.y);
  });

  it("returns frozen frames with only the cart", () => {
    const states = run(6);
    expect(Object.isFrozen(states[0])).toBe(true);
    expect(Object.keys(states[0].objects)).toEqual([COASTER_CART_ID]);
  });

  it.each([-1, Number.NaN, Infinity, undefined])(
    "throws a RangeError for a minimumSpeed of %s",
    (speed) => {
      expect(() => run(speed as number)).toThrow(
        /^minimumSpeed must be a finite number >= 0/,
      );
    },
  );

  it("throws a RangeError for a level with a bad radius or gravity", () => {
    expect(() => run(vMin, withLevel({ radius: -3 }))).toThrow(RangeError);
    expect(() =>
      run(vMin, withLevel({ gravitationalAcceleration: 0 })),
    ).toThrow(RangeError);
  });
});
