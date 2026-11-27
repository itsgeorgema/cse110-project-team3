import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { AnswerSubmission } from "../AnswerValidator.ts";
import { DEFAULT_STEP_MS } from "../SimulationRunner.ts";
import { snapshotState, type SimulationState } from "../SimulationState.ts";

/** The object id the crate has in every net force frame. */
export const CRATE_ID = "crate";

/** How long Level 1's push lasts, in seconds. The level gives no time, so the scene picks one. */
export const PUSH_SECONDS = 2;

/**
 * Gravity for the free body diagram, in m/s². Level 1's config gives no g,
 * so the diagram uses the same value as Level 2's config.
 */
export const STANDARD_GRAVITY = 9.81;

/**
 * How long Level 2's crate moves under the typed forces, in seconds, before
 * it holds for REST_HOLD_SECONDS and then snaps back to rest.
 */
export const REST_MOVE_SECONDS = 1;
export const REST_HOLD_SECONDS = 0.4;

/**
 * Minigame 2 runs (#140, #141). Positions are in meters: x along the floor from
 * where the crate starts, y up from the floor, both 0 at the start. The motion
 * is a closed formula, so the frames come straight from it.
 */

/** A finite number, or a RangeError naming the variable. */
function finite(name: string, value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number, got ${value}`);
  }
  return value;
}

/** A finite number > 0, or a RangeError naming the variable. */
function positive(name: string, value: number | undefined): number {
  const checked = finite(name, value);
  if (checked <= 0) {
    throw new RangeError(`${name} must be > 0, got ${checked}`);
  }
  return checked;
}

/** The crate's mass in kg, which must be a finite number > 0. */
export function crateMass(level: LevelDataConfig): number {
  return positive("mass", level.problemStatementVariablesValues.mass);
}

/**
 * Level 1: where the crate ends up after PUSH_SECONDS at the level's real
 * acceleration, x = a T² / 2, in meters. The scene draws its line here.
 */
export function pushFinish(level: LevelDataConfig): number {
  const acceleration = positive(
    "acceleration",
    level.problemStatementVariablesValues.acceleration,
  );
  return (acceleration * PUSH_SECONDS * PUSH_SECONDS) / 2;
}

/** Frames at 60 per second for `seconds`, the crate at `positionAt(t)` meters. */
export function crateRun(
  seconds: number,
  positionAt: (t: number) => { readonly x: number; readonly y: number },
): SimulationState[] {
  const durationMs = seconds * 1000;
  const steps = Math.ceil(durationMs / DEFAULT_STEP_MS);
  const states: SimulationState[] = [];
  for (let step = 0; step <= steps; step++) {
    // The last step lands exactly on the run's end.
    const timeMs = Math.min(step * DEFAULT_STEP_MS, durationMs);
    states.push(
      snapshotState(step, timeMs, [
        { id: CRATE_ID, position: positionAt(timeMs / 1000), angle: 0 },
      ]),
    );
  }
  return states;
}

/**
 * Level 1: the player's push is the only horizontal force, so the crate
 * speeds up at a = force / mass from rest for PUSH_SECONDS, x = a t² / 2.
 */
export function buildNetForceLevel1Run(
  submission: AnswerSubmission,
  level: LevelDataConfig,
): SimulationState[] {
  const force = finite("force", submission.values.force);
  const acceleration = force / crateMass(level);
  return crateRun(PUSH_SECONDS, (t) => ({
    x: (acceleration * t * t) / 2,
    y: 0,
  }));
}

/**
 * Level 2: the crate should stay at rest. It moves up or down under the typed
 * normal force and gravity, a = (F_N − F_g) / m, for REST_MOVE_SECONDS: it
 * lifts off if F_N > F_g and sinks into the floor if F_N < F_g. It holds
 * there for REST_HOLD_SECONDS, then the last frame puts it back at rest.
 * Balanced forces keep it still the whole run.
 */
export function buildNetForceLevel2Run(
  submission: AnswerSubmission,
  level: LevelDataConfig,
): SimulationState[] {
  const gravitational = finite(
    "gravitationalForce",
    submission.values.gravitationalForce,
  );
  const normal = finite("normalForce", submission.values.normalForce);
  const acceleration = (normal - gravitational) / crateMass(level);
  const moving = crateRun(REST_MOVE_SECONDS, (t) => ({
    x: 0,
    y: (acceleration * t * t) / 2,
  }));
  const reset = snapshotState(
    moving.length,
    (REST_MOVE_SECONDS + REST_HOLD_SECONDS) * 1000,
    [{ id: CRATE_ID, position: { x: 0, y: 0 }, angle: 0 }],
  );
  return [...moving, reset];
}
