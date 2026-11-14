import { describe, expect, it } from "vitest";
import { recordRun } from "./SimulationRunner";
import type { SteppableWorld } from "./SimulationRunner";
import type { SimulationState } from "./SimulationState";

/**
 * Mimics matter-js: ONE body object whose position is mutated in place on
 * every step. If snapshots kept references, every frame would show the last state.
 */
class InPlaceWorld implements SteppableWorld {
  private readonly body = { id: "ball", position: { x: 0, y: 0 }, angle: 0 };
  step(): void {
    this.body.position.x += 1;
    this.body.position.y += 2;
    this.body.angle += 0.5;
  }
  liveBodies() {
    return [this.body];
  }
}

const xs = (states: SimulationState[]) =>
  states.map((s) => s.objects["ball"]?.position.x);

describe("recordRun", () => {
  it("earlier steps keep their values after later steps run", () => {
    const states = recordRun(new InPlaceWorld(), { stepMs: 10, maxSteps: 3 });
    expect(xs(states)).toEqual([0, 1, 2, 3]);
    expect(states.map((s) => s.objects["ball"]?.angle)).toEqual([
      0, 0.5, 1, 1.5,
    ]);
  });

  it("records the initial layout as step 0 and numbers steps and time", () => {
    const states = recordRun(new InPlaceWorld(), { stepMs: 10, maxSteps: 2 });
    expect(states.map((s) => [s.step, s.timeMs])).toEqual([
      [0, 0],
      [1, 10],
      [2, 20],
    ]);
  });

  it("gives every step its own objects, not shared references", () => {
    const [a, b] = recordRun(new InPlaceWorld(), { stepMs: 10, maxSteps: 1 });
    expect(a?.objects["ball"]).not.toBe(b?.objects["ball"]);
    expect(a?.objects["ball"]?.position).not.toBe(b?.objects["ball"]?.position);
  });

  it("freezes snapshots so nobody can edit history by accident", () => {
    const [first] = recordRun(new InPlaceWorld(), { stepMs: 10, maxSteps: 1 });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first?.objects)).toBe(true);
    expect(Object.isFrozen(first?.objects["ball"]?.position)).toBe(true);
    expect(() => {
      (first?.objects["ball"]?.position as { x: number }).x = 99;
    }).toThrow(TypeError);
  });

  it("stops early, keeping the frame that satisfied isFinished", () => {
    const states = recordRun(new InPlaceWorld(), {
      stepMs: 10,
      maxSteps: 100,
      isFinished: (s) => (s.objects["ball"]?.position.x ?? 0) >= 3,
    });
    expect(xs(states)).toEqual([0, 1, 2, 3]);
  });

  it.each([NaN, Infinity, -Infinity])("rejects a stepMs of %s", (stepMs) => {
    expect(() =>
      recordRun(new InPlaceWorld(), { stepMs, maxSteps: 1 }),
    ).toThrow(/stepMs must be a finite number > 0/);
  });

  it("rejects nonsense options", () => {
    expect(() =>
      recordRun(new InPlaceWorld(), { stepMs: 0, maxSteps: 1 }),
    ).toThrow(RangeError);
    expect(() =>
      recordRun(new InPlaceWorld(), { stepMs: 10, maxSteps: -1 }),
    ).toThrow(RangeError);
    expect(() =>
      recordRun(new InPlaceWorld(), { stepMs: 10, maxSteps: 1.5 }),
    ).toThrow(RangeError);
  });
});
