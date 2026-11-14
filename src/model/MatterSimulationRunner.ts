import Matter from "matter-js";
import type { Body as MatterBody } from "matter-js";
import { DEFAULT_STEP_MS, recordRun } from "./SimulationRunner";
import type {
  BodySpec,
  SimulationRequest,
  SimulationRunner,
  SteppableWorld,
} from "./SimulationRunner";
import type { SimulationState, Vec2 } from "./SimulationState";

// matter-js is CommonJS/UMD, so destructure the default import instead of using named imports.
const { Engine, Bodies, Body, Composite } = Matter;

/**
 * Largest stepMs matter-js handles cleanly (its Engine._deltaMax). Above it,
 * matter-js warns, and frictionAir can flip a body's velocity each step.
 */
export const MAX_STEP_MS = 1000 / 60;

/** The only file in the project that imports matter-js. */
export class MatterSimulationRunner implements SimulationRunner {
  run(request: SimulationRequest): SimulationState[] {
    const {
      bodies,
      gravity,
      stepMs = DEFAULT_STEP_MS,
      maxSteps,
      isFinished,
    } = request;

    validateStepMs(stepMs);
    validateRequest(request);

    const engine = Engine.create();
    if (gravity) {
      engine.gravity.x = gravity.x;
      engine.gravity.y = gravity.y;
    }
    const matterBodies = bodies.map(toMatterBody);
    Composite.add(engine.world, matterBodies);

    const world: SteppableWorld = {
      step: (dtMs) => {
        Engine.update(engine, dtMs);
      },
      *liveBodies() {
        // Pass live references; snapshotState copies the numbers out immediately.
        for (const body of matterBodies) {
          yield { id: body.label, position: body.position, angle: body.angle };
        }
      },
    };

    return recordRun(world, { stepMs, maxSteps, isFinished });
  }
}

/**
 * Rejects a bad request before anything is built. matter-js does not check its
 * inputs, so a NaN or a zero-sized shape would otherwise turn into NaN frames.
 */
function validateRequest(request: SimulationRequest): void {
  if (request.gravity) validateVec2(request.gravity, "gravity");

  const seen = new Set<string>();
  for (const spec of request.bodies) {
    if (seen.has(spec.id)) throw new Error(`Duplicate object id: ${spec.id}`);
    seen.add(spec.id);

    validateVec2(spec.position, `position of ${spec.id}`);
    if (spec.velocity) validateVec2(spec.velocity, `velocity of ${spec.id}`);
    validateShape(spec);
    validateFrictionAir(spec);
  }
}

function validateStepMs(stepMs: number): void {
  if (!(stepMs > 0 && stepMs <= MAX_STEP_MS)) {
    throw new RangeError(
      `stepMs must be > 0 and at most ${MAX_STEP_MS.toFixed(3)} for matter-js, got ${stepMs}`,
    );
  }
}

function validateVec2(vec: Vec2, name: string): void {
  if (!Number.isFinite(vec.x) || !Number.isFinite(vec.y)) {
    throw new RangeError(
      `${name} must have finite x and y, got (${vec.x}, ${vec.y})`,
    );
  }
}

function validatePositiveSize(value: number, name: string): void {
  if (!(Number.isFinite(value) && value > 0)) {
    throw new RangeError(`${name} must be a finite number > 0, got ${value}`);
  }
}

function validateShape(spec: BodySpec): void {
  const { shape } = spec;
  if (shape.kind === "circle") {
    validatePositiveSize(shape.radius, `radius of ${spec.id}`);
  } else {
    validatePositiveSize(shape.width, `width of ${spec.id}`);
    validatePositiveSize(shape.height, `height of ${spec.id}`);
  }
}

function validateFrictionAir(spec: BodySpec): void {
  const { frictionAir } = spec;
  if (frictionAir === undefined) return;
  if (!(frictionAir >= 0 && frictionAir <= 1)) {
    throw new RangeError(
      `frictionAir for ${spec.id} must be between 0 and 1, got ${frictionAir}`,
    );
  }
}

function toMatterBody(spec: BodySpec): MatterBody {
  const { x, y } = spec.position;
  const options: Matter.IChamferableBodyDefinition = {
    label: spec.id,
    isStatic: spec.isStatic ?? false,
  };
  // Only set it when given, so matter-js keeps its own default otherwise.
  if (spec.frictionAir !== undefined) options.frictionAir = spec.frictionAir;
  const body =
    spec.shape.kind === "circle"
      ? Bodies.circle(x, y, spec.shape.radius, options)
      : Bodies.rectangle(x, y, spec.shape.width, spec.shape.height, options);
  if (spec.velocity)
    Body.setVelocity(body, { x: spec.velocity.x, y: spec.velocity.y });
  return body;
}
