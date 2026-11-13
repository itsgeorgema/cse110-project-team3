/**
 * Shared contract between the physics subteam (producer) and the
 * animation subteam (consumer, see AnimationEngine in #23).
 * Plain data only: nothing in this file knows about matter-js.
 */

/** Stable identifier for one thing on screen (ball, crate, clown...). */
export type ObjectId = string;

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface ObjectState {
  readonly position: Vec2;
  /** Radians. */
  readonly angle: number;
}

/** One frame of a run. Every value is a copy, and the whole tree is frozen. */
export interface SimulationState {
  /** 0 is the initial layout, before any physics step has run. */
  readonly step: number;
  readonly timeMs: number;
  readonly objects: Readonly<Record<ObjectId, ObjectState>>;
}

/**
 * Structural view of a *live* body. Reading it is safe; keeping a reference to
 * it is not, because the physics library mutates `position` in place.
 */
export interface LiveBody {
  readonly id: ObjectId;
  readonly position: Vec2;
  readonly angle: number;
}

/**
 * The only place a live body becomes a SimulationState. It copies primitives
 * into brand-new objects, so a later physics step cannot change an earlier frame.
 */
export function snapshotState(
  step: number,
  timeMs: number,
  bodies: Iterable<LiveBody>,
): SimulationState {
  const objects: Record<ObjectId, ObjectState> = {};
  for (const body of bodies) {
    objects[body.id] = Object.freeze({
      position: Object.freeze({ x: body.position.x, y: body.position.y }),
      angle: body.angle,
    });
  }
  return Object.freeze({ step, timeMs, objects: Object.freeze(objects) });
}
