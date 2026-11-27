import { describe, expect, it } from "vitest";
import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { SimulationState } from "../SimulationState.ts";
import {
  buildCircularMotionLevel1Run,
  buildCircularMotionLevel2Run,
  COASTER_CART_ID,
  COASTER_PAUSE_S,
  coasterTrack,
  forceLoop,
} from "./circularMotionRun.ts";

// 20 m/s on a 10 m loop, 100 kg, g = 10 m/s²: F_net = m v² / r = 4000 N.
const level = {
  gameId: "circularMotion",
  levelId: 2,
  problemStatementVariablesValues: {
    speed: 20,
    mass: 100,
    radius: 10,
    gravitationalAcceleration: 10,
  },
  toleranceRule: { absolute: 0.01 },
} as unknown as LevelDataConfig;
const track = coasterTrack(level);

function submission(values: Record<string, number>) {
  return { gameId: "circularMotion", levelId: 2, values, units: {} };
}

function run(netForce: number, on = level): SimulationState[] {
  return buildCircularMotionLevel2Run(
    submission({
      acceleration: 40,
      netForce,
      normalForce: 3000,
      gravitationalForce: 1000,
    }),
    on,
  );
}

/** Level 1's run for the same speed and loop at acceleration F / m. */
function level1(acceleration: number): SimulationState[] {
  return buildCircularMotionLevel1Run(submission({ acceleration }), {
    ...level,
    levelId: 1,
  } as LevelDataConfig);
}

function cart(states: readonly SimulationState[], i: number) {
  return states.at(i)!.objects[COASTER_CART_ID];
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

describe("forceLoop", () => {
  it("reads Level 2's loop, speed, mass and gravity", () => {
    expect(forceLoop(level)).toEqual({ track, mass: 100, gravity: 10 });
  });

  it.each([
    ["speed", { speed: 0 }],
    ["radius", { radius: -1 }],
    ["mass", { mass: 0 }],
    ["mass", { mass: Number.NaN }],
    ["gravitationalAcceleration", { gravitationalAcceleration: Infinity }],
  ])("throws a RangeError naming %s for a bad value", (name, values) => {
    expect(() => forceLoop(withLevel(values))).toThrow(
      new RegExp(`^${name} must be`),
    );
  });
});

describe("buildCircularMotionLevel2Run", () => {
  it("starts on the left ramp and finishes the loop for the right net force", () => {
    const states = run(4000);

    expect(cart(states, 0).position).toEqual(track.rampStart);
    expect(states[0].timeMs).toBe(0);
    const last = cart(states, -1);
    expect(last.position.x).toBeCloseTo(track.rampEnd.x, 9);
    expect(last.position.y).toBeCloseTo(0, 9);
  });

  it("pauses at the top, upside down", () => {
    const states = run(4000);
    const pause = states.filter(
      (s) =>
        s.timeMs > track.topS * 1000 &&
        s.timeMs < (track.topS + COASTER_PAUSE_S) * 1000,
    );
    expect(pause.length).toBeGreaterThan(0);
    for (const s of pause) {
      expect(s.objects[COASTER_CART_ID].position).toEqual(track.top);
      expect(s.objects[COASTER_CART_ID].angle).toBe(Math.PI);
    }
  });

  it("rides the loop for a net force within the level's tolerance", () => {
    expect(run(4000.01)).toEqual(run(4000));
    expect(run(3999.99)).toEqual(run(4000));
  });

  it("only rides the loop for an exact net force when the level has no tolerance", () => {
    const strict = {
      ...level,
      toleranceRule: undefined,
    } as unknown as LevelDataConfig;
    expect(cart(run(4000, strict), -1).position.x).toBeCloseTo(
      track.rampEnd.x,
      9,
    );
    expect(cart(run(4000.01, strict), -1).position.x).not.toBeCloseTo(
      track.rampEnd.x,
      0,
    );
  });

  it.each([2000, 8000, 0])(
    "turns the circle F_net / m gives off the track, as Level 1 does, for %s N",
    (netForce) => {
      expect(run(netForce)).toEqual(level1(netForce / 100));
      expect(cart(run(netForce), -1).position.x).not.toBeCloseTo(
        track.rampEnd.x,
        0,
      );
    },
  );

  it("ignores the typed normal and gravitational forces", () => {
    const other = buildCircularMotionLevel2Run(
      submission({ netForce: 2000, normalForce: 1, gravitationalForce: 2 }),
      level,
    );
    expect(other).toEqual(run(2000));
  });

  it.each([-1, Number.NaN, Infinity, undefined])(
    "throws a RangeError naming netForce for %s",
    (netForce) => {
      expect(() =>
        buildCircularMotionLevel2Run(
          submission(netForce === undefined ? {} : { netForce }),
          level,
        ),
      ).toThrow(/^netForce must be a finite number >= 0/);
    },
  );

  it("throws a RangeError for a level with no mass", () => {
    expect(() => run(4000, withLevel({ mass: 0 }))).toThrow(/^mass must be/);
  });
});
