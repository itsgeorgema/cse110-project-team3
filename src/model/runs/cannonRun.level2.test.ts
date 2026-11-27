import { describe, expect, it } from "vitest";
import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { SimulationState } from "../SimulationState.ts";
import { DEFAULT_STEP_MS } from "../SimulationRunner.ts";
import {
  buildCannonLevel2Run,
  CANNON_BALL_ID,
  CANNON_GUESS_ID,
  cannonPauseArena,
} from "./cannonRun.ts";

const g = 9.81;
// 20 m/s at 30°: vx = 17.32, vy = 10. It peaks at 1.019 s and lands at
// 2.039 s. At t = 1 s it is at (17.32, 10 - g / 2) = (17.32, 5.095).
const level = {
  gameId: "cannonTrajectory",
  levelId: 2,
  problemStatementVariablesValues: {
    launchSpeed: 20,
    launchAngle: 30,
    time: 1,
    gravitationalAcceleration: g,
  },
} as unknown as LevelDataConfig;
const vx = 20 * Math.cos(Math.PI / 6);
const vy = 10;
const right = {
  averageHorizontalVelocity: vx,
  averageVerticalVelocity: vy - g / 2,
  horizontalDisplacement: vx,
  verticalDisplacement: vy - g / 2,
};

function submit(values: Partial<Record<string, number>> = {}) {
  return {
    gameId: "cannonTrajectory",
    levelId: 2,
    values: { ...right, ...values } as Record<string, number>,
    units: {},
  };
}

function at(states: readonly SimulationState[], i: number, id: string) {
  return states.at(i)!.objects[id].position;
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

describe("cannonPauseArena", () => {
  it("puts the ball where the real launch is at t", () => {
    const arena = cannonPauseArena(level);

    expect(arena.time).toBe(1);
    expect(arena.ball.x).toBeCloseTo(vx, 10);
    expect(arena.ball.y).toBeCloseTo(vy - g / 2, 10);
  });

  it("fits the flight up to t, with room around the ball", () => {
    const arena = cannonPauseArena(level);

    expect(arena.leftX).toBeCloseTo(-0.25 * vx, 10);
    expect(arena.wallX).toBeCloseTo(1.6 * vx, 10);
    expect(arena.ceilingY).toBeGreaterThan(arena.ball.y);
    // A shallow launch: the tent's width sets its height.
    expect(arena.ceilingY).toBeCloseTo(0.3 * 1.85 * vx, 10);
  });

  it("makes room for the peak once the ball has passed it", () => {
    // At 60°, early: the tent is wide enough, so the peak is what counts.
    const steep = withValues({ launchAngle: 60, time: 2.5 });
    const steepVy = 20 * Math.sin(Math.PI / 3);
    const peak = (steepVy * steepVy) / (2 * g);

    expect(cannonPauseArena(steep).ceilingY).toBeCloseTo(1.5 * peak, 10);
  });

  it("is sized from the ball, not the whole flight, when the pause is early", () => {
    const early = cannonPauseArena(withValues({ time: 0.1 }));

    expect(early.wallX).toBeCloseTo(1.6 * vx * 0.1, 10);
  });

  it.each([
    ["launchSpeed", 0],
    ["launchSpeed", Number.NaN],
    ["launchAngle", 0],
    ["launchAngle", 90],
    ["gravitationalAcceleration", 0],
    ["time", 0],
    ["time", -1],
    ["time", Number.POSITIVE_INFINITY],
  ])("rejects %s = %s", (name, value) => {
    expect(() => cannonPauseArena(withValues({ [name]: value }))).toThrow(
      new RegExp(name),
    );
  });

  it("rejects a time at or after the landing", () => {
    const landing = (2 * vy) / g;

    expect(() => cannonPauseArena(withValues({ time: landing }))).toThrow(
      /time must be before the launch lands/,
    );
    expect(() => cannonPauseArena(withValues({ time: 3 }))).toThrow(RangeError);
  });

  it("rejects a level with no time", () => {
    const { time: _time, ...rest } = level.problemStatementVariablesValues;
    void _time;
    expect(() =>
      cannonPauseArena({ ...level, problemStatementVariablesValues: rest }),
    ).toThrow(/time/);
  });
});

describe("buildCannonLevel2Run", () => {
  it("starts the ball at the cannon's mouth", () => {
    const states = buildCannonLevel2Run(submit(), level);

    expect(states[0].timeMs).toBe(0);
    expect(at(states, 0, CANNON_BALL_ID)).toEqual({ x: 0, y: 0 });
  });

  it("stops exactly at t, in the air where the real launch is", () => {
    const states = buildCannonLevel2Run(submit(), level);
    const last = at(states, -1, CANNON_BALL_ID);

    expect(states.at(-1)!.timeMs).toBeCloseTo(1000, 9);
    expect(last.x).toBeCloseTo(vx, 10);
    expect(last.y).toBeCloseTo(vy - g / 2, 10);
    expect(last.y).toBeGreaterThan(0);
  });

  it("plays 60 frames per second on the real launch path", () => {
    const states = buildCannonLevel2Run(submit(), level);

    expect(states).toHaveLength(61);
    for (const state of states) {
      const t = state.timeMs / 1000;
      const ball = state.objects[CANNON_BALL_ID].position;
      expect(ball.x).toBeCloseTo(vx * t, 9);
      expect(ball.y).toBeCloseTo(vy * t - (g * t * t) / 2, 9);
    }
    expect(states[1].timeMs).toBeCloseTo(DEFAULT_STEP_MS, 10);
  });

  it("ends on t even when t is not a whole number of frames", () => {
    const states = buildCannonLevel2Run(submit(), withValues({ time: 0.31 }));

    expect(states.at(-1)!.timeMs).toBeCloseTo(310, 9);
    expect(states.at(-2)!.timeMs).toBeLessThan(310);
  });

  it("puts the right answer's point on the ball at t", () => {
    const states = buildCannonLevel2Run(submit(), level);
    const ball = at(states, -1, CANNON_BALL_ID);

    expect(at(states, -1, CANNON_GUESS_ID).x).toBeCloseTo(ball.x, 10);
    expect(at(states, -1, CANNON_GUESS_ID).y).toBeCloseTo(ball.y, 10);
  });

  it("puts a wrong answer's point where the player's numbers say", () => {
    const states = buildCannonLevel2Run(
      submit({
        horizontalDisplacement: 20,
        verticalDisplacement: 3,
        averageHorizontalVelocity: 15,
        averageVerticalVelocity: 10,
      }),
      level,
    );

    expect(at(states, -1, CANNON_GUESS_ID)).toEqual({ x: 20, y: 3 });
    expect(Object.keys(states.at(-1)!.objects)).toEqual([
      CANNON_BALL_ID,
      CANNON_GUESS_ID,
    ]);
    // The ball still flies the real launch.
    expect(at(states, -1, CANNON_BALL_ID).x).toBeCloseTo(vx, 10);
  });

  it("carries the player's marks unchanged in every frame", () => {
    const states = buildCannonLevel2Run(
      submit({ horizontalDisplacement: 20 }),
      level,
    );

    for (const state of states) {
      expect(state.objects[CANNON_GUESS_ID].position.x).toBe(20);
    }
  });

  it("returns frozen frames", () => {
    const states = buildCannonLevel2Run(submit(), level);

    expect(Object.isFrozen(states[1])).toBe(true);
    expect(Object.isFrozen(states[1].objects[CANNON_GUESS_ID].position)).toBe(
      true,
    );
  });

  it.each(["horizontalDisplacement", "verticalDisplacement"])(
    "rejects a %s that is not a finite number",
    (name) => {
      expect(() =>
        buildCannonLevel2Run(submit({ [name]: Number.NaN }), level),
      ).toThrow(new RegExp(name));
      expect(() =>
        buildCannonLevel2Run(
          submit({ [name]: Number.POSITIVE_INFINITY }),
          level,
        ),
      ).toThrow(RangeError);
    },
  );

  it("rejects a missing answer", () => {
    expect(() =>
      buildCannonLevel2Run(
        { gameId: "cannonTrajectory", levelId: 2, values: {}, units: {} },
        level,
      ),
    ).toThrow(/horizontalDisplacement/);
  });

  it("rejects bad level values", () => {
    expect(() =>
      buildCannonLevel2Run(submit(), withValues({ time: 5 })),
    ).toThrow(/time/);
    expect(() =>
      buildCannonLevel2Run(submit(), withValues({ launchSpeed: -1 })),
    ).toThrow(/launchSpeed/);
  });
});
