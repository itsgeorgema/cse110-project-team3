import Matter from 'matter-js';
import type { Body as MatterBody } from 'matter-js';
import { DEFAULT_STEP_MS, recordRun } from './SimulationRunner';
import type { BodySpec, SimulationRequest, SimulationRunner, SteppableWorld } from './SimulationRunner';
import type { SimulationState } from './SimulationState';

// matter-js is CommonJS/UMD, so destructure the default import instead of using named imports.
const { Engine, Bodies, Body, Composite } = Matter;

/** The only file in the project that imports matter-js. */
export class MatterSimulationRunner implements SimulationRunner {
  run(request: SimulationRequest): SimulationState[] {
    const { bodies, gravity, stepMs = DEFAULT_STEP_MS, maxSteps, isFinished } = request;

    const seen = new Set<string>();
    for (const spec of bodies) {
      if (seen.has(spec.id)) throw new Error(`Duplicate object id: ${spec.id}`);
      seen.add(spec.id);
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

function toMatterBody(spec: BodySpec): MatterBody {
  const { x, y } = spec.position;
  const options = { label: spec.id, isStatic: spec.isStatic ?? false };
  const body =
    spec.shape.kind === 'circle'
      ? Bodies.circle(x, y, spec.shape.radius, options)
      : Bodies.rectangle(x, y, spec.shape.width, spec.shape.height, options);
  if (spec.velocity) Body.setVelocity(body, { x: spec.velocity.x, y: spec.velocity.y });
  return body;
}