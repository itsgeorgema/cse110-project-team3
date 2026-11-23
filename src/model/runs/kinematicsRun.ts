import type { LevelDataConfig } from "../../data/LevelDataConfig.ts";
import type { AnswerSubmission } from "../AnswerValidator.ts";
import { DEFAULT_STEP_MS } from "../SimulationRunner.ts";
import { snapshotState, type SimulationState } from "../SimulationState.ts";

/** The object id the car has in every kinematics frame. */
export const CAR_ID = "car";

/**
 * Minigame 1, Level 1 (#116 worked example): the car drives at the player's
 * velocity for the level's time. Positions are in meters along the road,
 * starting at x = 0 with y = 0 on the ground. Constant velocity needs no
 * physics library, so the frames come straight from x = v * t.
 */
export function buildKinematicsLevel1Run(
  submission: AnswerSubmission,
  level: LevelDataConfig,
): SimulationState[] {
  const velocity = submission.values.velocity;
  const seconds = level.problemStatementVariablesValues.time;
  if (!Number.isFinite(velocity)) {
    throw new RangeError(`velocity must be a finite number, got ${velocity}`);
  }
  if (!(Number.isFinite(seconds) && seconds > 0)) {
    throw new RangeError(`time must be a finite number > 0, got ${seconds}`);
  }

  const durationMs = seconds * 1000;
  const steps = Math.ceil(durationMs / DEFAULT_STEP_MS);
  const states: SimulationState[] = [];
  for (let step = 0; step <= steps; step++) {
    // The last step lands exactly on the level's time.
    const timeMs = Math.min(step * DEFAULT_STEP_MS, durationMs);
    const x = (velocity * timeMs) / 1000;
    states.push(
      snapshotState(step, timeMs, [
        { id: CAR_ID, position: { x, y: 0 }, angle: 0 },
      ]),
    );
  }
  return states;
}
