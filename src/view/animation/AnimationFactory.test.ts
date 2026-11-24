import { describe, expect, it } from "vitest";
import type { KonvaStage } from "../KonvaStage.ts";
import { AnimationFactory } from "./AnimationFactory.ts";
import { FakeAnimationEngine } from "./FakeAnimationEngine.ts";

// A real KonvaStage needs a DOM container, which the node test environment
// does not have. The factory only hands the stage on, so a stand-in is enough.
const stage = {} as KonvaStage;

describe("AnimationFactory", () => {
  it("builds the engine registered for a game id and hands it the stage", () => {
    const engine = new FakeAnimationEngine();
    let receivedStage: KonvaStage | undefined;
    const factory = new AnimationFactory({
      demo: (s) => {
        receivedStage = s;
        return engine;
      },
    });

    expect(factory.create("demo", stage)).toBe(engine);
    expect(receivedStage).toBe(stage);
  });

  it("throws for an unknown game id, naming the id", () => {
    const factory = new AnimationFactory({
      demo: () => new FakeAnimationEngine(),
    });

    expect(() => factory.create("pinball", stage)).toThrow(/pinball/);
  });

  it("throws for a name every object inherits, such as constructor", () => {
    const factory = new AnimationFactory({
      demo: () => new FakeAnimationEngine(),
    });

    expect(() => factory.create("constructor", stage)).toThrow(/constructor/);
  });
});

describe("AnimationFactory.has", () => {
  const factory = new AnimationFactory({
    demo: () => new FakeAnimationEngine(),
  });

  it("is true for a registered game and false otherwise", () => {
    expect(factory.has("demo")).toBe(true);
    expect(factory.has("pinball")).toBe(false);
    expect(factory.has("constructor")).toBe(false);
  });
});
