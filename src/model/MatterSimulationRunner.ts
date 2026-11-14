import Matter from "matter-js";
import type { Body as MatterBody } from "matter-js";
import { DEFAULT_STEP_MS, recordRun } from "./SimulationRunner";
import type {
  BodySpec,
  SimulationRequest,
  SimulationRunner,
  SteppableWorld,
} from "./SimulationRunner";
import type { SimulationState } from "./SimulationState";

// matter-js is CommonJS/UMD, so destructure the default import instead of using named imports.
const { Engine, Bodies, Body, Composite } = Matter;

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

    const seen = new Set<string>();
    for (const spec of bodies) {
      if (seen.has(spec.id)) throw new Error(`Duplicate object id: ${spec.id}`);
      seen.add(spec.id);
      validateFrictionAir(spec);
    }

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
