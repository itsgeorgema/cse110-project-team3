import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { AnswerSubmission } from "../AnswerValidator.ts";
import { DEFAULT_STEP_MS } from "../SimulationRunner.ts";
import { snapshotState, type SimulationState } from "../SimulationState.ts";

/** The object id the car has in every kinematics frame. */
export const CAR_ID = "car";

/**
 * Minigame 1 runs (#116). Positions are in meters along the road, starting at
 * x = 0 with y = 0 on the ground. The motion is a closed formula, so the
 * frames come straight from it and need no physics library.
 */

/** A finite number, or a RangeError naming the variable. */
function finite(name: string, value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number, got ${value}`);
  }
  return value;
}

/** The level's time in seconds, which must be a finite number > 0. */
function levelSeconds(level: LevelDataConfig): number {
  const seconds = level.problemStatementVariablesValues.time;
  if (!(Number.isFinite(seconds) && seconds > 0)) {
    throw new RangeError(`time must be a finite number > 0, got ${seconds}`);
  }
  return seconds;
}

/** Frames at 60 per second for `seconds`, the car at `positionAt(t)` meters. */
function carRun(
  seconds: number,
  positionAt: (t: number) => number,
): SimulationState[] {
  const durationMs = seconds * 1000;
  const steps = Math.ceil(durationMs / DEFAULT_STEP_MS);
  const states: SimulationState[] = [];
  for (let step = 0; step <= steps; step++) {
    // The last step lands exactly on the level's time.
    const timeMs = Math.min(step * DEFAULT_STEP_MS, durationMs);
    states.push(
      snapshotState(step, timeMs, [
        {
          id: CAR_ID,
          position: { x: positionAt(timeMs / 1000), y: 0 },
          angle: 0,
        },
      ]),
    );
  }
  return states;
}

/** Level 1: the car drives at the player's velocity for the level's time, x = v * t. */
export function buildKinematicsLevel1Run(
  submission: AnswerSubmission,
  level: LevelDataConfig,
): SimulationState[] {
  const velocity = finite("velocity", submission.values.velocity);
  return carRun(levelSeconds(level), (t) => velocity * t);
}

/**
 * Level 2: the player's displacement is how far the car goes in the level's
 * time, at a steady speed, so it ends at exactly that displacement.
 */
export function buildKinematicsLevel2Run(
  submission: AnswerSubmission,
  level: LevelDataConfig,
): SimulationState[] {
  const displacement = finite("displacement", submission.values.displacement);
  const seconds = levelSeconds(level);
  return carRun(seconds, (t) => (displacement * t) / seconds);
}

/**
 * Level 3: the car starts at the level's initial velocity and speeds up at
 * the player's acceleration, x = v0 * t + a * t² / 2.
 */
export function buildKinematicsLevel3Run(
  submission: AnswerSubmission,
  level: LevelDataConfig,
): SimulationState[] {
  const acceleration = finite("acceleration", submission.values.acceleration);
  const initialVelocity = finite(
    "initialVelocity",
    level.problemStatementVariablesValues.initialVelocity,
  );
  return carRun(
    levelSeconds(level),
    (t) => initialVelocity * t + (acceleration * t * t) / 2,
  );
}

/**
 * Level 4: the car speeds up at the level's acceleration from its initial
 * velocity, but ends at the player's distance. Its shape stays s(t) = v0*t + a*t²/2,
 * scaled so x(T) = distance: x(t) = distance * s(t) / s(T).
 */
export function buildKinematicsLevel4Run(
  submission: AnswerSubmission,
  level: LevelDataConfig,
): SimulationState[] {
  const distance = finite("distance", submission.values.distance);
  const v = level.problemStatementVariablesValues;
  const initialVelocity = finite("initialVelocity", v.initialVelocity);
  const acceleration = finite("acceleration", v.acceleration);
  const seconds = levelSeconds(level);
  const traveled = (t: number) =>
    initialVelocity * t + (acceleration * t * t) / 2;
  const total = traveled(seconds);
  if (!(total > 0)) {
    throw new RangeError(`the level's own distance must be > 0, got ${total}`);
  }
  return carRun(seconds, (t) => (distance * traveled(t)) / total);
}
