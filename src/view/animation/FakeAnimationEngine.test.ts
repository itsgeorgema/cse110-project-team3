import { describe, expect, it, vi } from "vitest";
import { snapshotState } from "../../model/SimulationState";
import type { SimulationState } from "../../model/SimulationState";
import type { AnimationEngine } from "./AnimationEngine";
import { FakeAnimationEngine } from "./FakeAnimationEngine";

const frames: SimulationState[] = [0, 1].map((step) =>
  snapshotState(step, step * 16, [
    { id: "ball", position: { x: step, y: 0 }, angle: 0 },
  ]),
);

function setup() {
  const engine: FakeAnimationEngine = new FakeAnimationEngine();
  const finished = vi.fn();
  const unsubscribe = engine.onPlaybackFinished(finished);
  return { engine, finished, unsubscribe };
}

describe("FakeAnimationEngine", () => {
  it("can be used wherever an AnimationEngine is expected", () => {
    const engine: AnimationEngine = new FakeAnimationEngine();
    expect(typeof engine.onPlaybackFinished).toBe("function");
  });

  it("finishes right away and fires playbackFinished once per play()", () => {
    const { engine, finished } = setup();

    engine.play(frames);
    expect(finished).toHaveBeenCalledTimes(1);
    expect(engine.played).toEqual([frames]);

    engine.play(frames);
    expect(finished).toHaveBeenCalledTimes(2);
  });

  it("stays silent on stop()", () => {
    const { engine, finished } = setup();

    engine.stop();
    engine.play(frames);
    engine.stop();

    expect(finished).toHaveBeenCalledTimes(1);
    expect(engine.stopCount).toBe(2);
  });

  it("replays the last frames, and does nothing before the first play()", () => {
    const { engine, finished } = setup();

    engine.replay();
    expect(finished).not.toHaveBeenCalled();
    expect(engine.played).toEqual([]);

    engine.play(frames);
    engine.replay();
    expect(finished).toHaveBeenCalledTimes(2);
    expect(engine.played).toEqual([frames, frames]);
  });

  it("stops notifying after unsubscribe", () => {
    const { engine, finished, unsubscribe } = setup();

    unsubscribe();
    engine.play(frames);

    expect(finished).not.toHaveBeenCalled();
  });
});
