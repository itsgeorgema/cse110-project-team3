import { snapshotState } from "./SimulationState";
import type {
  LiveBody,
  ObjectId,
  SimulationState,
  Vec2,
} from "./SimulationState";

export const DEFAULT_STEP_MS = 1000 / 60;

export type Shape =
  | { readonly kind: "circle"; readonly radius: number }
  | { readonly kind: "rect"; readonly width: number; readonly height: number };

export interface BodySpec {
  readonly id: ObjectId;
  readonly shape: Shape;
  readonly position: Vec2;
  readonly velocity?: Vec2;
  readonly isStatic?: boolean;
  /**
   * Air resistance, from 0 (none) to 1. Each step scales velocity by about
   * (1 - frictionAir). Omit it to use the matter-js default of 0.01.
   */
  readonly frictionAir?: number;
}

/**
 * PLACEHOLDER request shape: the physics subteam's problem generator turns a
 * submitted answer into one of these. Swap in the real scene format when it exists.
 */
export interface SimulationRequest {
  readonly bodies: readonly BodySpec[];
  readonly gravity?: Vec2;
  readonly stepMs?: number;
  readonly maxSteps: number;
  /** Optional early stop, e.g. "the ball reached the goal". */
  readonly isFinished?: (state: SimulationState) => boolean;
}

/** What PhysicsEngine.simulate depends on. matter-js never appears in this type. */
export interface SimulationRunner {
  run(request: SimulationRequest): SimulationState[];
}

/** The seam between "a physics library" and "recording a run". */
export interface SteppableWorld {
  step(dtMs: number): void;
  liveBodies(): Iterable<LiveBody>;
}

export interface RunOptions {
  readonly stepMs: number;
  readonly maxSteps: number;
  readonly isFinished?: ((state: SimulationState) => boolean) | undefined;
}

/** Steps a world on a fixed timestep and records a frozen snapshot per step. */
export function recordRun(
  world: SteppableWorld,
  options: RunOptions,
): SimulationState[] {
  const { stepMs, maxSteps, isFinished } = options;
  if (!(Number.isFinite(stepMs) && stepMs > 0)) {
    throw new RangeError(`stepMs must be a finite number > 0, got ${stepMs}`);
  }
  if (!Number.isInteger(maxSteps) || maxSteps < 0) {
    throw new RangeError(
      `maxSteps must be a non-negative integer, got ${maxSteps}`,
    );
  }

  const states: SimulationState[] = [snapshotState(0, 0, world.liveBodies())];
  for (let step = 1; step <= maxSteps; step++) {
    world.step(stepMs);
    const state = snapshotState(step, step * stepMs, world.liveBodies());
    states.push(state);
    if (isFinished?.(state)) break;
  }
  return states;
}
