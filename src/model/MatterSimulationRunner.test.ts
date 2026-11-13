import { describe, expect, it } from "vitest";
import { MatterSimulationRunner } from "./MatterSimulationRunner";
import type { SimulationRequest } from "./SimulationRunner";

const drop: SimulationRequest = {
  bodies: [
    {
      id: "ball",
      shape: { kind: "circle", radius: 10 },
      position: { x: 100, y: 0 },
    },
    {
      id: "floor",
      shape: { kind: "rect", width: 400, height: 20 },
      position: { x: 100, y: 500 },
      isStatic: true,
    },
  ],
  maxSteps: 60,
};

describe("MatterSimulationRunner", () => {
  it("returns one independent frame per step, starting from the initial layout", () => {
    const states = new MatterSimulationRunner().run(drop);
    expect(states).toHaveLength(61);
    expect(states[0]?.objects["ball"]?.position.y).toBeCloseTo(0);

    const ys = states.map((s) => s.objects["ball"]?.position.y ?? NaN);
    for (let i = 1; i < ys.length; i++)
      expect(ys[i]).toBeGreaterThan(ys[i - 1] as number);
  });

  it("is repeatable: same request, same frames", () => {
    const engine = new MatterSimulationRunner();
    expect(engine.run(drop)).toEqual(engine.run(drop));
  });

  it("keeps static bodies where they were put", () => {
    const states = new MatterSimulationRunner().run(drop);
    expect(states.at(-1)?.objects["floor"]?.position).toEqual({
      x: 100,
      y: 500,
    });
  });

  it("rejects duplicate object ids", () => {
    const dup: SimulationRequest = {
      ...drop,
      bodies: [...drop.bodies, ...drop.bodies],
    };
    expect(() => new MatterSimulationRunner().run(dup)).toThrow(
      /Duplicate object id/,
    );
  });
});
