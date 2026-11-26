import { describe, expect, it } from "vitest";
import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { SimulationState, Vec2 } from "../SimulationState.ts";
import { DEFAULT_STEP_MS } from "../SimulationRunner.ts";
import {
  buildCircularMotionLevel1Run,
  COASTER_CART_ID,
  COASTER_LAP_S,
  COASTER_PAUSE_S,
  coasterTrack,
  turnRadius,
} from "./circularMotionRun.ts";

// 20 m/s on a 10 m loop: a = v² / r = 40 m/s².
const level = {
  gameId: "circularMotion",
  levelId: 1,
  problemStatementVariablesValues: { speed: 20, radius: 10 },
} as unknown as LevelDataConfig;
const r = 10;
const right = 40;
const track = coasterTrack(level);

function run(acceleration: number, on = level): SimulationState[] {
  return buildCircularMotionLevel1Run(
    {
      gameId: "circularMotion",
      levelId: 1,
      values: { acceleration },
      units: {},
    },
    on,
  );
}

function cart(states: readonly SimulationState[], i: number) {
  return states.at(i)!.objects[COASTER_CART_ID];
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** The frames from the moment the cart leaves the top. */
function afterTop(states: readonly SimulationState[]) {
  const leaveMs = (track.topS + COASTER_PAUSE_S) * 1000;
  return states.filter((s) => s.timeMs > leaveMs);
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

describe("coasterTrack", () => {
  it("puts the loop on a short rise, with a ramp down to the floor each side", () => {
    expect(track.speed).toBe(20);
    expect(track.radius).toBe(r);
    expect(track.bottom.x).toBe(0);
    expect(track.bottom.y).toBeGreaterThan(0);
    expect(track.center).toEqual({ x: 0, y: track.bottom.y + r });
    expect(track.top).toEqual({ x: 0, y: track.bottom.y + 2 * r });
    expect(track.rampStart.y).toBe(0);
    expect(track.rampEnd.y).toBe(0);
    expect(track.rampStart.x).toBeLessThan(-r);
    expect(track.rampEnd.x).toBe(-track.rampStart.x);
    expect(track.leftX).toBeLessThan(track.rampStart.x);
    expect(track.rightX).toBe(-track.leftX);
    expect(track.ceilingY).toBeGreaterThan(track.top.y);
  });

  it("times the climb to the top on the playback clock, half a lap after the ramp", () => {
    const ramp = Math.hypot(track.rampStart.x, track.bottom.y);
    const metersPerS = (2 * Math.PI * r) / COASTER_LAP_S;
    expect(track.topS).toBeCloseTo((ramp + Math.PI * r) / metersPerS, 12);
  });

  it.each([
    ["speed", { speed: 0 }],
    ["speed", { speed: Number.NaN }],
    ["radius", { radius: -1 }],
    ["radius", { radius: Infinity }],
  ])("throws a RangeError naming a bad %s", (name, values) => {
    expect(() => coasterTrack(withLevel(values))).toThrow(
      new RegExp(`^${name} must be`),
    );
  });
});

describe("turnRadius", () => {
  it("is v² / a, and Infinity for no acceleration", () => {
    expect(turnRadius(20, 40)).toBe(10);
    expect(turnRadius(20, 8)).toBe(50);
    expect(turnRadius(20, 0)).toBe(Infinity);
  });
});

describe("buildCircularMotionLevel1Run", () => {
  it("starts at the foot of the left ramp, heading up it", () => {
    const states = run(right);
    const first = cart(states, 0);

    expect(states[0].step).toBe(0);
    expect(states[0].timeMs).toBe(0);
    expect(first.position).toEqual(track.rampStart);
    expect(first.angle).toBeCloseTo(
      Math.atan2(track.bottom.y, -track.rampStart.x),
      12,
    );
  });

  it("steps 60 frames a second", () => {
    const states = run(right);
    states.forEach((state, i) => {
      expect(state.step).toBe(i);
      if (i < states.length - 1) {
        expect(state.timeMs).toBeCloseTo(i * DEFAULT_STEP_MS, 9);
      }
    });
  });

  it("rides the loop on the track, turning with it", () => {
    const states = run(right);
    const onLoop = states.filter(
      (s) => s.timeMs > 0 && s.timeMs < track.topS * 1000,
    );
    const ramp = onLoop.filter(
      (s) => distance(cart([s], 0).position, track.center) > r + 1e-9,
    );
    const loop = onLoop.slice(ramp.length);

    expect(loop.length).toBeGreaterThan(10);
    for (const s of loop) {
      const { position, angle } = cart([s], 0);
      expect(distance(position, track.center)).toBeCloseTo(r, 9);
      // Heading is along the track: 90° ahead of the angle from the center.
      const around = Math.atan2(
        position.y - track.center.y,
        position.x - track.center.x,
      );
      expect(Math.cos(angle - around - Math.PI / 2)).toBeCloseTo(1, 9);
    }
  });

  it("pauses at the top, upside down, for COASTER_PAUSE_S", () => {
    const states = run(right);
    const paused = states.filter(
      (s) =>
        s.timeMs >= track.topS * 1000 &&
        s.timeMs <= (track.topS + COASTER_PAUSE_S) * 1000,
    );

    expect(paused.length).toBeGreaterThanOrEqual(59);
    for (const s of paused) {
      expect(cart([s], 0)).toEqual({ position: track.top, angle: Math.PI });
    }
  });

  it("finishes the loop and the right ramp for the right answer", () => {
    const states = run(right);
    const down = afterTop(states);

    const last = cart(states, -1);
    expect(last.position.x).toBeCloseTo(track.rampEnd.x, 9);
    expect(last.position.y).toBeCloseTo(0, 9);
    expect(last.angle).toBeCloseTo(
      Math.atan2(-track.bottom.y, track.rampEnd.x),
      12,
    );
    // Never inside or outside the loop on the way down.
    for (const s of down) {
      const p = cart([s], 0).position;
      if (p.y > track.bottom.y + 1e-9) {
        expect(distance(p, track.center)).toBeCloseTo(r, 9);
      }
    }
    const metersPerS = (2 * Math.PI * r) / COASTER_LAP_S;
    const rampS = Math.hypot(track.rampEnd.x, track.bottom.y) / metersPerS;
    expect(states.at(-1)!.timeMs).toBeCloseTo(
      (track.topS + COASTER_PAUSE_S + (Math.PI * r) / metersPerS + rampS) *
        1000,
      6,
    );
  });

  it("stays on the track for the answer the level stores, v² / r in its last bits", () => {
    const states = run((20 / Math.sqrt(10)) ** 2);
    expect(cart(states, -1).position.x).toBeCloseTo(track.rampEnd.x, 9);
  });

  it("swings a too-small acceleration wide of the loop, onto the floor", () => {
    const states = run(20); // a 20 m circle
    const down = afterTop(states);

    for (const s of down.slice(0, -1)) {
      const p = cart([s], 0).position;
      expect(distance(p, track.center)).toBeGreaterThan(r);
      // On the 20 m circle under the top.
      expect(distance(p, { x: 0, y: track.top.y - 20 })).toBeCloseTo(20, 9);
    }
    const last = cart(states, -1).position;
    expect(last.y).toBe(0);
    expect(last.x).toBeLessThan(0);
    expect(last.x).toBeGreaterThan(track.leftX);
  });

  it("stops a nearly straight cart at the stage's left edge", () => {
    const states = run(0.5); // an 800 m circle
    const last = cart(states, -1).position;

    expect(last.x).toBe(track.leftX);
    expect(last.y).toBeGreaterThan(0);
    expect(last.y).toBeLessThan(track.top.y);
  });

  it("sends a cart with no acceleration straight out of the left edge", () => {
    const states = run(0);
    const down = afterTop(states);

    for (const s of down) {
      const { position, angle } = cart([s], 0);
      expect(position.y).toBeCloseTo(track.top.y, 9);
      expect(angle).toBe(Math.PI);
    }
    const last = cart(states, -1).position;
    expect(last.x).toBe(track.leftX);
    expect(last.y).toBeCloseTo(track.top.y, 9);
  });

  it("cuts a too-big acceleration inside the loop, round its circle and back to the top", () => {
    const states = run(160); // a 2.5 m circle
    const down = afterTop(states);

    expect(down.length).toBeGreaterThan(2);
    for (const s of down.slice(0, -1)) {
      const p = cart([s], 0).position;
      expect(distance(p, track.center)).toBeLessThan(r);
      expect(distance(p, { x: 0, y: track.top.y - 2.5 })).toBeCloseTo(2.5, 9);
    }
    const last = cart(states, -1);
    expect(last.position.x).toBeCloseTo(0, 9);
    expect(last.position.y).toBeCloseTo(track.top.y, 9);
    expect(last.angle).toBeCloseTo(3 * Math.PI, 9);
  });

  it("goes all the way round a slightly wide circle that clears the floor", () => {
    // 10.5 m: wider than the loop, but its bottom is above the floor.
    const states = run(400 / 10.5);
    const last = cart(states, -1).position;

    expect(last.x).toBeCloseTo(0, 9);
    expect(last.y).toBeCloseTo(track.top.y, 9);
    expect(
      Math.min(...afterTop(states).map((s) => cart([s], 0).position.y)),
    ).toBeGreaterThan(0);
  });

  it.each([-1, Number.NaN, Infinity])(
    "throws a RangeError for an acceleration of %s",
    (acceleration) => {
      expect(() => run(acceleration)).toThrow(
        /^acceleration must be a finite number >= 0/,
      );
    },
  );

  it("throws a RangeError for a level with no radius", () => {
    expect(() => run(right, withLevel({ radius: 0 }))).toThrow(
      /^radius must be/,
    );
  });

  it("freezes every frame", () => {
    for (const state of run(8)) expect(Object.isFrozen(state)).toBe(true);
  });
});
