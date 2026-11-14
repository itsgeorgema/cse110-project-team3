import { describe, expect, it } from "vitest";
import { MatterSimulationRunner } from "./MatterSimulationRunner";
import { DEFAULT_STEP_MS } from "./SimulationRunner";
import type { BodySpec, SimulationRequest } from "./SimulationRunner";
import type { SimulationState, Vec2 } from "./SimulationState";

const START: Vec2 = { x: 100, y: 0 };

const ball: BodySpec = {
  id: "ball",
  shape: { kind: "circle", radius: 10 },
  position: START,
};

// Far below the ball, so tests that watch it fall never touch the floor.
const floor: BodySpec = {
  id: "floor",
  shape: { kind: "rect", width: 400, height: 20 },
  position: { x: 100, y: 5000 },
  isStatic: true,
};

const run = (request: SimulationRequest): SimulationState[] =>
  new MatterSimulationRunner().run(request);

/** Positions of one object across every frame. */
function track(states: SimulationState[], id: string): Vec2[] {
  return states.map((state) => {
    const object = state.objects[id];
    if (!object)
      throw new Error(`object "${id}" missing from step ${state.step}`);
    return object.position;
  });
}

const strictlyIncreasing = (values: number[]): boolean =>
  values.every((value, i) => i === 0 || value > (values[i - 1] ?? Infinity));

describe("MatterSimulationRunner", () => {
  describe("recording a run", () => {
    it("returns the initial layout as step 0, then one frame per step", () => {
      const states = run({ bodies: [ball, floor], maxSteps: 20 });
      expect(states).toHaveLength(21);
      expect(states.map((s) => s.step)).toEqual(
        Array.from({ length: 21 }, (_, i) => i),
      );
      expect(states[0]?.timeMs).toBe(0);
      expect(states.at(-1)?.timeMs).toBeCloseTo(20 * DEFAULT_STEP_MS);
    });

    it("returns only the initial layout when maxSteps is 0", () => {
      const states = run({ bodies: [ball], maxSteps: 0 });
      expect(states).toHaveLength(1);
      expect(states[0]?.objects["ball"]?.position.y).toBeCloseTo(START.y);
    });

    it("uses a caller-supplied stepMs for the timeline", () => {
      const states = run({ bodies: [ball], maxSteps: 3, stepMs: 10 });
      expect(states.map((s) => s.timeMs)).toEqual([0, 10, 20, 30]);
    });

    it("stops early once isFinished returns true, keeping that frame", () => {
      const states = run({
        bodies: [ball],
        maxSteps: 100,
        isFinished: (s) => s.step >= 2,
      });
      expect(states).toHaveLength(3);
      expect(states.at(-1)?.step).toBe(2);
    });

    it("records every body in every frame", () => {
      const states = run({ bodies: [ball, floor], maxSteps: 5 });
      for (const state of states) {
        expect(Object.keys(state.objects).sort()).toEqual(["ball", "floor"]);
      }
    });

    it("is repeatable: the same request gives the same frames", () => {
      const request: SimulationRequest = {
        bodies: [ball, floor],
        maxSteps: 20,
      };
      const engine = new MatterSimulationRunner();
      expect(engine.run(request)).toEqual(engine.run(request));
    });
  });

  describe("frames are independent copies", () => {
    it("keeps step 0 at the starting position after the run has finished", () => {
      const states = run({ bodies: [ball, floor], maxSteps: 20 });
      const first = states[0]?.objects["ball"]?.position;
      const last = states.at(-1)?.objects["ball"]?.position;
      expect(first?.y).toBeCloseTo(START.y);
      expect(last?.y).toBeGreaterThan(START.y + 1);
    });

    it("gives each frame its own frozen objects", () => {
      const [a, b] = run({ bodies: [ball], maxSteps: 1 });
      expect(a?.objects["ball"]).not.toBe(b?.objects["ball"]);
      expect(a?.objects["ball"]?.position).not.toBe(
        b?.objects["ball"]?.position,
      );
      expect(Object.isFrozen(a)).toBe(true);
      expect(Object.isFrozen(a?.objects["ball"]?.position)).toBe(true);
    });
  });

  describe("gravity", () => {
    it("pulls bodies down by default", () => {
      const ys = track(
        run({ bodies: [ball, floor], maxSteps: 20 }),
        "ball",
      ).map((p) => p.y);
      expect(strictlyIncreasing(ys)).toBe(true);
      expect(
        track(run({ bodies: [ball], maxSteps: 20 }), "ball").at(-1)?.x,
      ).toBeCloseTo(START.x);
    });

    it("lets a request switch gravity off", () => {
      const positions = track(
        run({ bodies: [ball], gravity: { x: 0, y: 0 }, maxSteps: 10 }),
        "ball",
      );
      for (const p of positions) {
        expect(p.x).toBeCloseTo(START.x);
        expect(p.y).toBeCloseTo(START.y);
      }
    });

    it("lets a request change gravity direction", () => {
      const positions = track(
        run({ bodies: [ball], gravity: { x: 1, y: 0 }, maxSteps: 10 }),
        "ball",
      );
      expect(strictlyIncreasing(positions.map((p) => p.x))).toBe(true);
      expect(positions.at(-1)?.y).toBeCloseTo(START.y);
    });
  });

  describe("body options", () => {
    it("launches a body with its initial velocity", () => {
      const moving: BodySpec = { ...ball, velocity: { x: 5, y: 0 } };
      const positions = track(
        run({ bodies: [moving], gravity: { x: 0, y: 0 }, maxSteps: 10 }),
        "ball",
      );
      expect(strictlyIncreasing(positions.map((p) => p.x))).toBe(true);
      expect(positions.at(-1)?.x).toBeGreaterThan(START.x + 10);
      expect(positions.at(-1)?.y).toBeCloseTo(START.y);
    });

    it("leaves a body at rest when no velocity is given", () => {
      const positions = track(
        run({ bodies: [ball], gravity: { x: 0, y: 0 }, maxSteps: 10 }),
        "ball",
      );
      expect(positions.at(-1)?.x).toBeCloseTo(START.x);
    });

    it("keeps static bodies fixed while dynamic ones move", () => {
      const states = run({ bodies: [ball, floor], maxSteps: 20 });
      for (const p of track(states, "floor"))
        expect(p).toEqual({ x: 100, y: 5000 });
      expect(states.at(-1)?.objects["ball"]?.position.y).toBeGreaterThan(
        START.y,
      );
    });

    it("treats isStatic: false the same as leaving it out", () => {
      const explicit: BodySpec = { ...ball, isStatic: false };
      expect(run({ bodies: [explicit], maxSteps: 10 })).toEqual(
        run({ bodies: [ball], maxSteps: 10 }),
      );
    });

    describe("frictionAir", () => {
      const coast = (frictionAir?: number): Vec2[] => {
        const spec: BodySpec = {
          ...ball,
          velocity: { x: 5, y: 0 },
          ...(frictionAir === undefined ? {} : { frictionAir }),
        };
        return track(
          run({ bodies: [spec], gravity: { x: 0, y: 0 }, maxSteps: 20 }),
          "ball",
        );
      };
      const distance = (positions: Vec2[]): number =>
        (positions.at(-1)?.x ?? NaN) - START.x;

      it("keeps a constant speed when frictionAir is 0", () => {
        const xs = coast(0).map((p) => p.x);
        const gaps = xs.slice(1).map((x, i) => x - (xs[i] ?? NaN));
        for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0] ?? NaN);
      });

      it("slows a body more as frictionAir increases", () => {
        const none = distance(coast(0));
        const some = distance(coast(0.05));
        const lots = distance(coast(0.3));
        expect(none).toBeGreaterThan(some);
        expect(some).toBeGreaterThan(lots);
        expect(lots).toBeGreaterThan(0);
      });

      it("stops a body after one step when frictionAir is 1", () => {
        const xs = coast(1).map((p) => p.x);
        for (const x of xs.slice(2)) expect(x).toBeCloseTo(xs[1] ?? NaN);
      });

      it("uses the matter-js default of 0.01 when omitted", () => {
        expect(coast()).toEqual(coast(0.01));
        expect(coast()).not.toEqual(coast(0));
      });
    });

    it("builds both circle and rectangle bodies", () => {
      const box: BodySpec = {
        id: "box",
        shape: { kind: "rect", width: 20, height: 20 },
        position: { x: 50, y: 0 },
      };
      const states = run({ bodies: [ball, box], maxSteps: 5 });
      expect(track(states, "ball").at(-1)?.y).toBeGreaterThan(START.y);
      expect(track(states, "box").at(-1)?.y).toBeGreaterThan(0);
    });
  });

  describe("validation", () => {
    it("rejects duplicate object ids before running", () => {
      expect(() => run({ bodies: [ball, ball], maxSteps: 1 })).toThrow(
        /Duplicate object id: ball/,
      );
    });

    it("rejects invalid run options", () => {
      expect(() => run({ bodies: [ball], maxSteps: 1, stepMs: 0 })).toThrow(
        RangeError,
      );
      expect(() => run({ bodies: [ball], maxSteps: -1 })).toThrow(RangeError);
    });

    it.each([-0.1, 1.5, NaN, Infinity])(
      "rejects frictionAir of %s before running",
      (frictionAir) => {
        expect(() =>
          run({ bodies: [{ ...ball, frictionAir }], maxSteps: 1 }),
        ).toThrow(/frictionAir for ball must be between 0 and 1/);
      },
    );

    it.each([0, 1])("accepts the boundary frictionAir of %s", (frictionAir) => {
      expect(() =>
        run({ bodies: [{ ...ball, frictionAir }], maxSteps: 1 }),
      ).not.toThrow();
    });
  });
});
