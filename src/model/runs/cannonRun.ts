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
 * The inside of the tent, in meters. A run stops when it reaches the floor
 * (y = 0), the tent wall (`wallX`), the tent top (`ceilingY`) or the open
 * left side (`leftX`).
 */
export interface CannonBounds {
  /** The left edge of the stage, behind the cannon (negative). */
  readonly leftX: number;
  /** The tent wall on the right. */
  readonly wallX: number;
  /** The tent top. */
  readonly ceilingY: number;
}

/** Level 1's tent: a landing net on the floor where the real launch lands. */
export interface CannonArena extends CannonBounds {
  /** Center of the landing net: the real range, R = 2 * vx * vy / g. */
  readonly netX: number;
  /** Width of the net. Wide, so the ideal run lands well inside it. */
  readonly netWidth: number;
}

/**
 * Level 3's tent (#143): a net hanging at the level's distance and height.
 * The ball flies through it rather than landing in it.
 */
export interface CannonTargetArena extends CannonBounds {
  /** The net's distance from the cannon: the level's horizontalDistance. */
  readonly targetX: number;
  /** The net's center height above the cannon: the level's targetHeight. */
  readonly targetY: number;
  /** Half the net's height. Sized from the tolerance, so it is never too small. */
  readonly targetHalfHeight: number;
}

/**
 * What a Level 3 launch does on its way to the net, worked out exactly from
 * its speed. A shot that reaches the net's distance `passed` it, `offset`
 * meters above (+) or below (-) the net's center. Otherwise it landed `gap`
 * meters `short`, or went out the tent `ceiling` first.
 */
export type CannonTargetOutcome =
  | { readonly kind: "passed"; readonly offset: number }
  | { readonly kind: "short"; readonly gap: number }
  | { readonly kind: "ceiling" };

/** Why a run stopped, read from its last frame. */
export type CannonStop = "landed" | "wall" | "ceiling" | "left" | "timeCap";

/** A finite number, or a RangeError naming the variable. */
function finite(name: string, value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number, got ${value}`);
  }
  return value;
}

/** A finite number >= 0, or a RangeError naming the variable. */
function nonNegative(name: string, value: number): number {
  if (!(Number.isFinite(value) && value >= 0)) {
    throw new RangeError(`${name} must be a finite number >= 0, got ${value}`);
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
 * Level 3's net is never drawn smaller than this fraction of its distance,
 * half-height, so it stays visible however tight the tolerance is.
 */
export const CANNON_TARGET_MIN_HALF_HEIGHT = 0.035;

/**
 * The tightest the net can be, in multiples of the height band that accepted
 * answers pass through, so an accepted speed always looks like a hit.
 */
export const CANNON_TARGET_TOLERANCE_MARGIN = 2;

/** Level 3's launch, read from the level's values. */
interface TargetLaunch {
  readonly distance: number;
  readonly height: number;
  readonly radians: number;
  readonly gravity: number;
}

function targetLaunch(level: LevelDataConfig): TargetLaunch {
  const v = level.problemStatementVariablesValues;
  const distance = positive("horizontalDistance", v.horizontalDistance);
  const height = finite("targetHeight", v.targetHeight);
  const angle = finite("launchAngle", v.launchAngle);
  if (!(angle > 0 && angle < 90)) {
    throw new RangeError(
      `launchAngle must be between 0 and 90 degrees, got ${angle}`,
    );
  }
  const radians = (angle * Math.PI) / 180;
  if (!(height >= 0 && height < distance * Math.tan(radians))) {
    throw new RangeError(
      `targetHeight must be >= 0 and below the launch line, got ${height}`,
    );
  }
  const gravity = positive(
    "gravitationalAcceleration",
    v.gravitationalAcceleration,
  );
  return { distance, height, radians, gravity };
}

/** The height of a launch at `speed` when it is `x` meters out. */
function heightAt(launch: TargetLaunch, speed: number, x: number): number {
  const cos = Math.cos(launch.radians);
  return (
    x * Math.tan(launch.radians) -
    (launch.gravity * x * x) / (2 * speed * speed * cos * cos)
  );
}

/**
 * The tent for Level 3, from the net's distance and height, the launch angle
 * and gravity. It fits the whole flight of the speed that hits the net's
 * center. Throws a RangeError naming any value that is missing or out of range.
 */
export function cannonTargetArena(level: LevelDataConfig): CannonTargetArena {
  const launch = targetLaunch(level);
  const { distance, height, radians, gravity } = launch;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  // The speed that passes through (distance, height): v² = g x² / (2 cos² (x tan − y)).
  const speedSquared =
    (gravity * distance * distance) /
    (2 * cos * cos * (distance * Math.tan(radians) - height));
  const speed = Math.sqrt(speedSquared);
  const range = (2 * speedSquared * sin * cos) / gravity;
  const peak = (speedSquared * sin * sin) / (2 * gravity);

  // Accepted speeds are within this much of the answer, so they pass the net
  // within `band` of its center: dy/dv = g x² / (v³ cos²).
  const tolerance =
    level.toleranceRule.absolute + (level.toleranceRule.relative ?? 0) * speed;
  const band =
    ((gravity * distance * distance) / (speed ** 3 * cos * cos)) * tolerance;

  const wallX = Math.max(1.15 * range, 1.25 * distance);
  const leftX = -0.2 * distance;
  return {
    targetX: distance,
    targetY: height,
    targetHalfHeight: Math.max(
      CANNON_TARGET_TOLERANCE_MARGIN * band,
      CANNON_TARGET_MIN_HALF_HEIGHT * distance,
    ),
    leftX,
    wallX,
    ceilingY: Math.max(0.45 * (wallX - leftX), 1.3 * peak, 1.5 * height),
  };
}

/**
 * What a Level 3 launch at `speed` does before it reaches the net's distance.
 * Nothing else can stop it first: the wall is past the net and the ball never
 * flies backward. Throws a RangeError for a speed that is not finite or < 0.
 */
export function cannonTargetOutcome(
  speed: number,
  level: LevelDataConfig,
): CannonTargetOutcome {
  const launch = targetLaunch(level);
  const arena = cannonTargetArena(level);
  nonNegative("launchSpeed", speed);
  const { distance, radians, gravity } = launch;
  const range = (speed * speed * Math.sin(2 * radians)) / gravity;
  // A shot that lands short peaks lower than the right one, which the tent
  // top clears, so it cannot leave by the top first.
  if (range < distance) return { kind: "short", gap: distance - range };
  // The top of its arc is at range / 2: before the net, or still rising there.
  const highest =
    range / 2 < distance
      ? (speed * Math.sin(radians)) ** 2 / (2 * gravity)
      : heightAt(launch, speed, distance);
  if (highest >= arena.ceilingY) return { kind: "ceiling" };
  return {
    kind: "passed",
    offset: heightAt(launch, speed, distance) - launch.height,
  };
}

/**
 * Why a run stopped. A run's last frame sits exactly on the boundary it
 * reached, so this compares exact values.
 */
export function cannonStop(position: Vec2, arena: CannonBounds): CannonStop {
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

  return flyUntilStopped(
    (t) => ({
      x: vx0 * t + (rx * t * t) / 2,
      y: vy0 * t - (ry * t * t) / 2,
    }),
    arena,
  );
}

/**
 * Level 3 (#143): the stuntman leaves at the player's launch speed v and the
 * level's angle θ, so x = v cos θ t and y = v sin θ t - g t² / 2. Frames are
 * 60 per second. The ball flies on past the hanging net until it reaches the
 * floor, the tent wall or the tent top, or the time cap.
 */
export function buildCannonLevel3Run(
  submission: AnswerSubmission,
  level: LevelDataConfig,
): SimulationState[] {
  const speed = nonNegative("launchSpeed", submission.values.launchSpeed);
  const { radians, gravity } = targetLaunch(level);
  const arena = cannonTargetArena(level);
  const vx = speed * Math.cos(radians);
  const vy = speed * Math.sin(radians);
  return flyUntilStopped(
    (t) => ({ x: vx * t, y: vy * t - (gravity * t * t) / 2 }),
    arena,
  );
}

/**
 * Frames of the ball at `at(t)`, 60 per second from (0, 0). The last frame is
 * where the run stops: exactly on the floor, the tent wall, the tent top or
 * the left edge, or at the time cap.
 */
function flyUntilStopped(
  at: (t: number) => Vec2,
  arena: CannonBounds,
): SimulationState[] {
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
function clampInto(p: Vec2, arena: CannonBounds): Vec2 {
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
