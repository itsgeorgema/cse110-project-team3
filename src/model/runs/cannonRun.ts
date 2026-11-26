import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { AnswerSubmission } from "../AnswerValidator.ts";
import { DEFAULT_STEP_MS } from "../SimulationRunner.ts";
import {
  snapshotState,
  type SimulationState,
  type Vec2,
} from "../SimulationState.ts";

/**
 * Minigame 3 runs (#138). Units are meters and seconds with y pointing UP, as
 * in #95: the cannon's mouth is at (0, 0) and the floor is y = 0. The view
 * flips y and scales to pixels when it draws.
 */

/** The object id the stuntman has in every cannon frame. */
export const CANNON_BALL_ID = "ball";

/** The longest a run plays, in seconds, if nothing else stops it. */
export const CANNON_TIME_CAP_S = 10;

/**
 * The inside of the tent, in meters. The net is centered where the level's
 * real launch lands. A run stops when it reaches the floor (y = 0), the tent
 * wall (`wallX`), the tent top (`ceilingY`) or the open left side (`leftX`).
 */
export interface CannonArena {
  /** Center of the landing net: the real range, R = 2 * vx * vy / g. */
  readonly netX: number;
  /** Width of the net. Wide, so the ideal run lands well inside it. */
  readonly netWidth: number;
  /** The left edge of the stage, behind the cannon (negative). */
  readonly leftX: number;
  /** The tent wall on the right. */
  readonly wallX: number;
  /** The tent top. */
  readonly ceilingY: number;
}

/** Why a run stopped, read from its last frame. */
export type CannonStop = "landed" | "wall" | "ceiling" | "left" | "timeCap";

/** A finite number, or a RangeError naming the variable. */
function finite(name: string, value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number, got ${value}`);
  }
  return value;
}

/** A finite number > 0, or a RangeError naming the variable. */
function positive(name: string, value: number): number {
  if (!(Number.isFinite(value) && value > 0)) {
    throw new RangeError(`${name} must be a finite number > 0, got ${value}`);
  }
  return value;
}

/**
 * The tent for a level, from its launch speed, launch angle (degrees) and
 * gravity. Throws a RangeError naming any value that is missing or out of range.
 */
export function cannonArena(level: LevelDataConfig): CannonArena {
  const v = level.problemStatementVariablesValues;
  const speed = positive("launchSpeed", v.launchSpeed);
  const angle = finite("launchAngle", v.launchAngle);
  if (!(angle > 0 && angle < 90)) {
    throw new RangeError(
      `launchAngle must be between 0 and 90 degrees, got ${angle}`,
    );
  }
  const gravity = positive(
    "gravitationalAcceleration",
    v.gravitationalAcceleration,
  );
  const radians = (angle * Math.PI) / 180;
  const vx = speed * Math.cos(radians);
  const vy = speed * Math.sin(radians);
  const range = (2 * vx * vy) / gravity;
  const peak = (vy * vy) / (2 * gravity);
  const leftX = -0.25 * range;
  const wallX = 1.6 * range;
  return {
    netX: range,
    netWidth: 0.16 * range,
    leftX,
    wallX,
    ceilingY: Math.max(0.45 * (wallX - leftX), 1.5 * peak),
  };
}

/**
 * Why a run stopped. A run's last frame sits exactly on the boundary it
 * reached, so this compares exact values.
 */
export function cannonStop(position: Vec2, arena: CannonArena): CannonStop {
  if (position.y === 0) return "landed";
  if (position.x === arena.wallX) return "wall";
  if (position.x === arena.leftX) return "left";
  if (position.y === arena.ceilingY) return "ceiling";
  return "timeCap";
}

/**
 * Level 1: the stuntman flies by the player's velocity equations,
 * vx(t) = vx0 + rx * t and vy(t) = vy0 - ry * t, so
 * x = vx0 * t + rx * t² / 2 and y = vy0 * t - ry * t² / 2.
 * Frames are 60 per second. The last frame is where the run stops: on the
 * floor, the tent wall, the tent top or the left edge, or at the time cap.
 */
export function buildCannonLevel1Run(
  submission: AnswerSubmission,
  level: LevelDataConfig,
): SimulationState[] {
  const values = submission.values;
  const vx0 = finite(
    "initialHorizontalVelocity",
    values.initialHorizontalVelocity,
  );
  const rx = finite("horizontalVelocityRate", values.horizontalVelocityRate);
  const vy0 = finite("initialVerticalVelocity", values.initialVerticalVelocity);
  const ry = finite("verticalVelocityRate", values.verticalVelocityRate);
  const arena = cannonArena(level);

  const at = (t: number): Vec2 => ({
    x: vx0 * t + (rx * t * t) / 2,
    y: vy0 * t - (ry * t * t) / 2,
  });
  const stopped = (p: Vec2): boolean =>
    p.y <= 0 ||
    p.x >= arena.wallX ||
    p.x <= arena.leftX ||
    p.y >= arena.ceilingY;

  const states: SimulationState[] = [frame(0, 0, { x: 0, y: 0 })];
  const capS = CANNON_TIME_CAP_S;
  for (let step = 1; ; step++) {
    const previousS = ((step - 1) * DEFAULT_STEP_MS) / 1000;
    const t = Math.min((step * DEFAULT_STEP_MS) / 1000, capS);
    if (stopped(at(t))) {
      const hit = firstStop(previousS, t, (s) => stopped(at(s)));
      states.push(frame(step, hit * 1000, clampInto(at(hit), arena)));
      return states;
    }
    states.push(frame(step, t * 1000, at(t)));
    if (t === capS) return states;
  }
}

/**
 * The earliest time in (lo, hi] when `stopped` is true, given it is false at
 * lo and true at hi. Bisection, accurate to well under a microsecond.
 */
function firstStop(
  lo: number,
  hi: number,
  stopped: (t: number) => boolean,
): number {
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (mid > lo && stopped(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Puts a position that just crossed a boundary exactly on it. */
function clampInto(p: Vec2, arena: CannonArena): Vec2 {
  return {
    x: Math.min(Math.max(p.x, arena.leftX), arena.wallX),
    y: Math.min(Math.max(p.y, 0), arena.ceilingY),
  };
}

function frame(step: number, timeMs: number, position: Vec2): SimulationState {
  return snapshotState(step, timeMs, [
    { id: CANNON_BALL_ID, position, angle: 0 },
  ]);
}
