import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { AnswerSubmission } from "../AnswerValidator.ts";
import { DEFAULT_STEP_MS } from "../SimulationRunner.ts";
import {
  snapshotState,
  type SimulationState,
  type Vec2,
} from "../SimulationState.ts";

/**
 * Minigame 4 runs (#139). Units are meters with y pointing UP: the floor is
 * y = 0 and the loop's bottom sits on a short rise at (0, rampRise), so the
 * ramps slope up from the floor into the loop, as in the #110 mockup.
 *
 * The cart moves at constant speed, so where it is depends only on how far
 * it has gone. Real time would make a 40 m loop at 10 m/s take 25 s, so
 * frames are on a playback clock instead: one lap of the loop always takes
 * COASTER_LAP_S. Every distance, and every circle the cart turns, keeps its
 * real size.
 *
 * A frame's angle is the cart's heading in radians, counterclockwise from +x,
 * so the cart turns with the track.
 */

/** The object id the cart has in every coaster frame. */
export const COASTER_CART_ID = "cart";

/** Seconds one full lap of the loop takes on screen, at any speed and radius. */
export const COASTER_LAP_S = 2.4;

/** Seconds the cart waits at the top of the loop, so the arrow can be read. */
export const COASTER_PAUSE_S = 1;

/** Height of the rise under the loop, in loop radii. */
const RAMP_RISE = 0.12;
/** Horizontal length of each ramp, in loop radii. */
const RAMP_RUN = 2.2;
/** Half the stage's width, in loop radii. */
const SIDE = 2.6;
/** Room above the loop's top, in loop radii. */
const HEADROOM = 0.35;

/** Where the track and the stage's edges are for a level, in meters. */
export interface CoasterTrack {
  /** The level's speed, in m/s. */
  readonly speed: number;
  /** The loop's radius, in meters. */
  readonly radius: number;
  /** The loop's center. */
  readonly center: Vec2;
  /** The loop's bottom, where both ramps meet it. */
  readonly bottom: Vec2;
  /** The loop's top, where the cart pauses. */
  readonly top: Vec2;
  /** Where the left ramp starts on the floor; the cart starts here. */
  readonly rampStart: Vec2;
  /** Where the right ramp ends on the floor. */
  readonly rampEnd: Vec2;
  /** The stage's left and right edges. A cart that reaches one stops. */
  readonly leftX: number;
  readonly rightX: number;
  /** The stage's top. Nothing reaches it; it only sizes the view. */
  readonly ceilingY: number;
  /** When the cart reaches the top, in playback seconds. */
  readonly topS: number;
}

/** A finite number > 0, or a RangeError naming the variable. */
function positive(name: string, value: number): number {
  if (!(Number.isFinite(value) && value > 0)) {
    throw new RangeError(`${name} must be a finite number > 0, got ${value}`);
  }
  return value;
}

/** Meters the cart covers per playback second, so a lap is COASTER_LAP_S. */
function pace(radius: number): number {
  return (2 * Math.PI * radius) / COASTER_LAP_S;
}

/**
 * The track for a level, from its speed and radius. Throws a RangeError
 * naming either value when it is missing or not > 0.
 */
export function coasterTrack(level: LevelDataConfig): CoasterTrack {
  const v = level.problemStatementVariablesValues;
  const speed = positive("speed", v.speed);
  const radius = positive("radius", v.radius);
  const rise = RAMP_RISE * radius;
  const run = RAMP_RUN * radius;
  const top = { x: 0, y: rise + 2 * radius };
  return {
    speed,
    radius,
    center: { x: 0, y: rise + radius },
    bottom: { x: 0, y: rise },
    top,
    rampStart: { x: -run, y: 0 },
    rampEnd: { x: run, y: 0 },
    leftX: -SIDE * radius,
    rightX: SIDE * radius,
    ceilingY: top.y + HEADROOM * radius,
    topS: (Math.hypot(run, rise) + Math.PI * radius) / pace(radius),
  };
}

/**
 * The radius of the circle an acceleration turns at this speed, r = v² / a.
 * Infinity for no acceleration: the cart goes straight.
 */
export function turnRadius(speed: number, acceleration: number): number {
  return acceleration === 0 ? Infinity : (speed * speed) / acceleration;
}

interface Pose {
  readonly position: Vec2;
  readonly angle: number;
}

/**
 * A point `distance` along a circle of `radius` that starts at `start`
 * heading `heading` and turns counterclockwise. Written from the start point,
 * so it stays exact for a huge radius; an infinite radius is a straight line.
 */
function arc(
  start: Vec2,
  heading: number,
  radius: number,
  distance: number,
): Pose {
  const turned = radius === Infinity ? 0 : distance / radius;
  // Along the heading, and toward the circle's center to its left.
  const along = radius === Infinity ? distance : radius * Math.sin(turned);
  const across =
    radius === Infinity ? 0 : 2 * radius * Math.sin(turned / 2) ** 2;
  const cos = Math.cos(heading);
  const sin = Math.sin(heading);
  return {
    position: {
      x: start.x + along * cos - across * sin,
      y: start.y + along * sin + across * cos,
    },
    angle: heading + turned,
  };
}

/** A point `distance` along the straight line from `from` to `to`. */
function line(from: Vec2, to: Vec2, distance: number): Pose {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const f = distance / length;
  return {
    position: {
      x: from.x + (to.x - from.x) * f,
      y: from.y + (to.y - from.y) * f,
    },
    angle: Math.atan2(to.y - from.y, to.x - from.x),
  };
}

/**
 * Level 1: the cart climbs the left ramp, rides the loop at the level's speed
 * and pauses at the top. From there it turns on the circle the player's
 * acceleration gives at that speed, r = v² / a. The right answer's circle is
 * the loop, so the cart finishes it and rolls down the right ramp. Any other
 * circle leaves the track: wider for too small an acceleration, tighter for
 * too big, and straight for 0. That run stops when the cart reaches the
 * floor or a stage edge, or once it has gone all the way round its circle.
 * Frames are 60 per playback second.
 */
export function buildCircularMotionLevel1Run(
  submission: AnswerSubmission,
  level: LevelDataConfig,
): SimulationState[] {
  const acceleration = submission.values.acceleration;
  if (!(Number.isFinite(acceleration) && acceleration >= 0)) {
    throw new RangeError(
      `acceleration must be a finite number >= 0, got ${acceleration}`,
    );
  }
  const track = coasterTrack(level);
  const r = track.radius;
  const metersPerS = pace(r);
  const typed = turnRadius(track.speed, acceleration);
  // The exact answer can differ from v * v / r in its last bits.
  const onTrack = Math.abs(typed - r) <= 1e-9 * r;
  const turn = onTrack ? r : typed;

  const rampS =
    Math.hypot(track.bottom.x - track.rampStart.x, track.bottom.y) / metersPerS;
  const leaveS = track.topS + COASTER_PAUSE_S;
  const lastArcS = onTrack
    ? leaveS + (Math.PI * r) / metersPerS
    : leaveS + (2 * Math.PI * turn) / metersPerS;
  const endS = onTrack ? lastArcS + rampS : lastArcS;

  const pose = (t: number): Pose => {
    if (t <= rampS) {
      return line(track.rampStart, track.bottom, t * metersPerS);
    }
    if (t <= track.topS) {
      return arc(track.bottom, 0, r, (t - rampS) * metersPerS);
    }
    if (t <= leaveS) return { position: track.top, angle: Math.PI };
    if (t <= lastArcS) {
      return arc(track.top, Math.PI, turn, (t - leaveS) * metersPerS);
    }
    return line(track.bottom, track.rampEnd, (t - lastArcS) * metersPerS);
  };
  const off = (p: Vec2): boolean =>
    p.y <= 0 || p.x <= track.leftX || p.x >= track.rightX;

  const states: SimulationState[] = [frame(0, 0, pose(0))];
  for (let step = 1; ; step++) {
    const previousS = ((step - 1) * DEFAULT_STEP_MS) / 1000;
    const t = Math.min((step * DEFAULT_STEP_MS) / 1000, endS);
    if (!onTrack && t > leaveS && off(pose(t).position)) {
      const hit = firstStop(Math.max(previousS, leaveS), t, (s) =>
        off(pose(s).position),
      );
      const p = pose(hit);
      states.push(
        frame(step, hit * 1000, {
          position: clampInto(p.position, track),
          angle: p.angle,
        }),
      );
      return states;
    }
    states.push(frame(step, t * 1000, pose(t)));
    if (t === endS) return states;
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

/** Puts a position that just crossed the floor or an edge exactly on it. */
function clampInto(p: Vec2, track: CoasterTrack): Vec2 {
  return {
    x: Math.min(Math.max(p.x, track.leftX), track.rightX),
    y: Math.max(p.y, 0),
  };
}

function frame(step: number, timeMs: number, pose: Pose): SimulationState {
  return snapshotState(step, timeMs, [
    { id: COASTER_CART_ID, position: pose.position, angle: pose.angle },
  ]);
}
