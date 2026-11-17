import { describe, expect, it } from "vitest";
import { PhysicsEngine } from "./PhysicsEngine";
import { recordRun } from "./SimulationRunner";
import type {
  SimulationRequest,
  SimulationRunner,
  SteppableWorld,
} from "./SimulationRunner";
import type { SimulationState } from "./SimulationState";

const request: SimulationRequest = {
  bodies: [
    {
      id: "ball",
      shape: { kind: "circle", radius: 10 },
      position: { x: 0, y: 0 },
    },
  ],
  maxSteps: 3,
};

/** Records what it was asked to run and hands back a canned result. */
class RecordingRunner implements SimulationRunner {
  readonly requests: SimulationRequest[] = [];
  private readonly result: SimulationState[];
  constructor(result: SimulationState[]) {
    this.result = result;
  }
  run(req: SimulationRequest): SimulationState[] {
    this.requests.push(req);
    return this.result;
  }
}

/**
 * A runner built on recordRun whose world mutates one body in place, the way
 * matter-js does. Lets us test PhysicsEngine end to end without matter-js.
 */
const inPlaceRunner: SimulationRunner = {
  run: (req) => {
    const body = { id: "ball", position: { x: 0, y: 0 }, angle: 0 };
    const world: SteppableWorld = {
      step: () => {
        body.position.x += 1;
      },
      liveBodies: () => [body],
    };
    return recordRun(world, { stepMs: 10, maxSteps: req.maxSteps });
  },
};

describe("PhysicsEngine.simulate", () => {
  it("hands the request to the runner unchanged, exactly once", () => {
    const runner = new RecordingRunner([]);
    PhysicsEngine.simulate(runner, request);
    expect(runner.requests).toHaveLength(1);
    expect(runner.requests[0]).toBe(request);
  });

  it("returns exactly what the runner produced", () => {
    const frames: SimulationState[] = [{ step: 0, timeMs: 0, objects: {} }];
    expect(PhysicsEngine.simulate(new RecordingRunner(frames), request)).toBe(
      frames,
    );
  });

  it("lets runner errors reach the caller", () => {
    const failing: SimulationRunner = {
      run: () => {
        throw new Error("boom");
      },
    };
    expect(() => PhysicsEngine.simulate(failing, request)).toThrow(/boom/);
  });

  it("returns a SimulationState[] whose steps hold independent values", () => {
    const states = PhysicsEngine.simulate(inPlaceRunner, request);
    expect(states.map((s) => s.objects["ball"]?.position.x)).toEqual([
      0, 1, 2, 3,
    ]);
    expect(states[0]?.objects["ball"]).not.toBe(states[1]?.objects["ball"]);
  });

  it("is a static method only: instances do not pretend to have run()", () => {
    // Guards against re-merging a PhysicsEngine interface into the class, which
    // type-checks but throws "run is not a function" at runtime.
    expect((new PhysicsEngine() as unknown as { run?: unknown }).run).toBe(
      undefined,
    );
  });
});
